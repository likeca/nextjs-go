package billing

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const stripeBase = "https://api.stripe.com/v1"

// Client is a minimal Stripe REST client (the subset the billing endpoints and
// webhook need). It talks to Stripe directly over HTTPS — no SDK — matching the
// project's stdlib-first approach.
type Client struct {
	secretKey string
	http      *http.Client
}

func NewClient(secretKey string) *Client {
	return &Client{secretKey: secretKey, http: &http.Client{Timeout: 15 * time.Second}}
}

// request performs a Stripe API call. method is GET/POST, body is the
// form-encoded payload (nil for GET), out is the JSON destination.
func (c *Client) request(ctx context.Context, method, path string, form url.Values, out any) error {
	var body io.Reader
	if form != nil {
		body = strings.NewReader(form.Encode())
	}
	req, err := http.NewRequestWithContext(ctx, method, stripeBase+path, body)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.secretKey)
	if form != nil {
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return &stripeError{status: resp.StatusCode, body: raw}
	}
	if out == nil {
		return nil
	}
	return json.Unmarshal(raw, out)
}

type stripeError struct {
	status int
	body   []byte
}

func (e *stripeError) Error() string {
	msg := "stripe request failed: " + http.StatusText(e.status)
	var body struct {
		Error struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if json.Unmarshal(e.body, &body) == nil && body.Error.Message != "" {
		msg = body.Error.Message
	}
	return msg
}

// CreateCustomer creates a Stripe customer and returns its id.
func (c *Client) CreateCustomer(ctx context.Context, email, name, userID string) (string, error) {
	form := url.Values{}
	form.Set("email", email)
	if name != "" {
		form.Set("name", name)
	}
	form.Set("metadata[user_id]", userID)
	var out struct {
		ID string `json:"id"`
	}
	if err := c.request(ctx, http.MethodPost, "/customers", form, &out); err != nil {
		return "", err
	}
	return out.ID, nil
}

// CreateCheckoutSession creates a subscription checkout session and returns its
// hosted URL.
func (c *Client) CreateCheckoutSession(ctx context.Context, customerID, priceID, successURL, cancelURL, userID, planID string) (string, error) {
	form := url.Values{}
	form.Set("customer", customerID)
	form.Set("mode", "subscription")
	form.Add("payment_method_types[]", "card")
	form.Add("line_items[0][price]", priceID)
	form.Add("line_items[0][quantity]", "1")
	form.Set("success_url", successURL)
	form.Set("cancel_url", cancelURL)
	form.Set("metadata[userId]", userID)
	form.Set("metadata[planId]", planID)
	var out struct {
		URL string `json:"url"`
	}
	if err := c.request(ctx, http.MethodPost, "/checkout/sessions", form, &out); err != nil {
		return "", err
	}
	return out.URL, nil
}

// CreateBillingPortalSession creates a billing portal session and returns its URL.
func (c *Client) CreateBillingPortalSession(ctx context.Context, customerID, returnURL string) (string, error) {
	form := url.Values{}
	form.Set("customer", customerID)
	form.Set("return_url", returnURL)
	var out struct {
		URL string `json:"url"`
	}
	if err := c.request(ctx, http.MethodPost, "/billing_portal/sessions", form, &out); err != nil {
		return "", err
	}
	return out.URL, nil
}

// ModifySubscription sets cancel_at_period_end on a subscription.
func (c *Client) ModifySubscription(ctx context.Context, subscriptionID string, cancelAtPeriodEnd bool) error {
	form := url.Values{}
	form.Set("cancel_at_period_end", fmt.Sprintf("%t", cancelAtPeriodEnd))
	return c.request(ctx, http.MethodPost, "/subscriptions/"+subscriptionID, form, nil)
}

// checkoutSession is the subset of Stripe's checkout session object the verify
// endpoint needs.
type checkoutSession struct {
	ID            string `json:"id"`
	PaymentStatus string `json:"payment_status"`
	Subscription  string `json:"subscription"`
	PaymentIntent string `json:"payment_intent"`
	AmountTotal   int64  `json:"amount_total"`
	Currency      string `json:"currency"`
}

// RetrieveCheckoutSession fetches a checkout session by id.
func (c *Client) RetrieveCheckoutSession(ctx context.Context, sessionID string) (*checkoutSession, error) {
	var out checkoutSession
	if err := c.request(ctx, http.MethodGet, "/checkout/sessions/"+sessionID, nil, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// subscriptionObject is the subset of Stripe's subscription object the webhook
// and verify flows need.
type subscriptionObject struct {
	ID                 string            `json:"id"`
	Customer           string            `json:"customer"`
	Status             string            `json:"status"`
	CurrentPeriodStart int64             `json:"current_period_start"`
	CurrentPeriodEnd   int64             `json:"current_period_end"`
	CancelAtPeriodEnd  bool              `json:"cancel_at_period_end"`
	Metadata           map[string]string `json:"metadata"`
	Items              struct {
		Data []struct {
			Price struct {
				ID string `json:"id"`
			} `json:"price"`
		} `json:"data"`
	} `json:"items"`
}

// RetrieveSubscription fetches a subscription by id.
func (c *Client) RetrieveSubscription(ctx context.Context, subscriptionID string) (*subscriptionObject, error) {
	var out subscriptionObject
	if err := c.request(ctx, http.MethodGet, "/subscriptions/"+subscriptionID, nil, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// priceID returns the first line item's price id (or "").
func (s *subscriptionObject) priceID() string {
	if len(s.Items.Data) > 0 {
		return s.Items.Data[0].Price.ID
	}
	return ""
}
