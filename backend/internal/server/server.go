package server

import (
	"context"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/likeca/lhchub/go/internal/accounts"
	"github.com/likeca/lhchub/go/internal/billing"
	"github.com/likeca/lhchub/go/internal/config"
	"github.com/likeca/lhchub/go/internal/discovery"
	"github.com/likeca/lhchub/go/internal/marketplace"

	_ "github.com/likeca/lhchub/go/docs"
	httpSwagger "github.com/swaggo/http-swagger/v2"

	"go.uber.org/zap"
)

type Server struct {
	logger *zap.Logger
	http   *http.Server
}

func New(cfg config.Config, logger *zap.Logger, authMW func(http.Handler) http.Handler, d *discovery.Handler, m *marketplace.Handler, a *accounts.Handler, b *billing.Handler) *Server {
	r := chi.NewRouter()

	r.Use(recoverMiddleware)
	r.Use(logMiddleware(logger))
	r.Use(authMW)

	r.Get("/healthz", healthz)
	r.Get("/swagger/*", httpSwagger.Handler())

	r.Get("/api/discovery/items/", d.ListItems)

	r.Get("/api/marketplace/categories/", m.ListCategories)
	r.Get("/api/marketplace/providers/", m.ListProviders)
	r.Get("/api/marketplace/providers/{slug}/", m.GetProvider)
	r.Get("/api/marketplace/jobs/", m.ListJobs)
	r.Get("/api/marketplace/jobs/{id}/", m.GetJob)
	r.Post("/api/marketplace/jobs/", m.CreateJob)
	r.Get("/api/marketplace/applications/", m.ListApplications)
	r.Get("/api/marketplace/threads/", m.ListThreads)
	r.Get("/api/marketplace/transactions/", m.ListTransactions)

	// The admin dashboard stats aggregate billing data (active subscriptions +
	// revenue), which lives in the billing handler.
	a.SetBillingTotals(b.AdminTotals)

	a.RegisterRoutes(r)
	b.RegisterRoutes(r)

	return &Server{
		logger: logger,
		http: &http.Server{
			Addr:    ":" + cfg.Port,
			Handler: r,
		},
	}
}

func (s *Server) Addr() string { return s.http.Addr }

func (s *Server) ListenAndServe() error { return s.http.ListenAndServe() }

func (s *Server) Shutdown(ctx context.Context) error { return s.http.Shutdown(ctx) }

// healthz godoc
// @Summary      Health check
// @Description  Returns ok when the server is up.
// @Tags         system
// @Produce      json
// @Success      200  {object}  object
// @Router       /healthz [get]
func healthz(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}
