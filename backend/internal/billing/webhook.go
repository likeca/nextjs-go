package billing

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/likeca/lhchub/go/internal/httpx"
	"go.uber.org/zap"
)

// stripeEvent is the envelope Stripe sends to the webhook.
type stripeEvent struct {
	Type string `json:"type"`
	Data struct {
		Object json.RawMessage `json:"object"`
	} `json:"data"`
}

// checkoutEventSession is the checkout.session.completed object subset.
type checkoutEventSession struct {
	Subscription string `json:"subscription"`
}

// invoiceObject is the invoice.payment_succeeded object subset.
type invoiceObject struct {
	ID          string            `json:"id"`
	Customer    string            `json:"customer"`
	AmountPaid  int64             `json:"amount_paid"`
	Currency    string            `json:"currency"`
	Description string            `json:"description"`
	Metadata    map[string]string `json:"metadata"`
}

// StripeWebhook godoc
// @Summary      Stripe webhook
// @Description  Receives Stripe events and syncs subscription/payment rows.
// @Tags         billing
// @Accept       json
// @Produce      json
// @Success      200  {object}  object
// @Failure      400  {object}  httpx.Error
// @Router       /api/billing/webhook/ [post]
func (h *Handler) StripeWebhook(w http.ResponseWriter, r *http.Request) {
	payload, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}
	sigHeader := r.Header.Get("Stripe-Signature")

	if h.webhookSecret != "" {
		if err := verifyStripeSignature(h.webhookSecret, payload, sigHeader); err != nil {
			h.logger.Error("webhook signature verification failed", zap.Error(err))
			http.Error(w, "Invalid signature", http.StatusBadRequest)
			return
		}
	}

	var event stripeEvent
	if err := json.Unmarshal(payload, &event); err != nil {
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	h.handleStripeEvent(r, &event)

	httpx.WriteJSON(w, http.StatusOK, map[string]any{"received": true})
}

func (h *Handler) handleStripeEvent(r *http.Request, event *stripeEvent) {
	switch event.Type {
	case "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted":
		var sub subscriptionObject
		if json.Unmarshal(event.Data.Object, &sub) == nil {
			h.upsertSubscription(r.Context(), &sub)
		}

	case "checkout.session.completed":
		var cs checkoutEventSession
		if json.Unmarshal(event.Data.Object, &cs) == nil && cs.Subscription != "" {
			sub, err := h.stripe.RetrieveSubscription(r.Context(), cs.Subscription)
			if err != nil {
				h.logger.Error("webhook: retrieve subscription failed", zap.Error(err))
				return
			}
			h.upsertSubscription(r.Context(), sub)
		}

	case "invoice.payment_succeeded":
		var inv invoiceObject
		if json.Unmarshal(event.Data.Object, &inv) != nil {
			return
		}
		userID := h.resolveUser(r.Context(), inv.Customer, inv.Metadata)
		if userID == "" {
			return
		}
		currency := inv.Currency
		if currency == "" {
			currency = "usd"
		}
		description := inv.Description
		if description == "" {
			description = "Invoice payment"
		}
		if err := h.repo.UpsertPayment(r.Context(), UpsertPaymentInput{
			StripePaymentID: inv.ID,
			UserID:          userID,
			Amount:          int(inv.AmountPaid),
			Currency:        currency,
			Status:          "succeeded",
			Description:     description,
		}); err != nil {
			h.logger.Error("webhook: upsert payment failed", zap.Error(err))
		}
	}
}

// verifyStripeSignature validates a Stripe-Signature header (format
// "t=<ts>,v1=<hex>,v0=<hex>") against the webhook secret, mirroring
// stripe.Webhook.construct_event.
func verifyStripeSignature(secret string, payload []byte, sigHeader string) error {
	if sigHeader == "" {
		return errors.New("missing Stripe-Signature header")
	}
	var timestamp, v1, v0 string
	for _, part := range strings.Split(sigHeader, ",") {
		kv := strings.SplitN(strings.TrimSpace(part), "=", 2)
		if len(kv) != 2 {
			continue
		}
		switch kv[0] {
		case "t":
			timestamp = kv[1]
		case "v1":
			v1 = kv[1]
		case "v0":
			v0 = kv[1]
		}
	}
	sig := v1
	if sig == "" {
		sig = v0
	}
	if timestamp == "" || sig == "" {
		return errors.New("malformed Stripe-Signature header")
	}
	ts, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		return errors.New("malformed timestamp")
	}
	// Reject signatures outside the replay window (Stripe's default tolerance).
	if now := time.Now().Unix(); now-ts > 300 || ts-now > 300 {
		return errors.New("timestamp outside tolerance")
	}
	provided, err := hex.DecodeString(sig)
	if err != nil {
		return errors.New("malformed signature")
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(timestamp + "." + string(payload)))
	if !hmac.Equal(provided, mac.Sum(nil)) {
		return errors.New("signature mismatch")
	}
	return nil
}
