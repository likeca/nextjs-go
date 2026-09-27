package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"strconv"
	"strings"
	"time"
)

// Pre-auth token mirrors Django's signing.dumps with the salt
// "accounts.pre-auth-2fa" and a 300s max age. It carries a user id between the
// first and second 2FA login steps. Signed with JWT_SECRET so only the backend
// can mint/verify it.
const (
	preAuthSalt   = "accounts.pre-auth-2fa"
	preAuthMaxAge = 300 * time.Second
)

// SignPreAuth produces a short-lived signed token carrying a user id.
func SignPreAuth(secret []byte, userID string) string {
	payload := userID + "." + strconv.FormatInt(time.Now().Unix(), 10)
	return base64.URLEncoding.EncodeToString([]byte(payload)) + "." + preAuthHMAC(secret, payload)
}

// VerifyPreAuth checks the token signature and age, returning the user id.
func VerifyPreAuth(secret []byte, token string) (string, bool) {
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return "", false
	}
	raw, err := base64.URLEncoding.DecodeString(parts[0])
	if err != nil {
		return "", false
	}
	if parts[1] != preAuthHMAC(secret, string(raw)) {
		return "", false
	}
	s := string(raw)
	i := strings.LastIndex(s, ".")
	if i < 0 {
		return "", false
	}
	ts, err := strconv.ParseInt(s[i+1:], 10, 64)
	if err != nil {
		return "", false
	}
	if time.Since(time.Unix(ts, 0)) > preAuthMaxAge {
		return "", false
	}
	return s[:i], true
}

func preAuthHMAC(secret []byte, payload string) string {
	mac := hmac.New(sha256.New, append([]byte(preAuthSalt), secret...))
	mac.Write([]byte(payload))
	return base64.URLEncoding.EncodeToString(mac.Sum(nil))
}
