package accounts

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/likeca/lhchub/go/internal/auth"
	"github.com/likeca/lhchub/go/internal/idgen"
)

const userCols = `u.id::text, u.name, u.email, u.email_verified, u.image, u.phone,
	u.is_admin, u.role_id, COALESCE(r.name, '') AS role_name, u.stripe_customer_id,
	u.two_factor_enabled, u.is_active, u.is_superuser, u.password, u.created_at, u.updated_at`

// userRow is the full user row (joined role name) used for auth + serialization.
type userRow struct {
	ID               string    `db:"id"`
	Name             string    `db:"name"`
	Email            string    `db:"email"`
	EmailVerified    bool      `db:"email_verified"`
	Image            *string   `db:"image"`
	Phone            *string   `db:"phone"`
	IsAdmin          bool      `db:"is_admin"`
	RoleID           *string   `db:"role_id"`
	RoleName         string    `db:"role_name"`
	StripeCustomerID *string   `db:"stripe_customer_id"`
	TwoFactorEnabled bool      `db:"two_factor_enabled"`
	IsActive         bool      `db:"is_active"`
	IsSuperuser      bool      `db:"is_superuser"`
	Password         string    `db:"password"`
	CreatedAt        time.Time `db:"created_at"`
	UpdatedAt        time.Time `db:"updated_at"`
}

// UserByEmail fetches a user (with password hash + role) for authentication.
func (r *Repository) UserByEmail(ctx context.Context, email string) (*userRow, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+userCols+` FROM "user" u LEFT JOIN role r ON r.id = u.role_id
		 WHERE LOWER(u.email) = LOWER($1)`, email)
	if err != nil {
		return nil, err
	}
	users, err := pgx.CollectRows(rows, pgx.RowToStructByName[userRow])
	if err != nil {
		return nil, err
	}
	if len(users) == 0 {
		return nil, pgx.ErrNoRows
	}
	return &users[0], nil
}

// UserByID fetches a full user by UUID.
func (r *Repository) UserByID(ctx context.Context, id string) (*userRow, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+userCols+` FROM "user" u LEFT JOIN role r ON r.id = u.role_id
		 WHERE u.id = $1`, id)
	if err != nil {
		return nil, err
	}
	users, err := pgx.CollectRows(rows, pgx.RowToStructByName[userRow])
	if err != nil {
		return nil, err
	}
	if len(users) == 0 {
		return nil, pgx.ErrNoRows
	}
	return &users[0], nil
}

func (u *userRow) dto() User {
	out := User{
		ID:               u.ID,
		Name:             u.Name,
		Email:            u.Email,
		EmailVerified:    u.EmailVerified,
		Image:            u.Image,
		Phone:            u.Phone,
		IsAdmin:          u.IsAdmin,
		RoleID:           u.RoleID,
		StripeCustomerID: u.StripeCustomerID,
		TwoFactorEnabled: u.TwoFactorEnabled,
		CreatedAt:        u.CreatedAt,
		UpdatedAt:        u.UpdatedAt,
	}
	if u.RoleID != nil {
		out.Role = &RoleSummary{ID: *u.RoleID, Name: u.RoleName}
	}
	return out
}

const usersPageSize = 10

// UserFilter holds the query params the admin user list supports.
type UserFilter struct {
	Search        string
	EmailVerified string // "", "verified"/"true", "all"
	IsAdmin       string // "", "true", "false", "all"
	Role          string // role id or "all"
	Page          int
}

