package auth

import (
	"strings"
	"testing"
)

func TestHashPasswordArgon2Format(t *testing.T) {
	h, err := HashPassword("correct horse battery staple")
	if err != nil {
		t.Fatalf("HashPassword: %v", err)
	}
	if !strings.HasPrefix(h, "argon2$argon2id$v=19$m=102400,t=2,p=8$") {
		t.Fatalf("unexpected argon2 prefix: %s", h)
	}
	// argon2, argon2id, v=19, params, salt, hash
	if parts := strings.Split(h, "$"); len(parts) != 6 {
		t.Fatalf("expected 6 $-separated parts, got %d: %s", len(parts), h)
	}
}

func TestVerifyPasswordArgon2RoundTrip(t *testing.T) {
	h, err := HashPassword("s3cret!")
	if err != nil {
		t.Fatalf("HashPassword: %v", err)
	}
	if !VerifyPassword("s3cret!", h) {
		t.Fatal("expected correct password to verify")
	}
	if VerifyPassword("wrong", h) {
		t.Fatal("expected wrong password to fail")
	}
}

// Real hash produced by Django's PBKDF2PasswordHasher for "testpassword123".
func TestVerifyPasswordLegacyPBKDF2(t *testing.T) {
	const encoded = "pbkdf2_sha256$1200000$Ibhwb8dHA8faVVFgdMcFiF$P6Aj4ciRVbiomijI37/xva1uEl+qAvKZonlh4frewFk="
	if !VerifyPassword("testpassword123", encoded) {
		t.Fatal("expected legacy PBKDF2 hash to verify")
	}
	if VerifyPassword("wrong", encoded) {
		t.Fatal("expected wrong password to fail against PBKDF2 hash")
	}
}

func TestVerifyPasswordUnknownAlgorithm(t *testing.T) {
	if VerifyPassword("x", "md5$deadbeef") {
		t.Fatal("expected unknown algorithm to fail")
	}
}
