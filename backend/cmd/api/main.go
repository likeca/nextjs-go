package main

import (
	"context"
	"errors"
	"flag"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/likeca/lhchub/go/internal/accounts"
	"github.com/likeca/lhchub/go/internal/auth"
	"github.com/likeca/lhchub/go/internal/billing"
	"github.com/likeca/lhchub/go/internal/config"
	"github.com/likeca/lhchub/go/internal/db"
	"github.com/likeca/lhchub/go/internal/discovery"
	"github.com/likeca/lhchub/go/internal/logging"
	"github.com/likeca/lhchub/go/internal/marketplace"
	"github.com/likeca/lhchub/go/internal/seed"
	"github.com/likeca/lhchub/go/internal/seedimages"
	"github.com/likeca/lhchub/go/internal/server"

	"go.uber.org/zap"
)

// @title           LHCHub API
// @version         1.0
// @description     LHCHub home-services marketplace API (Go backend). Clients post jobs, vetted providers apply, and payment is held in escrow.
// @termsOfService  http://swagger.io/terms/

// @host      localhost:8080
// @BasePath  /
// @schemes   http

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization

func main() {
	if len(os.Args) > 1 {
		switch os.Args[1] {
		case "seed":
			seedMain(os.Args[2:])
			return
		case "seed-images":
			seedImagesMain(os.Args[2:])
			return
		case "seed-admin":
			seedAdminMain(os.Args[2:])
			return
		}
	}
	
	serve()
}

// seedMain loads Django-style seed JSON files into Postgres — the Go
// equivalent of `manage.py loaddata`. See internal/seed for details.
//
//	go run ./cmd/api seed                 # seed every go/seed/**/*.json
//	go run ./cmd/api seed -dry-run        # run inside a transaction and roll back
//	go run ./cmd/api seed seed/marketplace/categories.json
func seedMain(args []string) {
	fs := flag.NewFlagSet("seed", flag.ExitOnError)
	dir := fs.String("dir", "seed", "directory scanned for seed JSON (used when no paths are given)")
	dryRun := fs.Bool("dry-run", false, "run inside a transaction and roll back (nothing committed)")
	if err := fs.Parse(args); err != nil {
		os.Exit(2)
	}

	cfg := config.Load()
	logger, err := logging.New(cfg.LogLevel)
	if err != nil {
		panic(err)
	}
	defer logger.Sync()

	ctx := context.Background()
	pool, err := db.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Fatal("failed to connect to database", zap.Error(err))
	}
	defer pool.Close()

	var paths []string
	if fs.NArg() > 0 {
		paths = fs.Args()
	} else {
		paths, err = seed.Collect(*dir)
		if err != nil {
			logger.Fatal("failed to scan seed files", zap.Error(err))
		}
	}
	if len(paths) == 0 {
		logger.Fatal("no seed files found")
	}

	if err := seed.Run(ctx, pool, logger, paths, *dryRun); err != nil {
		logger.Fatal("seed failed", zap.Error(err))
	}
	logger.Info("seed complete", zap.Int("files", len(paths)), zap.Bool("dry_run", *dryRun))
}

// seedAdminMain creates or updates the bootstrap admin user — the Go
// equivalent of `manage.py seed_rbac --admin-email --admin-password`.
// Permissions and roles are seeded by the 000002 migration; this command only
// manages the admin account so its credentials are never baked into the schema.
//
//	go run ./cmd/api seed-admin -email admin@example.com -password 'Adm1n!2345'
func seedAdminMain(args []string) {
	fs := flag.NewFlagSet("seed-admin", flag.ExitOnError)
	email := fs.String("email", "", "admin email (required)")
	password := fs.String("password", "", "admin password (required)")
	name := fs.String("name", "Administrator", "admin display name")
	if err := fs.Parse(args); err != nil {
		os.Exit(2)
	}
	if *email == "" || *password == "" {
		fs.Usage()
		os.Exit(2)
	}

	cfg := config.Load()
	logger, err := logging.New(cfg.LogLevel)
	if err != nil {
		panic(err)
	}
	defer logger.Sync()

	ctx := context.Background()
	pool, err := db.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Fatal("failed to connect to database", zap.Error(err))
	}
	defer pool.Close()

	created, err := accounts.NewRepository(pool).EnsureAdmin(ctx, accounts.EnsureAdminInput{
		Email:    *email,
		Password: *password,
		Name:     *name,
	})
	if err != nil {
		logger.Fatal("seed-admin failed", zap.Error(err))
	}
	if created {
		logger.Info("created admin user", zap.String("email", *email))
	} else {
		logger.Info("updated admin user", zap.String("email", *email))
	}
}

// seedImagesMain downloads a photo for every discovery row whose image file is
// missing — the Go equivalent of `manage.py seed_discovery_images`. It writes to
// the local mediaRoot, or to Cloudflare R2 when R2_BUCKET is set.
func seedImagesMain(args []string) {
	fs := flag.NewFlagSet("seed-images", flag.ExitOnError)
	force := fs.Bool("force", false, "re-download even if the file exists")
	if err := fs.Parse(args); err != nil {
		os.Exit(2)
	}

	cfg := config.Load()
	logger, err := logging.New(cfg.LogLevel)
	if err != nil {
		panic(err)
	}
	defer logger.Sync()

	ctx := context.Background()
	pool, err := db.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Fatal("failed to connect to database", zap.Error(err))
	}
	defer pool.Close()

	var r2 *seedimages.R2Config
	if cfg.R2Bucket != "" {
		r2 = &seedimages.R2Config{
			Endpoint:  cfg.R2EndpointURL,
			Bucket:    cfg.R2Bucket,
			AccessKey: cfg.R2AccessKeyID,
			SecretKey: cfg.R2SecretAccessKey,
		}
	}

	if err := seedimages.Run(ctx, pool, logger, cfg.MediaRoot, r2, *force); err != nil {
		logger.Fatal("seed-images failed", zap.Error(err))
	}
}

// serve runs the HTTP API (the default command).
func serve() {
	cfg := config.Load()

	logger, err := logging.New(cfg.LogLevel)
	if err != nil {
		panic(err)
	}
	defer logger.Sync()

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	pool, err := db.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Fatal("failed to connect to database", zap.Error(err))
	}
	defer pool.Close()

	discoveryHandler := discovery.NewHandler(discovery.NewRepository(pool, cfg.MediaPath))
	marketplaceHandler := marketplace.NewHandler(marketplace.NewRepository(pool))

	accountsRepo := accounts.NewRepository(pool)
	if cfg.JWTSecretKey == "" {
		logger.Warn("JWT_SECRET is empty; access/refresh tokens cannot be issued or validated")
	}
	authMW := auth.Middleware(accountsRepo, []byte(cfg.JWTSecretKey))
	accountsHandler := accounts.NewHandler(accountsRepo, cfg, logger)

	billingHandler := billing.NewHandler(
		billing.NewRepository(pool),
		billing.NewClient(cfg.StripeSecretKey),
		cfg.FrontendURL,
		cfg.StripeWebhookSecret,
		logger,
	)

	srv := server.New(cfg, logger, authMW, discoveryHandler, marketplaceHandler, accountsHandler, billingHandler)

	go func() {
		logger.Info("server starting", zap.String("addr", srv.Addr()))
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Fatal("server failed", zap.Error(err))
		}
	}()

	<-ctx.Done()
	logger.Info("shutting down")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("graceful shutdown failed", zap.Error(err))
	}
}
