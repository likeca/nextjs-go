package billing

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/likeca/lhchub/go/internal/auth"
	"github.com/likeca/lhchub/go/internal/httpx"
	"go.uber.org/zap"
)

// Handler serves the billing API: plan listing, the user's subscriptions and
// payments, and the Stripe checkout/portal/cancel/resume/verify/webhook flows.
// It mirrors billing/views.py + billing/webhooks.py wire contracts.
type Handler struct {
	repo          *Repository
	stripe        *Client
	frontendURL   string
	webhookSecret string
	logger        *zap.Logger
}

func NewHandler(repo *Repository, stripe *Client, frontendURL, webhookSecret string, logger *zap.Logger) *Handler {
	return &Handler{
		repo:          repo,
		stripe:        stripe,
		frontendURL:   frontendURL,
		webhookSecret: webhookSecret,
		logger:        logger,
	}
}

// RegisterRoutes wires the billing endpoints into the router.
func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Get("/api/billing/plans/", h.ListPlans)
	r.Get("/api/billing/subscriptions/", h.ListSubscriptions)
	r.Get("/api/billing/subscriptions/current/", h.CurrentSubscription)
	r.Get("/api/billing/payments/", h.ListPayments)

	r.Post("/api/billing/checkout/", h.CreateCheckoutSession)
	r.Post("/api/billing/portal/", h.CreateBillingPortalSession)
	r.Post("/api/billing/cancel/", h.CancelSubscription)
	r.Post("/api/billing/resume/", h.ResumeSubscription)
	r.Get("/api/billing/verify-session/", h.VerifyCheckoutSession)

	r.Post("/api/billing/webhook/", h.StripeWebhook)
}

// AdminTotals delegates to the repository for the admin dashboard billing
// aggregates (active subscriptions + succeeded-payment revenue).
func (h *Handler) AdminTotals(ctx context.Context) (int, int, error) {
	return h.repo.AdminTotals(ctx)
}

// requireUser returns the authenticated principal (401 on failure).
func (h *Handler) requireUser(w http.ResponseWriter, r *http.Request) *auth.Principal {
	p, err := auth.Require(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusUnauthorized, "Authentication credentials were not provided.")
		return nil
	}
	return p
}

// ListPlans godoc
// @Summary      List plans
// @Description  Returns active billing plans ordered by amount.
// @Tags         billing
// @Produce      json
// @Success      200  {array}  billing.Plan
// @Failure      500  {object}  httpx.Error
// @Router       /api/billing/plans/ [get]
func (h *Handler) ListPlans(w http.ResponseWriter, r *http.Request) {
	plans, err := h.repo.Plans(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, plans)
}

// ListSubscriptions godoc
// @Summary      List subscriptions
// @Description  Returns the current user's subscriptions.
// @Tags         billing
// @Produce      json
// @Security     BearerAuth
// @Success      200  {array}  billing.Subscription
// @Failure      401  {object}  httpx.Error
// @Failure      500  {object}  httpx.Error
// @Router       /api/billing/subscriptions/ [get]
func (h *Handler) ListSubscriptions(w http.ResponseWriter, r *http.Request) {
	p := h.requireUser(w, r)
	if p == nil {
		return
	}
	subs, err := h.repo.Subscriptions(r.Context(), p.UserID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, subs)
}

// CurrentSubscription godoc
// @Summary      Current subscription
// @Description  Returns the current user's active subscription (or null).
// @Tags         billing
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  object
// @Failure      401  {object}  httpx.Error
// @Failure      500  {object}  httpx.Error
// @Router       /api/billing/subscriptions/current/ [get]
func (h *Handler) CurrentSubscription(w http.ResponseWriter, r *http.Request) {
	p := h.requireUser(w, r)
	if p == nil {
		return
	}
	sub, err := h.repo.CurrentSubscription(r.Context(), p.UserID)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true, "subscription": nil})
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true, "subscription": sub})
}

// ListPayments godoc
// @Summary      List payments
// @Description  Returns the current user's payments.
// @Tags         billing
// @Produce      json
// @Security     BearerAuth
// @Success      200  {array}  billing.Payment
// @Failure      401  {object}  httpx.Error
// @Failure      500  {object}  httpx.Error
// @Router       /api/billing/payments/ [get]
func (h *Handler) ListPayments(w http.ResponseWriter, r *http.Request) {
	p := h.requireUser(w, r)
	if p == nil {
		return
	}
	payments, err := h.repo.Payments(r.Context(), p.UserID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, payments)
}

