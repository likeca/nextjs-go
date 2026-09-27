// Package seedimages downloads a photo for every discovery row whose image file
// is missing and stores it (local filesystem or Cloudflare R2), the Go
// equivalent of `manage.py seed_discovery_images`.
package seedimages

import (
	"context"
	"os"
	"path/filepath"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

// R2Config configures the optional Cloudflare R2 upload target. When Bucket is
// empty the command writes to the local mediaRoot.
type R2Config struct {
	Endpoint  string
	Bucket    string
	AccessKey string
	SecretKey string
}

// discoveryTables is the fixed read order (mirrors the Django MODELS tuple).
var discoveryTables = []string{
	"discovery_thing_to_do",
	"discovery_event",
	"discovery_promo",
	"discovery_news",
}

// storage abstracts the write target so the same loop serves local and R2.
type storage interface {
	exists(ctx context.Context, name string) (bool, error)
	put(ctx context.Context, name string, data []byte) error
}

// localStorage writes under root/<name>, mirroring Django FileSystemStorage
// (MEDIA_ROOT + upload_to="discovery/").
type localStorage struct{ root string }

func (s *localStorage) exists(ctx context.Context, name string) (bool, error) {
	_, err := os.Stat(filepath.Join(s.root, trimMedia(name)))
	if err == nil {
		return true, nil
	}
	if os.IsNotExist(err) {
		return false, nil
	}
	return false, err
}

func (s *localStorage) put(ctx context.Context, name string, data []byte) error {
	p := filepath.Join(s.root, trimMedia(name))
	if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
		return err
	}
	return os.WriteFile(p, data, 0o644)
}

// r2Storage writes under the media/ prefix (UploadStorage location="media").
type r2Storage struct{ client *s3Client }

func (s *r2Storage) exists(ctx context.Context, name string) (bool, error) {
	return s.client.headObject(ctx, "media/"+trimMedia(name))
}

func (s *r2Storage) put(ctx context.Context, name string, data []byte) error {
	return s.client.putObject(ctx, "media/"+trimMedia(name), data)
}

// trimMedia strips a leading "media/" storage-key prefix so both storage modes
// agree on the relative name.
func trimMedia(name string) string { return strings.TrimPrefix(name, "media/") }

// Run iterates every discovery row with a non-empty image key, downloading and
// storing missing photos. It is idempotent unless force is true.
func Run(ctx context.Context, pool *pgxpool.Pool, logger *zap.Logger, mediaRoot string, r2 *R2Config, force bool) error {
	var store storage = &localStorage{root: mediaRoot}
	if r2 != nil && r2.Bucket != "" {
		store = &r2Storage{client: newS3Client(r2.Endpoint, r2.Bucket, r2.AccessKey, r2.SecretKey)}
	}

	created, skipped, failed := 0, 0, 0
	for _, table := range discoveryTables {
		// table is a fixed constant, so interpolation is safe.
		rows, err := pool.Query(ctx,
			`SELECT name, image FROM `+table+` WHERE image IS NOT NULL AND image <> ''`)
		if err != nil {
			return err
		}
		type row struct{ name, image string }
		items, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (row, error) {
			var out row
			err := r.Scan(&out.name, &out.image)
			return out, err
		})
		if err != nil {
			return err
		}

		for _, item := range items {
			exists, err := store.exists(ctx, item.image)
			if err != nil {
				logger.Warn("exists check failed", zap.String("image", item.image), zap.Error(err))
				failed++
				continue
			}
			if exists && !force {
				skipped++
				continue
			}
			raw, err := fetchBytes(ctx, photoURL(ctx, item.name))
			if err != nil {
				logger.Warn("download failed", zap.String("name", item.name), zap.Error(err))
				failed++
				continue
			}
			data, err := toCardJPEG(raw)
			if err != nil {
				logger.Warn("encode failed", zap.String("name", item.name), zap.Error(err))
				failed++
				continue
			}
			if err := store.put(ctx, item.image, data); err != nil {
				logger.Warn("store failed", zap.String("image", item.image), zap.Error(err))
				failed++
				continue
			}
			created++
		}
	}

	logger.Info("seed-images complete",
		zap.Int("created", created), zap.Int("skipped", skipped), zap.Int("failed", failed))
	return nil
}
