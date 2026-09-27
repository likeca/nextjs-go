package accounts

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/likeca/lhchub/go/internal/auth"
	"github.com/likeca/lhchub/go/internal/idgen"
)

// EnsureAdminInput configures the bootstrap admin user (mirrors Django's
// `seed_rbac --admin-email --admin-password`).
type EnsureAdminInput struct {
	Email    string
	Password string
	Name     string
}

// EnsureAdmin creates or updates the bootstrap admin user and assigns the
// "Super Admin" role — the role the 000002 migration seeds and that
// HasResourcePermission treats as full access. It re-hashes the password on
// every run, so it doubles as the admin password-rotation tool. It returns
// whether the user was newly created.
func (r *Repository) EnsureAdmin(ctx context.Context, in EnsureAdminInput) (bool, error) {
	hash, err := auth.HashPassword(in.Password)
	if err != nil {
		return false, err
	}

	var roleID string
	if err := r.pool.QueryRow(ctx, `SELECT id::text FROM "role" WHERE name = 'Super Admin'`).Scan(&roleID); err != nil {
		return false, fmt.Errorf(`"Super Admin" role not found — run migrations first: %w`, err)
	}

	var id string
	err = r.pool.QueryRow(ctx, `SELECT id::text FROM "user" WHERE LOWER(email) = LOWER($1)`, in.Email).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		now := time.Now()
		_, err := r.pool.Exec(ctx,
			`INSERT INTO "user"
				(id, name, email, email_verified, is_admin, role_id, is_superuser, is_staff, password, created_at, updated_at)
			 VALUES ($1, $2, $3, true, true, $4, true, true, $5, $6, $6)`,
			idgen.NewUUID(), in.Name, in.Email, roleID, hash, now)
		return true, err
	}
	if err != nil {
		return false, err
	}

	_, err = r.pool.Exec(ctx,
		`UPDATE "user"
		 SET name = $2, email_verified = true, is_admin = true, role_id = $3,
		     is_superuser = true, is_staff = true, password = $4, updated_at = $5
		 WHERE id = $1`,
		id, in.Name, roleID, hash, time.Now())
	if err != nil {
		return false, err
	}
	return false, nil
}