// CreateCheckoutSession godoc
// @Summary      Create checkout session
// @Description  Creates a Stripe Checkout session for a plan and returns its URL.
// @Tags         billing
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  object  true  "{planId}"
// @Success      200   {object}  object
// @Failure      400   {object}  object
// @Failure      401   {object}  httpx.Error
// @Failure      502   {object}  object
// @Router       /api/billing/checkout/ [post]
func (h *Handler) CreateCheckoutSession(w http.ResponseWriter, r *http.Request) {
	p := h.requireUser(w, r)
	if p == nil {
		return
	}
	var body struct {
		PlanID string `json:"planId"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if body.PlanID == "" {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid plan"})
		return
	}
	plan, err := h.repo.PlanByID(r.Context(), body.PlanID)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "Plan not available"})
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	customerID, err := h.createOrRetrieveCustomer(r.Context(), p.UserID)
	if err != nil {
		h.logger.Error("stripe checkout: customer failed", zap.Error(err))
		httpx.WriteJSON(w, http.StatusBadGateway, map[string]any{"error": "Unable to process request"})
		return
	}
	url, err := h.stripe.CreateCheckoutSession(r.Context(), customerID, plan.StripePriceID,
		h.frontendURL+"/payment/success?session_id={CHECKOUT_SESSION_ID}",
		h.frontendURL+"/payment/cancel?from=checkout",
		p.UserID, plan.ID)
	if err != nil {
		h.logger.Error("stripe checkout failed", zap.Error(err))
		httpx.WriteJSON(w, http.StatusBadGateway, map[string]any{"error": "Unable to process request"})
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"url": url})
}

// CreateBillingPortalSession godoc
// @Summary      Create billing portal session
// @Description  Creates a Stripe Billing Portal session and returns its URL.
// @Tags         billing
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  object
// @Failure      400  {object}  object
// @Failure      401  {object}  httpx.Error
// @Failure      502  {object}  object
// @Router       /api/billing/portal/ [post]
func (h *Handler) CreateBillingPortalSession(w http.ResponseWriter, r *http.Request) {
	p := h.requireUser(w, r)
	if p == nil {
		return
	}
	customerID, err := h.repo.UserStripeCustomerID(r.Context(), p.UserID)
	if err != nil || customerID == "" {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "No billing information available"})
		return
	}
	url, err := h.stripe.CreateBillingPortalSession(r.Context(), customerID, h.frontendURL+"/billing")
	if err != nil {
		h.logger.Error("stripe portal failed", zap.Error(err))
		httpx.WriteJSON(w, http.StatusBadGateway, map[string]any{"error": "Unable to access billing portal"})
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"url": url})
}

// CancelSubscription godoc
// @Summary      Cancel subscription
// @Description  Schedules the current subscription to cancel at period end.
// @Tags         billing
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  object  true  "{subscriptionId}"
// @Success      200   {object}  object
// @Failure      401   {object}  httpx.Error
// @Failure      404   {object}  object
// @Failure      502   {object}  object
// @Router       /api/billing/cancel/ [post]
func (h *Handler) CancelSubscription(w http.ResponseWriter, r *http.Request) {
	h.modifySubscription(w, r, true,
		"Unable to cancel subscription", "Subscription will be canceled at the end of the period")
}

// ResumeSubscription godoc
// @Summary      Resume subscription
// @Description  Resumes a subscription scheduled to cancel.
// @Tags         billing
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  object  true  "{subscriptionId}"
// @Success      200   {object}  object
// @Failure      401   {object}  httpx.Error
// @Failure      404   {object}  object
// @Failure      502   {object}  object
// @Router       /api/billing/resume/ [post]
func (h *Handler) ResumeSubscription(w http.ResponseWriter, r *http.Request) {
	h.modifySubscription(w, r, false, "Unable to resume subscription", "Subscription resumed")
}

// modifySubscription is the shared cancel/resume body: look up the owned
// subscription, ask Stripe to flip cancel_at_period_end, then persist the flag.
func (h *Handler) modifySubscription(w http.ResponseWriter, r *http.Request, cancel bool, failMsg, okMsg string) {
	p := h.requireUser(w, r)
	if p == nil {
		return
	}
	var body struct {
		SubscriptionID string `json:"subscriptionId"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	sub, err := h.repo.SubscriptionByIDForUser(r.Context(), p.UserID, body.SubscriptionID)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteJSON(w, http.StatusNotFound, map[string]any{"error": "Subscription not found"})
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	if err := h.stripe.ModifySubscription(r.Context(), sub.StripeSubscriptionID, cancel); err != nil {
		h.logger.Error("stripe modify subscription failed", zap.Error(err))
		httpx.WriteJSON(w, http.StatusBadGateway, map[string]any{"error": failMsg})
		return
	}
	if err := h.repo.SetCancelAtPeriodEnd(r.Context(), sub.ID, cancel); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": okMsg})
}

// VerifyCheckoutSession godoc
// @Summary      Verify checkout session
// @Description  Verifies a Stripe Checkout session and syncs subscription/payment rows.
// @Tags         billing
// @Produce      json
// @Security     BearerAuth
// @Param        session_id  query  string  true  "Stripe Checkout session id"
// @Success      200         {object}  object
// @Failure      400         {object}  object
// @Failure      401         {object}  httpx.Error
// @Failure      502         {object}  object
// @Router       /api/billing/verify-session/ [get]
func (h *Handler) VerifyCheckoutSession(w http.ResponseWriter, r *http.Request) {
	p := h.requireUser(w, r)
	if p == nil {
		return
	}
	sessionID := r.URL.Query().Get("session_id")
	if sessionID == "" {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "session_id is required"})
		return
	}
	checkout, err := h.stripe.RetrieveCheckoutSession(r.Context(), sessionID)
	if err != nil {
		h.logger.Error("stripe verify failed", zap.Error(err))
		httpx.WriteJSON(w, http.StatusBadGateway, map[string]any{"error": "Failed to verify checkout session"})
		return
	}
	if checkout.PaymentStatus != "paid" {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "Payment not completed"})
		return
	}

	if subID := checkout.Subscription; subID != "" {
		exists, err := h.repo.SubscriptionExistsByStripeID(r.Context(), subID)
		if err == nil && exists {
			httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true, "alreadyExists": true})
			return
		}
		sub, err := h.stripe.RetrieveSubscription(r.Context(), subID)
		if err != nil {
			h.logger.Error("stripe verify: retrieve subscription failed", zap.Error(err))
			httpx.WriteJSON(w, http.StatusBadGateway, map[string]any{"error": "Failed to verify checkout session"})
			return
		}
		h.upsertSubscription(r.Context(), sub)
	}

	if paymentIntent := checkout.PaymentIntent; paymentIntent != "" {
		currency := checkout.Currency
		if currency == "" {
			currency = "usd"
		}
		if err := h.repo.UpsertPayment(r.Context(), UpsertPaymentInput{
			StripePaymentID: paymentIntent,
			UserID:          p.UserID,
			Amount:          int(checkout.AmountTotal),
			Currency:        currency,
			Status:          "succeeded",
			Description:     "Subscription payment",
		}); err != nil {
			h.logger.Error("stripe verify: upsert payment failed", zap.Error(err))
		}
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true})
}

