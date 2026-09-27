package config

import (
	"os"
	"strconv"
)

// Config holds process configuration, loaded from the environment (12-factor).
type Config struct {
	Port         string // HTTP listen port
	DatabaseURL  string // postgres:// DSN (same value Django reads via DATABASE_URL)
	LogLevel     string // debug | info | warn | error
	MediaPath    string // URL prefix for uploaded files, e.g. "/media/"
	JWTSecretKey string // HMAC key for HS256 JWT signing/verification (access + refresh)
	FrontendURL  string // Next.js origin (Stripe success/cancel redirects)

	// simplejwt token lifetimes (mirror settings/rest.py).
	AccessTokenLifetimeMinutes int
	RefreshTokenLifetimeDays   int

	// Google OAuth (dj-rest-auth SocialLoginView). Empty when unconfigured.
	GoogleClientID     string
	GoogleClientSecret string
	GoogleCallbackURL  string

	// Stripe billing. StripeSecretKey is required for checkout/portal/cancel;
	// StripeWebhookSecret (optional in dev) verifies webhook signatures.
	StripeSecretKey     string
	StripeWebhookSecret string

	// Media storage. MediaRoot is the local filesystem directory (dev); when
	// R2Bucket is set, seed-images uploads to Cloudflare R2 instead.
	MediaRoot         string
	R2Bucket          string
	R2EndpointURL     string
	R2AccessKeyID     string
	R2SecretAccessKey string
	R2PublicHostname  string

	// Outbound email (SMTP). Empty SMTPHost keeps the dev LogSender.
	SMTPHost     string
	SMTPPort     int
	SMTPUsername string
	SMTPPassword string
	SMTPFrom     string
	SMTPUseTLS   bool // STARTTLS (port 587)
	SMTPUseSSL   bool // implicit TLS (port 465)
}

func Load() Config {
	return Config{
		Port:         getenv("PORT", "8080"),
		DatabaseURL:  getenv("DATABASE_URL", "postgres://postgres:postgres@127.0.0.1:5432/lhchub-go"),
		LogLevel:     getenv("LOG_LEVEL", "info"),
		MediaPath:    getenv("MEDIA_PATH", "/media/"),
		JWTSecretKey: getenv("JWT_SECRET", ""),
		FrontendURL:  getenv("FRONTEND_URL", "http://localhost:3000"),

		AccessTokenLifetimeMinutes: getenvInt("ACCESS_TOKEN_LIFETIME_MINUTES", 30),
		RefreshTokenLifetimeDays:   getenvInt("REFRESH_TOKEN_LIFETIME_DAYS", 7),

		GoogleClientID:     getenv("GOOGLE_AUTH_CLIENT_ID", ""),
		GoogleClientSecret: getenv("GOOGLE_AUTH_SECRET", ""),
		GoogleCallbackURL:  getenv("GOOGLE_CALLBACK_URL", "http://localhost:8000/api/auth/google/callback"),

		StripeSecretKey:     getenv("STRIPE_SECRET_KEY", ""),
		StripeWebhookSecret: getenv("STRIPE_WEBHOOK_SECRET", ""),

		MediaRoot:         getenv("MEDIA_ROOT", "media"),
		R2Bucket:          getenv("R2_BUCKET", ""),
		R2EndpointURL:     getenv("R2_ENDPOINT_URL", ""),
		R2AccessKeyID:     getenv("R2_ACCESS_KEY_ID", ""),
		R2SecretAccessKey: getenv("R2_SECRET_ACCESS_KEY", ""),
		R2PublicHostname:  getenv("R2_PUBLIC_HOSTNAME", ""),

		SMTPHost:     getenv("SMTP_HOST", ""),
		SMTPPort:     getenvInt("SMTP_PORT", 587),
		SMTPUsername: getenv("SMTP_USERNAME", ""),
		SMTPPassword: getenv("SMTP_PASSWORD", ""),
		SMTPFrom:     getenv("SMTP_FROM", "no-reply@lhchub.com"),
		SMTPUseTLS:   getenvBool("SMTP_USE_TLS", true),
		SMTPUseSSL:   getenvBool("SMTP_USE_SSL", false),
	}
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getenvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

func getenvBool(key string, fallback bool) bool {
	if v := os.Getenv(key); v != "" {
		if b, err := strconv.ParseBool(v); err == nil {
			return b
		}
	}
	return fallback
}
