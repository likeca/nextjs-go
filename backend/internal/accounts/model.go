package accounts

import "time"

// User is the wire representation (accounts.serializers.UserSerializer).
type User struct {
	ID               string       `json:"id"`
	Name             string       `json:"name"`
	Email            string       `json:"email"`
	EmailVerified    bool         `json:"emailVerified"`
	Image            *string      `json:"image"`
	Phone            *string      `json:"phone"`
	IsAdmin          bool         `json:"isAdmin"`
	RoleID           *string      `json:"roleId"`
	Role             *RoleSummary `json:"role"`
	StripeCustomerID *string      `json:"stripeCustomerId"`
	TwoFactorEnabled bool         `json:"twoFactorEnabled"`
	CreatedAt        time.Time    `json:"createdAt"`
	UpdatedAt        time.Time    `json:"updatedAt"`
}

// RoleSummary mirrors accounts.serializers.RoleSummarySerializer.
type RoleSummary struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// Permission mirrors accounts.serializers.PermissionSerializer.
type Permission struct {
	ID          string    `db:"id" json:"id"`
	Name        string    `db:"name" json:"name"`
	Description *string   `db:"description" json:"description"`
	Resource    string    `db:"resource" json:"resource"`
	Action      string    `db:"action" json:"action"`
	CreatedAt   time.Time `db:"created_at" json:"createdAt"`
	UpdatedAt   time.Time `db:"updated_at" json:"updatedAt"`
}

// Role mirrors accounts.serializers.RoleSerializer.
type Role struct {
	ID              string              `json:"id"`
	Name            string              `json:"name"`
	Description     *string             `json:"description"`
	IsSystem        bool                `json:"isSystem"`
	Permissions     []Permission        `json:"permissions"`
	RolePermissions []RolePermissionRef `json:"rolePermissions"`
	CreatedAt       time.Time           `json:"createdAt"`
	UpdatedAt       time.Time           `json:"updatedAt"`
}

// RolePermissionRef is the [{permission: {...}}] shape the roles UI consumes.
type RolePermissionRef struct {
	Permission Permission `json:"permission"`
}

// PermissionSummary mirrors accounts.permissions.user_permission_summary.
type PermissionSummary struct {
	IsAuthenticated bool             `json:"isAuthenticated"`
	IsAdmin         bool             `json:"isAdmin"`
	IsSuperuser     bool             `json:"isSuperuser"`
	RoleName        *string          `json:"roleName"`
	Permissions     []PermissionPair `json:"permissions"`
}

// PermissionPair is a single (resource, action) grant.
type PermissionPair struct {
	Resource string `db:"resource" json:"resource"`
	Action   string `db:"action" json:"action"`
}
