package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"strconv"
	"strings"

	"golang.org/x/crypto/argon2"
	"golang.org/x/crypto/pbkdf2"
)

// Password hashing. New passwords are hashed with Argon2id using Django's exact
// Argon2PasswordHasher wire format, so hashes stay forward-compatible when
// Django adopts argon2. Legacy PBKDF2-SHA256 hashes (Django's current default)
// are still verified so existing users keep working.
//
// Django argon2 format:
//
//	argon2$argon2id$v=19$m=102400,t=2,p=8$<b64(salt)>$<b64(hash)>
//
// where salt is Django's 22-char get_random_string (raw ASCII bytes) and hash is
// 32 bytes — both base64-encoded without padding, matching argon2-cffi's PHC
// output. Memory is in KiB.

// Argon2id parameters mirroring django.contrib.auth.hashers.Argon2PasswordHasher.
const (
	argon2Time        = 2
	argon2Memory      = 102400 // KiB (100 MiB)
	argon2Parallelism = 8
	argon2KeyLen      = 32
)

const pbkdf2Algorithm = "pbkdf2_sha256"

const saltChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

// HashPassword produces a Django-compatible Argon2id hash for new users.
func HashPassword(password string) (string, error) {
	salt, err := randomSalt(22)
	if err != nil {
		return "", err
	}
	hash := argon2.IDKey(
		[]byte(password), []byte(salt),
		argon2Time, argon2Memory, argon2Parallelism, argon2KeyLen,
	)
	return fmt.Sprintf("argon2$argon2id$v=19$m=%d,t=%d,p=%d$%s$%s",
		argon2Memory, argon2Time, argon2Parallelism,
		base64.RawStdEncoding.EncodeToString([]byte(salt)),
		base64.RawStdEncoding.EncodeToString(hash)), nil
}

// VerifyPassword checks a plaintext password against a stored hash, supporting
// both Argon2id (new) and legacy PBKDF2-SHA256 (existing Django users).
func VerifyPassword(password, encoded string) bool {
	if strings.HasPrefix(encoded, "argon2$") {
		return verifyArgon2(password, encoded)
	}
	if strings.HasPrefix(encoded, pbkdf2Algorithm+"$") {
		return verifyPBKDF2(password, encoded)
	}
	return false
}

// verifyArgon2 verifies a Django Argon2id hash. Parameters are parsed from the
// encoded string so hashes with different m/t/p still verify.
func verifyArgon2(password, encoded string) bool {
	parts := strings.Split(encoded, "$")
	// argon2$argon2id$v=19$m=...,t=...,p=...$salt$hash
	if len(parts) != 6 || parts[0] != "argon2" || parts[1] != "argon2id" {
		return false
	}
	memory, time, threads, ok := parseArgon2Params(parts[3])
	if !ok {
		return false
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return false
	}
	expected, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return false
	}
	actual := argon2.IDKey([]byte(password), salt, time, memory, threads, uint32(len(expected)))
	return subtle.ConstantTimeCompare(actual, expected) == 1
}

// parseArgon2Params parses "m=<memory>,t=<time>,p=<parallelism>".
func parseArgon2Params(s string) (memory, time uint32, threads uint8, ok bool) {
	for kv := range strings.SplitSeq(s, ",") {
		k, v, found := strings.Cut(kv, "=")
		if !found {
			return 0, 0, 0, false
		}
		n, err := strconv.Atoi(v)
		if err != nil || n <= 0 {
			return 0, 0, 0, false
		}
		switch k {
		case "m":
			memory = uint32(n)
		case "t":
			time = uint32(n)
		case "p":
			if n > 255 {
				return 0, 0, 0, false
			}
			threads = uint8(n)
		}
	}
	if memory == 0 || time == 0 || threads == 0 {
		return 0, 0, 0, false
	}
	return memory, time, threads, true
}

// verifyPBKDF2 verifies a legacy Django PBKDF2-SHA256 hash of the form
// "pbkdf2_sha256$<iterations>$<salt>$<base64(hash)>". The salt is a raw ASCII
// string (Django's get_random_string), NOT base64-encoded; only the hash is.
func verifyPBKDF2(password, encoded string) bool {
	parts := strings.Split(encoded, "$")
	if len(parts) != 4 || parts[0] != pbkdf2Algorithm {
		return false
	}
	iterations, err := strconv.Atoi(parts[1])
	if err != nil {
		return false
	}
	salt := []byte(parts[2])
	expected, err := base64.StdEncoding.DecodeString(parts[3])
	if err != nil {
		return false
	}
	actual := pbkdf2.Key([]byte(password), salt, iterations, len(expected), sha256.New)
	return subtle.ConstantTimeCompare(actual, expected) == 1
}

// randomSalt returns n random characters from saltChars (mirrors
// django.utils.crypto.get_random_string).
func randomSalt(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	for i := range b {
		b[i] = saltChars[int(b[i])%len(saltChars)]
	}
	return string(b), nil
}
