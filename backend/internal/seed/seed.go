// Package seed loads Django-style seed JSON files into Postgres — the Go
// equivalent of `manage.py loaddata`. Seed files are plain arrays of
// {"model": "<app>.<model>", "pk": "<uuid>", "fields": {...}} and are upserted
// by primary key (INSERT ... ON CONFLICT (id) DO UPDATE), so fixed pks update
// in place exactly like Django's `loaddata`.
package seed

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

// modelTable maps a Django "<app>.<model>" label to its Postgres table. This is
// not mechanical: several models declare a custom db_table name (e.g.
// "billing.plan" → plan), and CamelCase class names lowercase differently
// ("newsitem" → discovery_news).
var modelTable = map[string]string{
	"marketplace.category":          "marketplace_category",
	"marketplace.provider":          "marketplace_provider",
	"marketplace.providerreview":    "marketplace_provider_review",
	"marketplace.job":               "marketplace_job",
	"marketplace.jobapplication":    "marketplace_job_application",
	"marketplace.messagethread":     "marketplace_message_thread",
	"marketplace.message":           "marketplace_message",
	"marketplace.wallettransaction": "marketplace_wallet_transaction",
	"discovery.event":               "discovery_event",
	"discovery.newsitem":            "discovery_news",
	"discovery.promotion":           "discovery_promo",
	"discovery.thingtodo":           "discovery_thing_to_do",
	"billing.plan":                  "plan",
}

// Integer-typed columns whose JSON values must be coerced to int64 (Postgres
// will not implicitly cast float8 → int4, so integral JSON numbers arriving as
// float64 would otherwise fail the INSERT).
var intUDTs = map[string]bool{"int2": true, "int4": true, "int8": true}

// Float/decimal columns coerced to float64.
var floatUDTs = map[string]bool{"float4": true, "float8": true, "numeric": true}

// object is one seed record.
type object struct {
	Model  string                     `json:"model"`
	PK     string                     `json:"pk"`
	Fields map[string]json.RawMessage `json:"fields"`
}

