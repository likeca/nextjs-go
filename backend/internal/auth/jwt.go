package auth

import (
	"errors"

	"github.com/golang-jwt/jwt/v5"
)

// Claims is the simplejwt access-token payload (token_type, user_id + the
// standard registered claims). user_id is the accounts.User UUID as a string.
type Claims struct {
	TokenType string `json:"token_type"`
	UserID    string `json:"user_id"`
	jwt.RegisteredClaims
}

// ErrInvalidToken is returned for any token that fails signature, expiry or
// claim validation.
var ErrInvalidToken = errors.New("invalid token")

// ParseAccessToken validates a simplejwt access token (HS256, signed with
// JWT_SECRET) and returns its user_id.
func ParseAccessToken(tokenString string, secret []byte) (string, error) {
	if len(secret) == 0 {
		return "", ErrInvalidToken
	}
	claims := &Claims{}
	tok, err := jwt.ParseWithClaims(tokenString, claims, func(*jwt.Token) (any, error) {
		return secret, nil
	}, jwt.WithValidMethods([]string{"HS256"}))
	if err != nil || !tok.Valid {
		return "", ErrInvalidToken
	}
	if claims.TokenType != "access" || claims.UserID == "" {
		return "", ErrInvalidToken
	}
	return claims.UserID, nil
}