// ListUsers returns the total count and the paginated page of users.
func (r *Repository) ListUsers(ctx context.Context, f UserFilter) (int, []User, error) {
	where, args := buildUserWhere(f)

	var count int
	if err := r.pool.QueryRow(ctx, `SELECT count(*) FROM "user" u `+where, args...).Scan(&count); err != nil {
		return 0, nil, err
	}

	offset := (f.Page - 1) * usersPageSize
	if offset < 0 {
		offset = 0
	}
	args = append(args, usersPageSize, offset)
	q := fmt.Sprintf(
		`SELECT `+userCols+` FROM "user" u LEFT JOIN role r ON r.id = u.role_id %s
		 ORDER BY u.created_at DESC LIMIT $%d OFFSET $%d`,
		where, len(args)-1, len(args),
	)
	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return 0, nil, err
	}
	rows2, err := pgx.CollectRows(rows, pgx.RowToStructByName[userRow])
	if err != nil {
		return 0, nil, err
	}
	users := make([]User, 0, len(rows2))
	for _, u := range rows2 {
		users = append(users, u.dto())
	}
	return count, users, nil
}

func buildUserWhere(f UserFilter) (string, []any) {
	clauses := make([]string, 0, 4)
	args := make([]any, 0, 4)

	if f.Search != "" {
		args = append(args, "%"+f.Search+"%")
		n := len(args)
		clauses = append(clauses, fmt.Sprintf("(u.name ILIKE $%d OR u.email ILIKE $%d OR u.phone ILIKE $%d)", n, n, n))
	}
	// Django filters email_verified = (ev in ("verified", "true")), so
	// "verified"/"true" → true and "unverified"/anything else → false.
	if f.EmailVerified != "" && f.EmailVerified != "all" {
		args = append(args, f.EmailVerified == "verified" || f.EmailVerified == "true")
		clauses = append(clauses, fmt.Sprintf("u.email_verified = $%d", len(args)))
	}
	if f.IsAdmin == "true" {
		args = append(args, true)
		clauses = append(clauses, fmt.Sprintf("u.is_admin = $%d", len(args)))
	} else if f.IsAdmin == "false" {
		args = append(args, false)
		clauses = append(clauses, fmt.Sprintf("u.is_admin = $%d", len(args)))
	}
	if f.Role != "" && f.Role != "all" {
		args = append(args, f.Role)
		clauses = append(clauses, fmt.Sprintf("u.role_id = $%d", len(args)))
	}

	if len(clauses) == 0 {
		return "", args
	}
	return "WHERE " + strings.Join(clauses, " AND "), args
}

// CreateUserInput is the admin create-user payload.
type CreateUserInput struct {
	Name          string  `json:"name"`
	Email         string  `json:"email"`
	Phone         *string `json:"phone"`
	Password      *string `json:"password"`
	EmailVerified bool    `json:"emailVerified"`
	IsAdmin       bool    `json:"isAdmin"`
	RoleID        *string `json:"roleId"`
}

// CreateUser inserts a user and returns its id.
func (r *Repository) CreateUser(ctx context.Context, in CreateUserInput) (string, error) {
	passwordHash := ""
	if in.Password != nil && *in.Password != "" {
		h, err := auth.HashPassword(*in.Password)
		if err != nil {
			return "", err
		}
		passwordHash = h
	}
	id := idgen.NewUUID()
	now := time.Now()
	// Django's boolean/timestamp defaults are Python-side (no DB DEFAULT), so
	// every NOT NULL column must be supplied explicitly. Nullable columns
	// (image, stripe_customer_id, last_login) are left to their NULL default.
	_, err := r.pool.Exec(ctx,
		`INSERT INTO "user"
			(id, name, email, phone, email_verified, is_admin, role_id,
			 two_factor_enabled, is_active, is_superuser, is_staff, password, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, false, true, false, false, $8, $9, $9)`,
		id, in.Name, in.Email, in.Phone, in.EmailVerified, in.IsAdmin, in.RoleID, passwordHash, now)
	return id, err
}

// UpdateUserInput holds the admin patch fields. Pointer-typed fields are nil
// when absent; RoleSet/PhoneSet/ImageSet distinguish "explicitly null" from
// "absent" (the frontend sends roleId: null to clear a role, phone: null to
// clear a phone number).
type UpdateUserInput struct {
	Name          *string
	Email         *string
	Phone         *string
	PhoneSet      bool
	Image         *string
	ImageSet      bool
	EmailVerified *bool
	IsAdmin       *bool
	RoleID        *string
	RoleSet       bool
	Password      *string
}

