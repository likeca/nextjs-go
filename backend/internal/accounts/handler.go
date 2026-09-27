package accounts

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/likeca/lhchub/go/internal/auth"
	"github.com/likeca/lhchub/go/internal/config"
	"github.com/likeca/lhchub/go/internal/httpx"
	"github.com/likeca/lhchub/go/internal/mail"
	"go.uber.org/zap"
)

// Handler serves the accounts API: dj-rest-auth auth endpoints, admin user
// CRUD, roles, permissions, and dashboard stats. It mirrors the Django
// accounts app's wire contracts (camelCase JSON, DRF error shapes).
type Handler struct {
	repo        *Repository
	secret      []byte
	accessTTL   time.Duration
	refreshTTL  time.Duration
	frontendURL string
	mailer      mail.Sender

	googleClientID     string
	googleClientSecret string
	googleCallbackURL  string

	// billingTotals supplies the admin dashboard's active-subscription and
	// revenue aggregates. It is wired from the billing handler by server.New;
	// when nil the values default to zero (matching Django's stubbed stats).
	billingTotals func(ctx context.Context) (activeSubscriptions, revenueCents int, err error)

	logger *zap.Logger
}

// SetBillingTotals wires the billing aggregate source into the dashboard stats
// endpoint. It is called once at startup from server.New.
func (h *Handler) SetBillingTotals(fn func(ctx context.Context) (int, int, error)) {
	h.billingTotals = fn
}

func NewHandler(repo *Repository, cfg config.Config, logger *zap.Logger) *Handler {
	return &Handler{
		repo:        repo,
		secret:      []byte(cfg.JWTSecretKey),
		accessTTL:   time.Duration(cfg.AccessTokenLifetimeMinutes) * time.Minute,
		refreshTTL:  time.Duration(cfg.RefreshTokenLifetimeDays) * 24 * time.Hour,
		frontendURL: cfg.FrontendURL,
		mailer:      newMailer(cfg, logger),

		googleClientID:     cfg.GoogleClientID,
		googleClientSecret: cfg.GoogleClientSecret,
		googleCallbackURL:  cfg.GoogleCallbackURL,

		logger: logger,
	}
}

// newMailer returns an SMTP sender when SMTP_HOST is configured, else the dev
// LogSender (matching Django's consolemail default).
func newMailer(cfg config.Config, logger *zap.Logger) mail.Sender {
	if cfg.SMTPHost == "" {
		return mail.LogSender{Logger: logger}
	}
	return mail.SMTPSender{
		Host:     cfg.SMTPHost,
		Port:     cfg.SMTPPort,
		Username: cfg.SMTPUsername,
		Password: cfg.SMTPPassword,
		From:     cfg.SMTPFrom,
		UseTLS:   cfg.SMTPUseTLS,
		UseSSL:   cfg.SMTPUseSSL,
		Logger:   logger,
	}
}

