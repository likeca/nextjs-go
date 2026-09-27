package auth

import (
	"net/http"
	"strings"
)

// Middleware authenticates requests by validating the access token (Bearer
// header first, then the access_token cookie) and loading the principal into
// the request context. Missing or invalid tokens leave the request anonymous.
func Middleware(store Store, secret []byte) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := bearerToken(r)
			if token == "" {
				if c, err := r.Cookie("access_token"); err == nil {
					token = c.Value
				}
			}
			if token != "" {
				if userID, err := ParseAccessToken(token, secret); err == nil {
					if p, err := store.PrincipalByID(r.Context(), userID); err == nil && p != nil {
						r = r.WithContext(WithPrincipal(r.Context(), p))
					}
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}

func bearerToken(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if len(h) > 7 && strings.EqualFold(h[:7], "Bearer ") {
		return strings.TrimSpace(h[7:])
	}
	return ""
}