// UpdateUser applies a partial update and returns the refreshed user.
func (r *Repository) UpdateUser(ctx context.Context, id string, in UpdateUserInput) (*User, error) {
	sets := make([]string, 0, 8)
	args := []any{id}
	add := func(col string, val any) {
		args = append(args, val)
		sets = append(sets, fmt.Sprintf("%s = $%d", col, len(args)))
	}

	if in.Name != nil {
		add("name", *in.Name)
	}
	if in.Email != nil {
		add("email", *in.Email)
	}
	if in.PhoneSet {
		add("phone", in.Phone)
	}
	if in.ImageSet {
		add("image", in.Image)
	}
	if in.EmailVerified != nil {
		add("email_verified", *in.EmailVerified)
	}
	if in.IsAdmin != nil {
		add("is_admin", *in.IsAdmin)
	}
	if in.RoleSet {
		add("role_id", in.RoleID)
	}
	if in.Password != nil && *in.Password != "" {
		h, err := auth.HashPassword(*in.Password)
		if err != nil {
			return nil, err
		}
		add("password", h)
	}

	if len(sets) > 0 {
		add("updated_at", time.Now())
		q := `UPDATE "user" SET ` + strings.Join(sets, ", ") + ` WHERE id = $1`
		if _, err := r.pool.Exec(ctx, q, args...); err != nil {
			return nil, err
		}
	}
	row, err := r.UserByID(ctx, id)
	if err != nil {
		return nil, err
	}
	u := row.dto()
	return &u, nil
}

// DeleteUser removes a user by id, returning pgx.ErrNoRows when it does not exist.
func (r *Repository) DeleteUser(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM "user" WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

// PermissionSummary mirrors accounts.permissions.user_permission_summary.
func (r *Repository) PermissionSummary(ctx context.Context, p *auth.Principal) (PermissionSummary, error) {
	out := PermissionSummary{Permissions: []PermissionPair{}}
	if p == nil {
		return out, nil
	}
	out.IsAuthenticated = true
	out.IsAdmin = p.IsAdmin
	out.IsSuperuser = p.IsSuperuser
	if p.RoleID == "" {
		return out, nil
	}
	out.RoleName = &p.RoleName

	rows, err := r.pool.Query(ctx,
		`SELECT perm.resource, perm.action
		 FROM role_permission rp JOIN permission perm ON perm.id = rp.permission_id
		 WHERE rp.role_id = $1`, p.RoleID)
	if err != nil {
		return out, err
	}
	pairs, err := pgx.CollectRows(rows, pgx.RowToStructByName[PermissionPair])
	if err != nil {
		return out, err
	}
	out.Permissions = pairs
	return out, nil
}

// RecentUser is the recent-users row returned by the dashboard stats endpoint.
type RecentUser struct {
	ID        string    `db:"id" json:"id"`
	Name      string    `db:"name" json:"name"`
	Email     string    `db:"email" json:"email"`
	CreatedAt time.Time `db:"created_at" json:"createdAt"`
}

// DashboardStats returns the total user count and the 5 most recent users.
func (r *Repository) DashboardStats(ctx context.Context) (int, []RecentUser, error) {
	var total int
	if err := r.pool.QueryRow(ctx, `SELECT count(*) FROM "user"`).Scan(&total); err != nil {
		return 0, nil, err
	}
	rows, err := r.pool.Query(ctx,
		`SELECT id::text, name, email, created_at FROM "user" ORDER BY created_at DESC LIMIT 5`)
	if err != nil {
		return 0, nil, err
	}
	recent, err := pgx.CollectRows(rows, pgx.RowToStructByName[RecentUser])
	if err != nil {
		return 0, nil, err
	}
	return total, recent, nil
}