// RegisterRoutes wires the accounts endpoints into the router.
func (h *Handler) RegisterRoutes(r chi.Router) {
	// dj-rest-auth
	r.Post("/api/auth/login/", h.Login)
	r.Post("/api/auth/registration/", h.Register)
	r.Post("/api/auth/logout/", h.Logout)
	r.Post("/api/auth/token/refresh/", h.TokenRefresh)
	r.Post("/api/auth/token/verify/", h.TokenVerify)
	r.Get("/api/auth/user/", h.GetUser)
	r.Patch("/api/auth/user/", h.PatchUser)

	// 2FA (TOTP), email OTP, password, and Google OAuth
	r.Post("/api/auth/2fa/enable/", h.TwoFactorEnable)
	r.Post("/api/auth/2fa/verify/", h.TwoFactorVerify)
	r.Post("/api/auth/2fa/disable/", h.TwoFactorDisable)
	r.Post("/api/auth/2fa/login-verify/", h.TwoFactorLoginVerify)
	r.Post("/api/auth/otp/send/", h.EmailOTPSend)
	r.Post("/api/auth/otp/verify/", h.EmailOTPVerify)
	r.Post("/api/auth/password/change/", h.PasswordChange)
	r.Post("/api/auth/password/reset/", h.PasswordResetRequest)
	r.Post("/api/auth/password/reset/confirm/", h.PasswordResetConfirm)
	r.Post("/api/user/email-change/", h.EmailChangeRequest)
	r.Post("/api/user/email-change/confirm/", h.EmailChangeConfirm)
	r.Post("/api/auth/google/", h.GoogleSignin)

	// admin users
	r.Get("/api/users/", h.ListUsers)
	r.Post("/api/users/", h.CreateUser)
	r.Get("/api/users/me/", h.GetUser)
	r.Get("/api/users/permissions/", h.MyPermissions)
	r.Get("/api/users/{id}/", h.GetUserByID)
	r.Patch("/api/users/{id}/", h.UpdateUser)
	r.Delete("/api/users/{id}/", h.DeleteUser)

	// roles
	r.Get("/api/roles/", h.ListRoles)
	r.Post("/api/roles/", h.CreateRole)
	r.Get("/api/roles/{id}/", h.GetRole)
	r.Patch("/api/roles/{id}/", h.UpdateRole)
	r.Delete("/api/roles/{id}/", h.DeleteRole)

	// permissions
	r.Get("/api/permissions/", h.ListPermissions)
	r.Post("/api/permissions/", h.CreatePermission)
	r.Get("/api/permissions/{id}/", h.GetPermission)
	r.Patch("/api/permissions/{id}/", h.UpdatePermission)
	r.Delete("/api/permissions/{id}/", h.DeletePermission)

	// dashboard
	r.Get("/api/dashboard/stats/", h.DashboardStats)
}

// ── helpers ────────────────────────────────────────────────────────────────

// requirePerm enforces IsAuthenticated + HasResourcePermission(resource,
// action). It writes the error response and returns nil on failure; on success
// it returns the principal.
func (h *Handler) requirePerm(w http.ResponseWriter, r *http.Request, resource, action string) *auth.Principal {
	p, err := auth.Require(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusUnauthorized, "Authentication credentials were not provided.")
		return nil
	}
	ok, err := h.repo.HasResourcePermission(r.Context(), p, resource, action)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return nil
	}
	if !ok {
		httpx.WriteError(w, http.StatusForbidden, "You do not have permission to perform this action.")
		return nil
	}
	return p
}

// canAccessUser mirrors accounts.permissions.can_access_user: self, superuser,
// Super Admin, or the user.update_any permission.
func (h *Handler) canAccessUser(ctx context.Context, p *auth.Principal, id string) (bool, error) {
	if p.UserID == id || p.IsSuperuser || (p.IsAdmin && p.RoleName == "Super Admin") {
		return true, nil
	}
	return h.repo.HasResourcePermission(ctx, p, "user", "update_any")
}

// issueTokensStatus signs an access/refresh pair and writes {access, refresh, user}.
func (h *Handler) issueTokensStatus(w http.ResponseWriter, status int, user User) {
	access, refresh, err := auth.IssueTokens(h.secret, user.ID, h.accessTTL, h.refreshTTL)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, status, map[string]any{"access": access, "refresh": refresh, "user": user})
}

// ── auth endpoints ─────────────────────────────────────────────────────────

// Login godoc
// @Summary      Log in
// @Description  Authenticates with email + password. Users with 2FA enabled receive a preAuthToken instead of tokens.
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body  object  true  "{email, password}"
// @Success      200   {object}  object
// @Failure      400   {object}  httpx.Error
// @Failure      500   {object}  httpx.Error
// @Router       /api/auth/login/ [post]
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid JSON.")
		return
	}
	email := strings.ToLower(strings.TrimSpace(body.Email))
	u, err := h.repo.UserByEmail(r.Context(), email)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteError(w, http.StatusBadRequest, "Unable to log in with provided credentials.")
		return
	}
	if err != nil {
		h.logger.Error("login lookup failed", zap.Error(err))
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	if !auth.VerifyPassword(body.Password, u.Password) || !u.IsActive {
		httpx.WriteError(w, http.StatusBadRequest, "Unable to log in with provided credentials.")
		return
	}
	h.finishLogin(w, u)
}

