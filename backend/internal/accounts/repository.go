// Package accounts mirrors the Django accounts app (users, roles, permissions).
package accounts

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/likeca/lhchub/go/internal/auth"
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository { return &Repository{pool: pool} }

// PrincipalByID loads the auth principal for a user id (implements auth.Store).
func (r *Repository) PrincipalByID(ctx context.Context, id string) (*auth.Principal, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT u.id, u.email, u.name, u.is_admin, u.is_superuser, u.role_id, COALESCE(r.name, '') AS role_name
		FROM "user" u
		LEFT JOIN role r ON r.id = u.role_id
		WHERE u.id = $1`, id)
	if err != nil {
		return nil, err
	}
	type principalRow struct {
		UserID      string  `db:"id"`
		Email       string  `db:"email"`
		Name        string  `db:"name"`
		IsAdmin     bool    `db:"is_admin"`
		IsSuperuser bool    `db:"is_superuser"`
		RoleID      *string `db:"role_id"`
		RoleName    string  `db:"role_name"`
	}
	rows2, err := pgx.CollectRows(rows, pgx.RowToStructByName[principalRow])
	if err != nil {
		return nil, err
	}
	if len(rows2) == 0 {
		return nil, auth.ErrUnauthenticated
	}
	pr := rows2[0]
	p := &auth.Principal{
		UserID:      pr.UserID,
		Email:       pr.Email,
		Name:        pr.Name,
		IsAdmin:     pr.IsAdmin,
		IsSuperuser: pr.IsSuperuser,
		RoleName:    pr.RoleName,
	}
	if pr.RoleID != nil {
		p.RoleID = *pr.RoleID
	}
	return p, nil
}

// HasResourcePermission mirrors accounts.permissions.user_has_permission:
// superusers and "Super Admin" bypass; otherwise the user must be an admin
// whose role carries the explicit (resource, action) permission.
func (r *Repository) HasResourcePermission(ctx context.Context, p *auth.Principal, resource, action string) (bool, error) {
	if p == nil {
		return false, nil
	}
	if p.IsSuperuser {
		return true, nil
	}
	if p.IsAdmin && p.RoleName == "Super Admin" {
		return true, nil
	}
	if !p.IsAdmin || p.RoleID == "" {
		return false, nil
	}
	var exists bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM role_permission rp
			JOIN permission perm ON perm.id = rp.permission_id
			WHERE rp.role_id = $1 AND perm.resource = $2 AND perm.action = $3
		)`, p.RoleID, resource, action).Scan(&exists)
	return exists, err
}