// Run seeds every seed file in paths (in order), inside one transaction so
// the whole run is atomic. dryRun rolls the transaction back so nothing is
// committed.
func Run(ctx context.Context, pool *pgxpool.Pool, logger *zap.Logger, paths []string, dryRun bool) error {
	if len(paths) == 0 {
		return errors.New("no seed files")
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	cache := map[string]map[string]string{} // table → column → udt
	total := 0
	for _, path := range paths {
		objs, err := readFile(path)
		if err != nil {
			return fmt.Errorf("%s: %w", path, err)
		}
		for _, obj := range objs {
			table, ok := modelTable[obj.Model]
			if !ok {
				return fmt.Errorf("%s: unknown model %q", path, obj.Model)
			}
			cols, err := columnsFor(ctx, tx, cache, table)
			if err != nil {
				return fmt.Errorf("%s: %w", table, err)
			}
			if err := upsert(ctx, tx, table, cols, obj); err != nil {
				return fmt.Errorf("%s: %s (%s): %w", path, obj.Model, obj.PK, err)
			}
			total++
		}
		logger.Info("seeded", zap.String("file", path), zap.Int("objects", len(objs)))
	}

	if dryRun {
		logger.Info("dry run — rolling back, nothing committed", zap.Int("objects", total))
		return tx.Rollback(ctx)
	}
	logger.Info("committing", zap.Int("objects", total))
	return tx.Commit(ctx)
}

// Collect returns every *.json file under dir, sorted by path.
func Collect(dir string) ([]string, error) {
	var paths []string
	err := filepath.WalkDir(dir, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		if strings.EqualFold(filepath.Ext(p), ".json") {
			paths = append(paths, p)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	sort.Strings(paths)
	return paths, nil
}

func readFile(path string) ([]object, error) {
	b, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var objs []object
	if err := json.Unmarshal(b, &objs); err != nil {
		return nil, err
	}
	return objs, nil
}

// columnsFor loads (and caches) each real column name + its udt for a table,
// read from information_schema. Django ForeignKeys live in a `<name>_id`
// column while seed files reference them by field name (`user`, `provider`), so
// resolve() below uses this map to find the real column.
func columnsFor(ctx context.Context, tx pgx.Tx, cache map[string]map[string]string, table string) (map[string]string, error) {
	if c, ok := cache[table]; ok {
		return c, nil
	}
	rows, err := tx.Query(ctx,
		`SELECT column_name, udt_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
		table,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	m := map[string]string{}
	for rows.Next() {
		var name, udt string
		if err := rows.Scan(&name, &udt); err != nil {
			return nil, err
		}
		m[name] = udt
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	cache[table] = m
	return m, nil
}

// resolve maps a seed field name to its column name and udt. ForeignKey
// fields (user, provider, job, thread, posted_by, plan) serialize under their
// bare name but live in a `<name>_id` column.
func resolve(cols map[string]string, field string) (col, udt string, ok bool) {
	if u, ok := cols[field]; ok {
		return field, u, true
	}
	if u, ok := cols[field+"_id"]; ok {
		return field + "_id", u, true
	}
	return "", "", false
}

func upsert(ctx context.Context, tx pgx.Tx, table string, cols map[string]string, obj object) error {
	type ref struct {
		name string
		val  any
	}
	refs := make([]ref, 0, len(obj.Fields)+1)
	refs = append(refs, ref{name: "id", val: obj.PK})

	names := make([]string, 0, len(obj.Fields))
	for f := range obj.Fields {
		names = append(names, f)
	}
	sort.Strings(names)

	for _, f := range names {
		col, udt, ok := resolve(cols, f)
		if !ok {
			return fmt.Errorf("field %q has no column in %s", f, table)
		}
		v, err := coerce(obj.Fields[f], udt)
		if err != nil {
			return fmt.Errorf("field %q: %w", f, err)
		}
		refs = append(refs, ref{name: col, val: v})
	}

	var colNames, placeholders, sets []string
	args := make([]any, len(refs))
	for i, r := range refs {
		colNames = append(colNames, quoteIdent(r.name))
		placeholders = append(placeholders, fmt.Sprintf("$%d", i+1))
		args[i] = r.val
		if r.name != "id" {
			sets = append(sets, fmt.Sprintf("%s = EXCLUDED.%s", quoteIdent(r.name), quoteIdent(r.name)))
		}
	}

	q := fmt.Sprintf(
		"INSERT INTO %s (%s) VALUES (%s) ON CONFLICT (id) DO UPDATE SET %s",
		quoteIdent(table),
		strings.Join(colNames, ", "),
		strings.Join(placeholders, ", "),
		strings.Join(sets, ", "),
	)
	_, err := tx.Exec(ctx, q, args...)
	return err
}

// coerce turns a raw JSON field value into the Go value pgx can encode for the
// given column udt. Integers, floats and numeric-as-string (rating "4.8") are
// normalized; everything else (varchar/text/uuid/date/timestamptz) is passed
// through as a string and left to Postgres to cast.
func coerce(raw json.RawMessage, udt string) (any, error) {
	if strings.TrimSpace(string(raw)) == "null" {
		return nil, nil
	}
	switch {
	case udt == "bool":
		var b bool
		if err := json.Unmarshal(raw, &b); err != nil {
			return nil, err
		}
		return b, nil
	case strings.HasPrefix(udt, "_"): // Postgres array, e.g. _varchar for features
		var arr []string
		if err := json.Unmarshal(raw, &arr); err != nil {
			return nil, err
		}
		return arr, nil
	case intUDTs[udt]:
		n, err := numeric(raw)
		if err != nil {
			return nil, err
		}
		return n.Int64()
	case floatUDTs[udt]:
		n, err := numeric(raw)
		if err != nil {
			return nil, err
		}
		return n.Float64()
	default:
		if len(raw) > 0 && raw[0] == '"' {
			var s string
			if err := json.Unmarshal(raw, &s); err != nil {
				return nil, err
			}
			return s, nil
		}
		var v any
		if err := json.Unmarshal(raw, &v); err != nil {
			return nil, err
		}
		return v, nil
	}
}

// numeric extracts a json.Number from a raw value that may be either a bare
// number (`94`) or a quoted one (`"4.8"`).
func numeric(raw json.RawMessage) (json.Number, error) {
	s := strings.TrimSpace(string(raw))
	if len(s) == 0 {
		return "", errors.New("empty number")
	}
	if s[0] == '"' {
		var str string
		if err := json.Unmarshal(raw, &str); err != nil {
			return "", err
		}
		return json.Number(str), nil
	}
	return json.Number(s), nil
}

func quoteIdent(s string) string {
	return `"` + strings.ReplaceAll(s, `"`, `""`) + `"`
}