// Register godoc
// @Summary      Register
// @Description  Creates a new account and returns JWT tokens.
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body  object  true  "{email, name, password1, password2}"
// @Success      201   {object}  object
// @Failure      400   {object}  object
// @Failure      500   {object}  httpx.Error
// @Router       /api/auth/registration/ [post]
func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email     string `json:"email"`
		Name      string `json:"name"`
		Password1 string `json:"password1"`
		Password2 string `json:"password2"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid JSON.")
		return
	}
	email := strings.ToLower(strings.TrimSpace(body.Email))
	if email == "" {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"email": []string{"This field is required."}})
		return
	}
	if body.Password1 != body.Password2 {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"non_field_errors": []string{"The two password fields didn't match."}})
		return
	}
	if len(body.Password1) < 8 {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"password1": []string{"This password is too short. It must contain at least 8 characters."}})
		return
	}
	if _, err := h.repo.UserByEmail(r.Context(), email); err == nil {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"email": []string{"A user is already registered with this e-mail address."}})
		return
	} else if !errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	id, err := h.repo.CreateUser(r.Context(), CreateUserInput{
		Name:     body.Name,
		Email:    email,
		Password: &body.Password1,
	})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	u, err := h.repo.UserByID(r.Context(), id)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	h.issueTokensStatus(w, http.StatusCreated, u.dto())
}

// Logout godoc
// @Summary      Log out
// @Description  Stateless under JWT; always succeeds.
// @Tags         auth
// @Produce      json
// @Success      200  {object}  object
// @Router       /api/auth/logout/ [post]
func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"detail": "Successfully logged out."})
}

// TokenRefresh godoc
// @Summary      Refresh access token
// @Description  Exchanges a refresh token for a new access/refresh pair.
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body  object  true  "{refresh}"
// @Success      200   {object}  object
// @Failure      400   {object}  httpx.Error
// @Failure      401   {object}  httpx.Error
// @Failure      500   {object}  httpx.Error
// @Router       /api/auth/token/refresh/ [post]
func (h *Handler) TokenRefresh(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Refresh string `json:"refresh"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid JSON.")
		return
	}
	userID, err := auth.ParseRefreshToken(body.Refresh, h.secret)
	if err != nil {
		httpx.WriteError(w, http.StatusUnauthorized, "Token is invalid or expired")
		return
	}
	u, err := h.repo.UserByID(r.Context(), userID)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteError(w, http.StatusUnauthorized, "User not found")
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	if !u.IsActive {
		httpx.WriteError(w, http.StatusUnauthorized, "User is inactive")
		return
	}
	access, refresh, err := auth.IssueTokens(h.secret, u.ID, h.accessTTL, h.refreshTTL)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"access": access, "refresh": refresh})
}

// TokenVerify godoc
// @Summary      Verify access token
// @Description  Checks that an access token is valid.
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body  object  true  "{token}"
// @Success      200   {object}  object
// @Failure      400   {object}  httpx.Error
// @Failure      401   {object}  httpx.Error
// @Router       /api/auth/token/verify/ [post]
func (h *Handler) TokenVerify(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid JSON.")
		return
	}
	if _, err := auth.ParseAccessToken(body.Token, h.secret); err != nil {
		httpx.WriteError(w, http.StatusUnauthorized, "Token is invalid or expired")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{})
}