// createOrRetrieveCustomer returns the user's Stripe customer id, creating one
// (and persisting it) when none exists yet.
func (h *Handler) createOrRetrieveCustomer(ctx context.Context, userID string) (string, error) {
	if id, err := h.repo.UserStripeCustomerID(ctx, userID); err != nil || id != "" {
		return id, err
	}
	email, name, err := h.repo.UserEmailName(ctx, userID)
	if err != nil {
		return "", err
	}
	customerID, err := h.stripe.CreateCustomer(ctx, email, name, userID)
	if err != nil {
		return "", err
	}
	return customerID, h.repo.SetUserStripeCustomerID(ctx, userID, customerID)
}

// resolveUser mirrors billing.webhooks._resolve_user: prefer the subscription's
// metadata userId, then fall back to stripe_customer_id.
func (h *Handler) resolveUser(ctx context.Context, customerID string, metadata map[string]string) string {
	if uid := metadata["userId"]; uid != "" {
		if ok, err := h.repo.UserExists(ctx, uid); err == nil && ok {
			return uid
		}
	}
	id, err := h.repo.UserByStripeCustomerID(ctx, customerID)
	if err != nil {
		return ""
	}
	return id
}

// upsertSubscription mirrors billing.webhooks._upsert_subscription.
func (h *Handler) upsertSubscription(ctx context.Context, sub *subscriptionObject) {
	customerID := sub.Customer
	userID := h.resolveUser(ctx, customerID, sub.Metadata)
	if userID == "" {
		h.logger.Warn("webhook: no user for customer", zap.String("customer", customerID))
		return
	}
	plan, err := h.repo.PlanByStripePriceID(ctx, sub.priceID())
	if err != nil {
		h.logger.Warn("webhook: no plan for price", zap.String("price", sub.priceID()), zap.Error(err))
		return
	}
	status := sub.Status
	if status == "" {
		status = "active"
	}
	err = h.repo.UpsertSubscription(ctx, UpsertSubscriptionInput{
		StripeSubscriptionID: sub.ID,
		UserID:               userID,
		PlanID:               plan.ID,
		StripeCustomerID:     customerID,
		Status:               status,
		CurrentPeriodStart:   unixTime(sub.CurrentPeriodStart),
		CurrentPeriodEnd:     unixTime(sub.CurrentPeriodEnd),
		CancelAtPeriodEnd:    sub.CancelAtPeriodEnd,
	})
	if err != nil {
		h.logger.Error("webhook: upsert subscription failed", zap.Error(err))
	}
}

// unixTime converts a Stripe epoch-second timestamp (0 → now), matching Django's
// `_dt(ts) or timezone.now()`.
func unixTime(ts int64) time.Time {
	if ts == 0 {
		return time.Now().UTC()
	}
	return time.Unix(ts, 0).UTC()
}
