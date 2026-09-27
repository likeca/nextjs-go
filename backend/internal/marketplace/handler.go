package marketplace

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/likeca/lhchub/go/internal/auth"
	"github.com/likeca/lhchub/go/internal/httpx"
)

type Handler struct {
	store Store
}

func NewHandler(store Store) *Handler { return &Handler{store: store} }

// ListCategories godoc
// @Summary      List categories
// @Description  Returns all marketplace job categories.
// @Tags         marketplace
// @Produce      json
// @Success      200  {array}  marketplace.Category
// @Failure      500  {object}  httpx.Error
// @Router       /api/marketplace/categories/ [get]
func (h *Handler) ListCategories(w http.ResponseWriter, r *http.Request) {
	cats, err := h.store.Categories(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, cats)
}

// ListProviders godoc
// @Summary      List providers
// @Description  Returns providers, optionally filtered by city, trade, verified status, and max price.
// @Tags         marketplace
// @Produce      json
// @Param        city      query  string  false  "City filter"
// @Param        trade     query  string  false  "Trade/category filter"
// @Param        verified  query  string  false  "Set to true to show only verified providers"
// @Param        maxPrice  query  int     false  "Maximum price filter"
// @Success      200       {array}  marketplace.Provider
// @Failure      500       {object}  httpx.Error
// @Router       /api/marketplace/providers/ [get]
func (h *Handler) ListProviders(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	f := ProviderFilter{
		City:  q.Get("city"),
		Trade: q.Get("trade"),
	}
	if q.Get("verified") == "true" {
		t := true
		f.Verified = &t
	}
	if v := q.Get("maxPrice"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			f.MaxPrice = &n
		}
	}

	providers, err := h.store.Providers(r.Context(), f)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, providers)
}

// GetProvider godoc
// @Summary      Get a provider
// @Description  Returns a single provider by slug.
// @Tags         marketplace
// @Produce      json
// @Param        slug  path  string  true  "Provider slug"
// @Success      200   {object}  marketplace.Provider
// @Failure      404   {object}  httpx.Error
// @Failure      500   {object}  httpx.Error
// @Router       /api/marketplace/providers/{slug}/ [get]
func (h *Handler) GetProvider(w http.ResponseWriter, r *http.Request) {
	p, err := h.store.ProviderBySlug(r.Context(), chi.URLParam(r, "slug"))
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteError(w, http.StatusNotFound, "Not found.")
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, p)
}

// ListJobs godoc
// @Summary      List jobs
// @Description  Returns jobs, optionally filtered by status and category.
// @Tags         marketplace
// @Produce      json
// @Param        status    query  string  false  "Job status filter"
// @Param        category  query  string  false  "Category filter"
// @Success      200       {array}  marketplace.Job
// @Failure      500       {object}  httpx.Error
// @Router       /api/marketplace/jobs/ [get]
func (h *Handler) ListJobs(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	jobs, err := h.store.Jobs(r.Context(), JobFilter{Status: q.Get("status"), Category: q.Get("category")})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, jobs)
}

// GetJob godoc
// @Summary      Get a job
// @Description  Returns a single job by id.
// @Tags         marketplace
// @Produce      json
// @Param        id  path  string  true  "Job id"
// @Success      200  {object}  marketplace.Job
// @Failure      404  {object}  httpx.Error
// @Failure      500  {object}  httpx.Error
// @Router       /api/marketplace/jobs/{id}/ [get]
func (h *Handler) GetJob(w http.ResponseWriter, r *http.Request) {
	job, err := h.store.JobByID(r.Context(), chi.URLParam(r, "id"))
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteError(w, http.StatusNotFound, "Not found.")
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, job)
}

// CreateJob godoc
// @Summary      Create a job
// @Description  Posts a new job. Requires authentication.
// @Tags         marketplace
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        job  body      marketplace.JobInput  true  "Job to create"
// @Success      201  {object}  marketplace.Job
// @Failure      400  {object}  httpx.Error
// @Failure      401  {object}  httpx.Error
// @Failure      500  {object}  httpx.Error
// @Router       /api/marketplace/jobs/ [post]
func (h *Handler) CreateJob(w http.ResponseWriter, r *http.Request) {
	p, err := auth.Require(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusUnauthorized, "Authentication credentials were not provided.")
		return
	}
	var in JobInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid JSON.")
		return
	}
	job, err := h.store.CreateJob(r.Context(), p.UserID, in)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, job)
}

// ListApplications godoc
// @Summary      List applications
// @Description  Returns job applications, optionally filtered by job id.
// @Tags         marketplace
// @Produce      json
// @Param        jobId  query  string  false  "Job id filter"
// @Success      200    {array}  marketplace.Application
// @Failure      500    {object}  httpx.Error
// @Router       /api/marketplace/applications/ [get]
func (h *Handler) ListApplications(w http.ResponseWriter, r *http.Request) {
	apps, err := h.store.Applications(r.Context(), r.URL.Query().Get("jobId"))
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, apps)
}

// ListThreads godoc
// @Summary      List message threads
// @Description  Returns the user's message threads.
// @Tags         marketplace
// @Produce      json
// @Success      200  {array}  marketplace.Thread
// @Failure      500  {object}  httpx.Error
// @Router       /api/marketplace/threads/ [get]
func (h *Handler) ListThreads(w http.ResponseWriter, r *http.Request) {
	threads, err := h.store.Threads(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, threads)
}

// ListTransactions godoc
// @Summary      List wallet transactions
// @Description  Returns the user's wallet transactions.
// @Tags         marketplace
// @Produce      json
// @Success      200  {array}  marketplace.Transaction
// @Failure      500  {object}  httpx.Error
// @Router       /api/marketplace/transactions/ [get]
func (h *Handler) ListTransactions(w http.ResponseWriter, r *http.Request) {
	txs, err := h.store.Transactions(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, txs)
}