// GetUser godoc
// @Summary      Get current user
// @Description  Returns the authenticated user (also served at GET /api/users/me/).
// @Tags         auth
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  accounts.User
// @Failure      401  {object}  httpx.Error
// @Failure      500  {object}  httpx.Error
// @Router       /api/auth/user/ [get]
func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
	p, err := auth.Require(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusUnauthorized, "Authentication credentials were not provided.")
		return
	}
	u, err := h.repo.UserByID(r.Context(), p.UserID)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteError(w, http.StatusUnauthorized, "Authentication credentials were not provided.")
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, u.dto())
}

// PatchUser godoc
// @Summary      Update current user
// @Description  Updates the authenticated user's own profile (name/phone/image).
// @Tags         auth
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  accounts.UpdateUserInput  true  "Fields to update"
// @Success      200   {object}  accounts.User
// @Failure      400   {object}  httpx.Error
// @Failure      401   {object}  httpx.Error
// @Failure      404   {object}  httpx.Error
// @Failure      500   {object}  httpx.Error
// @Router       /api/auth/user/ [patch]
func (h *Handler) PatchUser(w http.ResponseWriter, r *http.Request) {
	p, err := auth.Require(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusUnauthorized, "Authentication credentials were not provided.")
		return
	}
	var body struct {
		Name  *string         `json:"name"`
		Phone json.RawMessage `json:"phone"`
		Image json.RawMessage `json:"image"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid JSON.")
		return
	}
	in := UpdateUserInput{Name: body.Name}
	if body.Phone != nil {
		in.PhoneSet = true
		if s, ok := decodeNullableString(body.Phone); ok {
			in.Phone = &s
		}
	}
	if body.Image != nil {
		in.ImageSet = true
		if s, ok := decodeNullableString(body.Image); ok {
			in.Image = &s
		}
	}
	u, err := h.repo.UpdateUser(r.Context(), p.UserID, in)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteError(w, http.StatusNotFound, "Not found.")
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, u)
}

// decodeNullableString returns ("", false) for JSON null and (s, true) for a string.
func decodeNullableString(raw json.RawMessage) (string, bool) {
	if string(raw) == "null" {
		return "", false
	}
	var s string
	if err := json.Unmarshal(raw, &s); err != nil {
		return "", false
	}
	return s, true
}

// MyPermissions godoc
// @Summary      Get my permissions
// @Description  Returns the authenticated user's effective permission summary.
// @Tags         users
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  accounts.PermissionSummary
// @Failure      401  {object}  httpx.Error
// @Failure      500  {object}  httpx.Error
// @Router       /api/users/permissions/ [get]
func (h *Handler) MyPermissions(w http.ResponseWriter, r *http.Request) {
	p, err := auth.Require(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusUnauthorized, "Authentication credentials were not provided.")
		return
	}
	summary, err := h.repo.PermissionSummary(r.Context(), p)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, summary)
}

// ── admin user endpoints ───────────────────────────────────────────────────

// ListUsers godoc
// @Summary      List users
// @Description  Returns a paginated list of users (admin).
// @Tags         users
// @Produce      json
// @Security     BearerAuth
// @Param        page           query  int     false  "Page number"
// @Param        search         query  string  false  "Search term"
// @Param        emailVerified  query  string  false  "Filter by email verification"
// @Param        isAdmin        query  string  false  "Filter by admin status"
// @Param        role           query  string  false  "Filter by role"
// @Success      200            {object}  object
// @Failure      401            {object}  httpx.Error
// @Failure      403            {object}  httpx.Error
// @Failure      500            {object}  httpx.Error
// @Router       /api/users/ [get]
func (h *Handler) ListUsers(w http.ResponseWriter, r *http.Request) {
	if h.requirePerm(w, r, "user", "read") == nil {
		return
	}
	q := r.URL.Query()
	page := 1
	if v := q.Get("page"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			page = n
		}
	}
	count, users, err := h.repo.ListUsers(r.Context(), UserFilter{
		Search:        q.Get("search"),
		EmailVerified: q.Get("emailVerified"),
		IsAdmin:       q.Get("isAdmin"),
		Role:          q.Get("role"),
		Page:          page,
	})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"count": count, "results": users})
}

// CreateUser godoc
// @Summary      Create a user
// @Description  Creates a new user (admin).
// @Tags         users
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  accounts.CreateUserInput  true  "User to create"
// @Success      201   {object}  accounts.User
// @Failure      400   {object}  object
// @Failure      401   {object}  httpx.Error
// @Failure      403   {object}  httpx.Error
// @Failure      500   {object}  httpx.Error
// @Router       /api/users/ [post]
func (h *Handler) CreateUser(w http.ResponseWriter, r *http.Request) {
	if h.requirePerm(w, r, "user", "create") == nil {
		return
	}
	var body struct {
		Name          string  `json:"name"`
		Email         string  `json:"email"`
		Phone         *string `json:"phone"`
		Password      *string `json:"password"`
		EmailVerified bool    `json:"emailVerified"`
		IsAdmin       bool    `json:"isAdmin"`
		RoleID        *string `json:"roleId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid JSON.")
		return
	}
	email := strings.ToLower(strings.TrimSpace(body.Email))
	if _, err := h.repo.UserByEmail(r.Context(), email); err == nil {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"email": []string{"A user with this email already exists."}})
		return
	} else if !errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	id, err := h.repo.CreateUser(r.Context(), CreateUserInput{
		Name:          body.Name,
		Email:         email,
		Phone:         body.Phone,
		Password:      body.Password,
		EmailVerified: body.EmailVerified,
		IsAdmin:       body.IsAdmin,
		RoleID:        body.RoleID,
	})
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	u, err := h.repo.UserByID(r.Context(), id)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, u.dto())
}

