// Package auth validates Django-issued simplejwt tokens and exposes the
// authenticated principal to handlers. It mirrors the frontend's
// access_token/refresh_token cookie contract so the existing Next.js client
// keeps working against the Go backend.
package auth

import (
	"context"
	"errors"
)

// Principal is an authenticated caller — the subset of accounts.User (plus its
// role) that permission checks and handlers need.
type Principal struct {
	UserID      string
	Email       string
	Name        string
	IsAdmin     bool
	IsSuperuser bool
	RoleID      string // empty when the user has no role
	RoleName    string
}

// Store loads a Principal by user id. Implemented by the accounts package.
type Store interface {
	PrincipalByID(ctx context.Context, id string) (*Principal, error)
}

type principalCtxKey struct{}

// WithPrincipal returns a context carrying the authenticated principal.
func WithPrincipal(ctx context.Context, p *Principal) context.Context {
	return context.WithValue(ctx, principalCtxKey{}, p)
}

// FromContext returns the principal, or nil when the request is anonymous.
func FromContext(ctx context.Context) *Principal {
	p, _ := ctx.Value(principalCtxKey{}).(*Principal)
	return p
}

// ErrUnauthenticated is returned by Require when no principal is present.
var ErrUnauthenticated = errors.New("authentication credentials were not provided")

// Require returns the principal or ErrUnauthenticated.
func Require(ctx context.Context) (*Principal, error) {
	p := FromContext(ctx)
	if p == nil {
		return nil, ErrUnauthenticated
	}
	return p, nil
}
