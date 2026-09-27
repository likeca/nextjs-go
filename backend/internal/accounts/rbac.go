package accounts

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/likeca/lhchub/go/internal/idgen"
)

const roleCols = `id::text, name, description, is_system, created_at, updated_at`
const permCols = `id::text, name, description, resource, action, created_at, updated_at`

type roleRow struct {
	ID          string    `db:"id"`
	Name        string    `db:"name"`
	Description *string   `db:"description"`
	IsSystem    bool      `db:"is_system"`
	CreatedAt   time.Time `db:"created_at"`
	UpdatedAt   time.Time `db:"updated_at"`
}

// ListRoles returns all roles (with nested permissions) ordered by name.
func (r *Repository) ListRoles(ctx context.Context) ([]Role, error) {
	rows, err := r.pool.Query(ctx, `SELECT `+roleCols+` FROM role ORDER BY name`)
	if err != nil {
		return nil, err
	}
	roles, err := pgx.CollectRows(rows, pgx.RowToStructByName[roleRow])
	if err != nil {
		return nil, err
	}
	return r.attachRolePermissions(ctx, roles)
}

// RoleByID returns a single role with its nested permissions.
func (r *Repository) RoleByID(ctx context.Context, id string) (*Role, error) {
	rows, err := r.pool.Query(ctx, `SELECT `+roleCols+` FROM role WHERE id = $1`, id)
	if err != nil {
		return nil, err
	}
	roles, err := pgx.CollectRows(rows, pgx.RowToStructByName[roleRow])
	if err != nil {
		return nil, err
	}
	if len(roles) == 0 {
		return nil, pgx.ErrNoRows
	}
	out, err := r.attachRolePermissions(ctx, roles)
	if err != nil {
		return nil, err
	}
	return &out[0], nil
}

func (r *Repository) attachRolePermissions(ctx context.Context, roles []roleRow) ([]Role, error) {
	out := make([]Role, 0, len(roles))
	if len(roles) == 0 {
		return out, nil
	}
	ids := make([]string, len(roles))
	for i, rr := range roles {
		ids[i] = rr.ID
	}

	rows, err := r.pool.Query(ctx,
		`SELECT rp.role_id::text, perm.id::text, perm.name, perm.description, perm.resource, perm.action, perm.created_at, perm.updated_at
		 FROM role_permission rp JOIN permission perm ON perm.id = rp.permission_id
		 WHERE rp.role_id::text = ANY($1::text[])`, ids)
	if err != nil {
		return nil, err
	}

	// permWithRole pairs a permission with its role id so results can be grouped.
	// The permission's columns map by name through the embedded Permission.
	type permWithRole struct {
		RoleID string `db:"role_id"`
		Permission
	}
	pwr, err := pgx.CollectRows(rows, pgx.RowToStructByName[permWithRole])
	if err != nil {
		return nil, err
	}
	byRole := map[string][]Permission{}
	for _, p := range pwr {
		byRole[p.RoleID] = append(byRole[p.RoleID], p.Permission)
	}

	for _, rr := range roles {
		perms := byRole[rr.ID]
		if perms == nil {
			perms = []Permission{}
		}
		refs := make([]RolePermissionRef, 0, len(perms))
		for _, p := range perms {
			refs = append(refs, RolePermissionRef{Permission: p})
		}
		out = append(out, Role{
			ID:              rr.ID,
			Name:            rr.Name,
			Description:     rr.Description,
			IsSystem:        rr.IsSystem,
			Permissions:     perms,
			RolePermissions: refs,
			CreatedAt:       rr.CreatedAt,
			UpdatedAt:       rr.UpdatedAt,
		})
	}
	return out, nil
}

// RoleInput is the create/update role payload.
type RoleInput struct {
	Name           string   `json:"name"`
	Description    *string  `json:"description"`
	PermissionIDs  []string `json:"permissionIds"`
	SyncPermission bool
}

func (r *Repository) CreateRole(ctx context.Context, in RoleInput) (*Role, error) {
	id := idgen.NewUUID()
	now := time.Now()
	_, err := r.pool.Exec(ctx,
		`INSERT INTO role (id, name, description, is_system, created_at, updated_at)
		 VALUES ($1, $2, $3, false, $4, $4)`,
		id, in.Name, in.Description, now)
	if err != nil {
		return nil, err
	}
	if err := r.syncRolePermissions(ctx, id, in.PermissionIDs); err != nil {
		return nil, err
	}
	return r.RoleByID(ctx, id)
}