// GetUserByID godoc
// @Summary      Get a user
// @Description  Returns a single user by id (admin/self only).
// @Tags         users
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  string  true  "User id"
// @Success      200  {object}  accounts.User
// @Failure      401  {object}  httpx.Error
// @Failure      403  {object}  httpx.Error
// @Failure      404  {object}  httpx.Error
// @Failure      500  {object}  httpx.Error
// @Router       /api/users/{id}/ [get]
func (h *Handler) GetUserByID(w http.ResponseWriter, r *http.Request) {
	p := h.requirePerm(w, r, "user", "read")
	if p == nil {
		return
	}
	id := chi.URLParam(r, "id")
	ok, err := h.canAccessUser(r.Context(), p, id)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	if !ok {
		httpx.WriteError(w, http.StatusForbidden, "You cannot access this user.")
		return
	}
	u, err := h.repo.UserByID(r.Context(), id)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteError(w, http.StatusNotFound, "Not found.")
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, u.dto())
}

// UpdateUser godoc
// @Summary      Update a user
// @Description  Updates a user by id (admin).
// @Tags         users
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path  string  true  "User id"
// @Param        body  body  accounts.UpdateUserInput  true  "Fields to update"
// @Success      200   {object}  accounts.User
// @Failure      400   {object}  httpx.Error
// @Failure      401   {object}  httpx.Error
// @Failure      403   {object}  httpx.Error
// @Failure      404   {object}  httpx.Error
// @Failure      500   {object}  httpx.Error
// @Router       /api/users/{id}/ [patch]
func (h *Handler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	if h.requirePerm(w, r, "user", "update") == nil {
		return
	}
	id := chi.URLParam(r, "id")
	var body struct {
		Name          *string         `json:"name"`
		Email         *string         `json:"email"`
		Phone         json.RawMessage `json:"phone"`
		Image         json.RawMessage `json:"image"`
		EmailVerified *bool           `json:"emailVerified"`
		IsAdmin       *bool           `json:"isAdmin"`
		RoleID        json.RawMessage `json:"roleId"`
		Password      *string         `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid JSON.")
		return
	}
	in := UpdateUserInput{
		Name:          body.Name,
		Email:         body.Email,
		EmailVerified: body.EmailVerified,
		IsAdmin:       body.IsAdmin,
		Password:      body.Password,
	}
	if body.Phone != nil {
		in.PhoneSet = true
		if s, ok := decodeNullableString(body.Phone); ok {
			in.Phone = &s
		}
	}
	if body.Image != nil {
		in.ImageSet = true
		if s, ok := decodeNullableString(body.Image); ok {
			in.Image = &s
		}
	}
	if body.RoleID != nil {
		in.RoleSet = true
		if s, ok := decodeNullableString(body.RoleID); ok {
			in.RoleID = &s
		}
	}
	u, err := h.repo.UpdateUser(r.Context(), id, in)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteError(w, http.StatusNotFound, "Not found.")
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, u)
}

// DeleteUser godoc
// @Summary      Delete a user
// @Description  Deletes a user by id (admin).
// @Tags         users
// @Security     BearerAuth
// @Param        id  path  string  true  "User id"
// @Success      204  "No Content"
// @Failure      401  {object}  httpx.Error
// @Failure      403  {object}  httpx.Error
// @Failure      404  {object}  httpx.Error
// @Failure      500  {object}  httpx.Error
// @Router       /api/users/{id}/ [delete]
func (h *Handler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	if h.requirePerm(w, r, "user", "delete") == nil {
		return
	}
	err := h.repo.DeleteUser(r.Context(), chi.URLParam(r, "id"))
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteError(w, http.StatusNotFound, "Not found.")
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ── role endpoints ─────────────────────────────────────────────────────────

// ListRoles godoc
// @Summary      List roles
// @Description  Returns all roles (admin).
// @Tags         roles
// @Produce      json
// @Security     BearerAuth
// @Success      200  {array}  accounts.Role
// @Failure      401  {object}  httpx.Error
// @Failure      403  {object}  httpx.Error
// @Failure      500  {object}  httpx.Error
// @Router       /api/roles/ [get]
func (h *Handler) ListRoles(w http.ResponseWriter, r *http.Request) {
	if h.requirePerm(w, r, "role", "read") == nil {
		return
	}
	roles, err := h.repo.ListRoles(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, roles)
}

// GetRole godoc
// @Summary      Get a role
// @Description  Returns a single role by id (admin).
// @Tags         roles
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  string  true  "Role id"
// @Success      200  {object}  accounts.Role
// @Failure      401  {object}  httpx.Error
// @Failure      403  {object}  httpx.Error
// @Failure      404  {object}  httpx.Error
// @Failure      500  {object}  httpx.Error
// @Router       /api/roles/{id}/ [get]
func (h *Handler) GetRole(w http.ResponseWriter, r *http.Request) {
	if h.requirePerm(w, r, "role", "read") == nil {
		return
	}
	role, err := h.repo.RoleByID(r.Context(), chi.URLParam(r, "id"))
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteError(w, http.StatusNotFound, "Not found.")
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, role)
}

// CreateRole godoc
// @Summary      Create a role
// @Description  Creates a new role (admin).
// @Tags         roles
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  accounts.RoleInput  true  "Role to create"
// @Success      201   {object}  accounts.Role
// @Failure      400   {object}  httpx.Error
// @Failure      401   {object}  httpx.Error
// @Failure      403   {object}  httpx.Error
// @Failure      500   {object}  httpx.Error
// @Router       /api/roles/ [post]
func (h *Handler) CreateRole(w http.ResponseWriter, r *http.Request) {
	if h.requirePerm(w, r, "role", "create") == nil {
		return
	}
	var in RoleInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid JSON.")
		return
	}
	role, err := h.repo.CreateRole(r.Context(), in)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, role)
}

// UpdateRole godoc
// @Summary      Update a role
// @Description  Updates a role by id (admin).
// @Tags         roles
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path  string  true  "Role id"
// @Param        body  body  accounts.RoleInput  true  "Fields to update"
// @Success      200   {object}  accounts.Role
// @Failure      400   {object}  httpx.Error
// @Failure      401   {object}  httpx.Error
// @Failure      403   {object}  httpx.Error
// @Failure      404   {object}  httpx.Error
// @Failure      500   {object}  httpx.Error
// @Router       /api/roles/{id}/ [patch]
func (h *Handler) UpdateRole(w http.ResponseWriter, r *http.Request) {
	if h.requirePerm(w, r, "role", "update") == nil {
		return
	}
	var in RoleInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid JSON.")
		return
	}
	in.SyncPermission = true
	role, err := h.repo.UpdateRole(r.Context(), chi.URLParam(r, "id"), in)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteError(w, http.StatusNotFound, "Not found.")
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, role)
}

// DeleteRole godoc
// @Summary      Delete a role
// @Description  Deletes a role by id (admin). System roles and assigned roles are rejected.
// @Tags         roles
// @Security     BearerAuth
// @Param        id  path  string  true  "Role id"
// @Success      204  "No Content"
// @Failure      400  {object}  httpx.Error
// @Failure      401  {object}  httpx.Error
// @Failure      403  {object}  httpx.Error
// @Failure      404  {object}  httpx.Error
// @Failure      500  {object}  httpx.Error
// @Router       /api/roles/{id}/ [delete]
func (h *Handler) DeleteRole(w http.ResponseWriter, r *http.Request) {
	if h.requirePerm(w, r, "role", "delete") == nil {
		return
	}
	id := chi.URLParam(r, "id")
	isSystem, assigned, err := h.repo.RoleDeleteGuard(r.Context(), id)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteError(w, http.StatusNotFound, "Not found.")
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	if isSystem {
		httpx.WriteError(w, http.StatusBadRequest, "Cannot delete system roles.")
		return
	}
	if assigned > 0 {
		httpx.WriteError(w, http.StatusBadRequest, "Cannot delete role. It is currently assigned to "+strconv.Itoa(assigned)+" admin(s).")
		return
	}
	if err := h.repo.DeleteRole(r.Context(), id); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ── permission endpoints ───────────────────────────────────────────────────

// ListPermissions godoc
// @Summary      List permissions
// @Description  Returns all permissions (admin).
// @Tags         permissions
// @Produce      json
// @Security     BearerAuth
// @Success      200  {array}  accounts.Permission
// @Failure      401  {object}  httpx.Error
// @Failure      403  {object}  httpx.Error
// @Failure      500  {object}  httpx.Error
// @Router       /api/permissions/ [get]
func (h *Handler) ListPermissions(w http.ResponseWriter, r *http.Request) {
	if h.requirePerm(w, r, "permission", "read") == nil {
		return
	}
	perms, err := h.repo.ListPermissions(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, perms)
}

// GetPermission godoc
// @Summary      Get a permission
// @Description  Returns a single permission by id (admin).
// @Tags         permissions
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  string  true  "Permission id"
// @Success      200  {object}  accounts.Permission
// @Failure      401  {object}  httpx.Error
// @Failure      403  {object}  httpx.Error
// @Failure      404  {object}  httpx.Error
// @Failure      500  {object}  httpx.Error
// @Router       /api/permissions/{id}/ [get]
func (h *Handler) GetPermission(w http.ResponseWriter, r *http.Request) {
	if h.requirePerm(w, r, "permission", "read") == nil {
		return
	}
	perm, err := h.repo.PermissionByID(r.Context(), chi.URLParam(r, "id"))
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteError(w, http.StatusNotFound, "Not found.")
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, perm)
}

// CreatePermission godoc
// @Summary      Create a permission
// @Description  Creates a new permission (admin).
// @Tags         permissions
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  accounts.PermissionInput  true  "Permission to create"
// @Success      201   {object}  accounts.Permission
// @Failure      400   {object}  httpx.Error
// @Failure      401   {object}  httpx.Error
// @Failure      403   {object}  httpx.Error
// @Failure      500   {object}  httpx.Error
// @Router       /api/permissions/ [post]
func (h *Handler) CreatePermission(w http.ResponseWriter, r *http.Request) {
	if h.requirePerm(w, r, "permission", "create") == nil {
		return
	}
	var in PermissionInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid JSON.")
		return
	}
	perm, err := h.repo.CreatePermission(r.Context(), in)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, perm)
}

// UpdatePermission godoc
// @Summary      Update a permission
// @Description  Updates a permission by id (admin).
// @Tags         permissions
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path  string  true  "Permission id"
// @Param        body  body  accounts.PermissionInput  true  "Fields to update"
// @Success      200   {object}  accounts.Permission
// @Failure      400   {object}  httpx.Error
// @Failure      401   {object}  httpx.Error
// @Failure      403   {object}  httpx.Error
// @Failure      404   {object}  httpx.Error
// @Failure      500   {object}  httpx.Error
// @Router       /api/permissions/{id}/ [patch]
func (h *Handler) UpdatePermission(w http.ResponseWriter, r *http.Request) {
	if h.requirePerm(w, r, "permission", "update") == nil {
		return
	}
	var in PermissionInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid JSON.")
		return
	}
	perm, err := h.repo.UpdatePermission(r.Context(), chi.URLParam(r, "id"), in)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteError(w, http.StatusNotFound, "Not found.")
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, perm)
}

// DeletePermission godoc
// @Summary      Delete a permission
// @Description  Deletes a permission by id (admin). Assigned permissions are rejected.
// @Tags         permissions
// @Security     BearerAuth
// @Param        id  path  string  true  "Permission id"
// @Success      204  "No Content"
// @Failure      400  {object}  httpx.Error
// @Failure      401  {object}  httpx.Error
// @Failure      403  {object}  httpx.Error
// @Failure      404  {object}  httpx.Error
// @Failure      500  {object}  httpx.Error
// @Router       /api/permissions/{id}/ [delete]
func (h *Handler) DeletePermission(w http.ResponseWriter, r *http.Request) {
	if h.requirePerm(w, r, "permission", "delete") == nil {
		return
	}
	id := chi.URLParam(r, "id")
	assigned, err := h.repo.PermissionAssignments(r.Context(), id)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteError(w, http.StatusNotFound, "Not found.")
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	if assigned > 0 {
		httpx.WriteError(w, http.StatusBadRequest, "Cannot delete permission. It is currently assigned to "+strconv.Itoa(assigned)+" role(s).")
		return
	}
	if err := h.repo.DeletePermission(r.Context(), id); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			httpx.WriteError(w, http.StatusNotFound, "Not found.")
			return
		}
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ── dashboard ──────────────────────────────────────────────────────────────

// DashboardStats godoc
// @Summary      Dashboard stats
// @Description  Returns admin dashboard aggregates (total users, active subscriptions, revenue, recent users).
// @Tags         dashboard
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  object
// @Failure      401  {object}  httpx.Error
// @Failure      403  {object}  httpx.Error
// @Failure      500  {object}  httpx.Error
// @Router       /api/dashboard/stats/ [get]
func (h *Handler) DashboardStats(w http.ResponseWriter, r *http.Request) {
	p, err := auth.Require(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusUnauthorized, "Authentication credentials were not provided.")
		return
	}
	if !p.IsAdmin && !p.IsSuperuser {
		httpx.WriteError(w, http.StatusForbidden, "Forbidden")
		return
	}
	total, recent, err := h.repo.DashboardStats(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	activeSubscriptions, totalRevenue := 0, 0
	if h.billingTotals != nil {
		if subs, revenue, err := h.billingTotals(r.Context()); err == nil {
			activeSubscriptions, totalRevenue = subs, revenue
		} else {
			h.logger.Error("dashboard billing totals failed", zap.Error(err))
		}
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"totalUsers":          total,
		"activeSubscriptions": activeSubscriptions,
		"totalRevenue":        totalRevenue,
		"recentUsers":         recent,
	})
}
