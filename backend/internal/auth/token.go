package auth

import (
	"crypto/rand"
	"encoding/hex"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// IssueTokens signs a simplejwt-compatible access/refresh pair (HS256 keyed by
// JWT_SECRET).
func IssueTokens(secret []byte, userID string, accessLifetime, refreshLifetime time.Duration) (access, refresh string, err error) {
	if access, err = sign(secret, userID, "access", accessLifetime); err != nil {
		return "", "", err
	}
	if refresh, err = sign(secret, userID, "refresh", refreshLifetime); err != nil {
		return "", "", err
	}
	return access, refresh, nil
}

// ParseRefreshToken validates a simplejwt refresh token and returns its user_id.
func ParseRefreshToken(tokenString string, secret []byte) (string, error) {
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
	if claims.TokenType != "refresh" || claims.UserID == "" {
		return "", ErrInvalidToken
	}
	return claims.UserID, nil
}

func sign(secret []byte, userID, tokenType string, lifetime time.Duration) (string, error) {
	now := time.Now().Truncate(time.Second)
	claims := Claims{
		TokenType: tokenType,
		UserID:    userID,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(lifetime)),
			ID:        jti(),
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return tok.SignedString(secret)
}

// jti mirrors simplejwt's uuid4().hex — a 32-char hex token id.
func jti() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