func (r *Repository) UpdateRole(ctx context.Context, id string, in RoleInput) (*Role, error) {
	_, err := r.pool.Exec(ctx,
		`UPDATE role SET name = $2, description = $3, updated_at = $4 WHERE id = $1`,
		id, in.Name, in.Description, time.Now())
	if err != nil {
		return nil, err
	}
	if in.SyncPermission {
		if err := r.syncRolePermissions(ctx, id, in.PermissionIDs); err != nil {
			return nil, err
		}
	}
	return r.RoleByID(ctx, id)
}

func (r *Repository) syncRolePermissions(ctx context.Context, roleID string, permIDs []string) error {
	if _, err := r.pool.Exec(ctx, `DELETE FROM role_permission WHERE role_id = $1`, roleID); err != nil {
		return err
	}
	for _, pid := range permIDs {
		if _, err := r.pool.Exec(ctx,
			`INSERT INTO role_permission (id, role_id, permission_id, created_at) VALUES ($1, $2, $3, $4)`,
			idgen.NewUUID(), roleID, pid, time.Now()); err != nil {
			return err
		}
	}
	return nil
}

// RoleDeleteGuard returns (isSystem, assignedUserCount) for the delete guard.
func (r *Repository) RoleDeleteGuard(ctx context.Context, id string) (bool, int, error) {
	var isSystem bool
	if err := r.pool.QueryRow(ctx, `SELECT is_system FROM role WHERE id = $1`, id).Scan(&isSystem); err != nil {
		return false, 0, err
	}
	var n int
	if err := r.pool.QueryRow(ctx, `SELECT count(*) FROM "user" WHERE role_id = $1`, id).Scan(&n); err != nil {
		return false, 0, err
	}
	return isSystem, n, nil
}

func (r *Repository) DeleteRole(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM role WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

// ListPermissions returns all permissions ordered by resource, action.
func (r *Repository) ListPermissions(ctx context.Context) ([]Permission, error) {
	rows, err := r.pool.Query(ctx, `SELECT `+permCols+` FROM permission ORDER BY resource, action`)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowToStructByName[Permission])
}

// PermissionByID returns a single permission.
func (r *Repository) PermissionByID(ctx context.Context, id string) (*Permission, error) {
	rows, err := r.pool.Query(ctx, `SELECT `+permCols+` FROM permission WHERE id = $1`, id)
	if err != nil {
		return nil, err
	}
	perms, err := pgx.CollectRows(rows, pgx.RowToStructByName[Permission])
	if err != nil {
		return nil, err
	}
	if len(perms) == 0 {
		return nil, pgx.ErrNoRows
	}
	return &perms[0], nil
}

// PermissionInput is the create/update permission payload.
type PermissionInput struct {
	Name        string  `json:"name"`
	Description *string `json:"description"`
	Resource    string  `json:"resource"`
	Action      string  `json:"action"`
}

func (r *Repository) CreatePermission(ctx context.Context, in PermissionInput) (*Permission, error) {
	id := idgen.NewUUID()
	now := time.Now()
	_, err := r.pool.Exec(ctx,
		`INSERT INTO permission (id, name, description, resource, action, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $6)`,
		id, in.Name, in.Description, in.Resource, in.Action, now)
	if err != nil {
		return nil, err
	}
	return r.PermissionByID(ctx, id)
}

func (r *Repository) UpdatePermission(ctx context.Context, id string, in PermissionInput) (*Permission, error) {
	_, err := r.pool.Exec(ctx,
		`UPDATE permission SET name = $2, description = $3, resource = $4, action = $5, updated_at = $6 WHERE id = $1`,
		id, in.Name, in.Description, in.Resource, in.Action, time.Now())
	if err != nil {
		return nil, err
	}
	return r.PermissionByID(ctx, id)
}

// PermissionAssignments returns how many roles use this permission.
func (r *Repository) PermissionAssignments(ctx context.Context, id string) (int, error) {
	var n int
	err := r.pool.QueryRow(ctx, `SELECT count(*) FROM role_permission WHERE permission_id = $1`, id).Scan(&n)
	return n, err
}

func (r *Repository) DeletePermission(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM permission WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}
