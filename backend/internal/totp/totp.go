// Package totp implements RFC 6238 TOTP with the same defaults as Python's
// pyotp (HMAC-SHA1, 30-second period, 6 digits, valid_window=1), so the Go
// backend interoperates with QR enrollments issued by Django.
package totp

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"crypto/subtle"
	"encoding/base32"
	"encoding/binary"
	"fmt"
	"net/url"
	"strings"
	"time"
)

const (
	period    = 30
	digits    = 6
	algorithm = "SHA1"
)

// GenerateSecret returns a 32-character base32 secret (pyotp.random_base32()).
func GenerateSecret() (string, error) {
	b := make([]byte, 20) // ceil(32*5/8) bytes → 32 base32 chars
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(b), nil
}

// Verify checks a TOTP code against the base32 secret, accepting the current,
// previous, and next time windows (pyotp verify(code, valid_window=1)).
func Verify(secret, code string) bool {
	key, err := base32.StdEncoding.WithPadding(base32.NoPadding).DecodeString(strings.ToUpper(strings.TrimSpace(secret)))
	if err != nil || len(key) == 0 {
		return false
	}
	code = strings.TrimSpace(code)
	if len(code) != digits {
		return false
	}
	counter := uint64(time.Now().Unix()) / period
	for offset := -1; offset <= 1; offset++ {
		got := hotp(key, counter+uint64(offset))
		if subtle.ConstantTimeCompare([]byte(got), []byte(code)) == 1 {
			return true
		}
	}
	return false
}

// ProvisioningURI builds the otpauth:// URI (pyotp provisioning_uri format)
// that the frontend renders as a QR code.
func ProvisioningURI(secret, name, issuer string) string {
	label := pyquote(issuer) + ":" + pyquote(name)
	q := url.Values{}
	q.Set("issuer", issuer)
	q.Set("secret", secret)
	q.Set("algorithm", algorithm)
	q.Set("digits", fmt.Sprintf("%d", digits))
	q.Set("period", fmt.Sprintf("%d", period))
	return "otpauth://totp/" + label + "?" + q.Encode()
}

// BackupCodes returns n 8-hex-char codes (Django's secrets.token_hex(4)).
func BackupCodes(n int) ([]string, error) {
	out := make([]string, n)
	for i := 0; i < n; i++ {
		b := make([]byte, 4)
		if _, err := rand.Read(b); err != nil {
			return nil, err
		}
		out[i] = fmt.Sprintf("%08x", b)
	}
	return out, nil
}

// hotp computes the 6-digit HOTP value for a counter (RFC 4226 + RFC 6238).
func hotp(key []byte, counter uint64) string {
	mac := hmac.New(sha1.New, key)
	var buf [8]byte
	binary.BigEndian.PutUint64(buf[:], counter)
	mac.Write(buf[:])
	sum := mac.Sum(nil)

	offset := sum[len(sum)-1] & 0x0f
	code := (uint32(sum[offset])&0x7f)<<24 |
		uint32(sum[offset+1])<<16 |
		uint32(sum[offset+2])<<8 |
		uint32(sum[offset+3])
	code %= 1_000_000
	return fmt.Sprintf("%06d", code)
}

// pyquote percent-encodes like urllib.parse.quote (space → %20), used for the
// label portion of the otpauth URI.
func pyquote(s string) string {
	const hex = "0123456789ABCDEF"
	var b strings.Builder
	for i := 0; i < len(s); i++ {
		c := s[i]
		if (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') ||
			c == '-' || c == '_' || c == '.' || c == '~' {
			b.WriteByte(c)
		} else {
			b.WriteByte('%')
			b.WriteByte(hex[c>>4])
			b.WriteByte(hex[c&0x0f])
		}
	}
	return b.String()
}
