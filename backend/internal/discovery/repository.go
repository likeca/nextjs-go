package discovery

import (
	"context"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// itemSources is the fixed read order for the combined "all" list; it mirrors
// Django discovery.views.ITEM_SOURCES (things_to_do first).
var itemSources = []struct{ typ, table string }{
	{"things_to_do", "discovery_thing_to_do"},
	{"events", "discovery_event"},
	{"promos", "discovery_promo"},
	{"news", "discovery_news"},
}

// Store is the data access the discovery handlers depend on.
type Store interface {
	Items(ctx context.Context, city, typ string) ([]Item, error)
}

type Repository struct {
	pool      *pgxpool.Pool
	mediaPath string
}

func NewRepository(pool *pgxpool.Pool, mediaPath string) *Repository {
	return &Repository{pool: pool, mediaPath: mediaPath}
}

func (r *Repository) Items(ctx context.Context, city, typ string) ([]Item, error) {
	items := make([]Item, 0)
	for _, src := range itemSources {
		if typ != "" && typ != "all" && typ != src.typ {
			continue
		}
		found, err := r.queryTable(ctx, src.table, src.typ, city)
		if err != nil {
			return nil, err
		}
		items = append(items, found...)
	}
	return items, nil
}

type itemRow struct {
	ID             string     `db:"id"`
	City           string     `db:"city"`
	Name           string     `db:"name"`
	Detail         string     `db:"detail"`
	Meta           string     `db:"meta"`
	Icon           string     `db:"icon"`
	Lat            float64    `db:"lat"`
	Lng            float64    `db:"lng"`
	Image          *string    `db:"image"`
	ValidStartDate *time.Time `db:"valid_start_date"`
	ValidEndDate   *time.Time `db:"valid_end_date"`
}

func (r *Repository) queryTable(ctx context.Context, table, typ, city string) ([]Item, error) {
	// table is a fixed constant (not user input), so interpolation is safe.
	q := `SELECT id, city, name, detail, meta, icon, image,
	             valid_start_date, valid_end_date, lat, lng
	      FROM ` + table + `
	      WHERE ($1 = '' OR LOWER(city) = LOWER($1))
	      ORDER BY sort_order, created_at`
	rows, err := r.pool.Query(ctx, q, city)
	if err != nil {
		return nil, err
	}
	raw, err := pgx.CollectRows(rows, pgx.RowToStructByName[itemRow])
	if err != nil {
		return nil, err
	}

	items := make([]Item, 0, len(raw))
	for _, rr := range raw {
		items = append(items, rr.toItem(typ, r.mediaPath))
	}
	return items, nil
}

func (rr itemRow) toItem(typ, mediaPath string) Item {
	return Item{
		ID:             rr.ID,
		Type:           typ,
		City:           rr.City,
		Name:           rr.Name,
		Detail:         rr.Detail,
		Meta:           rr.Meta,
		Icon:           rr.Icon,
		Lat:            rr.Lat,
		Lng:            rr.Lng,
		ImageURL:       mediaURL(rr.Image, mediaPath),
		ValidStartDate: dateString(rr.ValidStartDate),
		ValidEndDate:   dateString(rr.ValidEndDate),
	}
}

// mediaURL emits the /media/<name> path the frontend's mediaUrl() helper
// rebases onto the public host. Normalizes a storage key that already carries
// the "media/" prefix (Cloudflare R2) so both storage modes agree.
func mediaURL(path *string, mediaPath string) *string {
	if path == nil || *path == "" {
		return nil
	}
	p := strings.TrimPrefix(*path, "media/")
	u := mediaPath + p
	return &u
}

func dateString(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := t.Format("2006-01-02")
	return &s
}
