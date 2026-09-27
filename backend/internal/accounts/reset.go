package accounts

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"strconv"
	"strings"
	"time"
)

// Password reset tokens are self-consistent (the whole reset flow is served by
// Go), but structurally mirror Django's default_token_generator: the token is
// "<unix-seconds>-<hmac>" where the HMAC covers the user id, the current
// password hash, and the timestamp. Including the password hash means a token
// stops working as soon as the password changes (same guarantee Django gives).

const resetTokenMaxAge = 72 * time.Hour // Django's default PASSWORD_RESET_TIMEOUT

// encodeUID encodes a user id as the URL-safe base64 "uid" carried in the reset
// link and decoded on confirm (mirrors Django's urlsafe_base64_encode).
func encodeUID(userID string) string {
	return base64.RawURLEncoding.EncodeToString([]byte(userID))
}

func decodeUID(s string) (string, error) {
	b, err := base64.RawURLEncoding.DecodeString(s)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func makeResetToken(secret []byte, userID, passwordHash string, ts int64) string {
	payload := userID + ":" + passwordHash + ":" + strconv.FormatInt(ts, 10)
	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte("accounts.password-reset:" + payload))
	return strconv.FormatInt(ts, 10) + "-" + hex.EncodeToString(mac.Sum(nil))
}

func verifyResetToken(secret []byte, userID, passwordHash, token string, now time.Time) bool {
	parts := strings.Split(token, "-")
	if len(parts) != 2 {
		return false
	}
	ts, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		return false
	}
	if age := now.Unix() - ts; age > int64(resetTokenMaxAge/time.Second) || age < -60 {
		return false
	}
	return hmac.Equal([]byte(makeResetToken(secret, userID, passwordHash, ts)), []byte(token))
}
