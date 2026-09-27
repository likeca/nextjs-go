package billing

import "time"

// Plan mirrors billing.serializers.PlanSerializer (camelCase on the wire).
type Plan struct {
	ID              string    `db:"id" json:"id"`
	Name            string    `db:"name" json:"name"`
	Description     *string   `db:"description" json:"description"`
	StripePriceID   string    `db:"stripe_price_id" json:"stripePriceId"`
	StripeProductID string    `db:"stripe_product_id" json:"stripeProductId"`
	Amount          int       `db:"amount" json:"amount"`
	Currency        string    `db:"currency" json:"currency"`
	Interval        string    `db:"interval" json:"interval"`
	Features        []string  `db:"features" json:"features"`
	IsPopular       bool      `db:"is_popular" json:"isPopular"`
	IsActive        bool      `db:"is_active" json:"isActive"`
	CreatedAt       time.Time `db:"created_at" json:"createdAt"`
	UpdatedAt       time.Time `db:"updated_at" json:"updatedAt"`
}

// Subscription mirrors billing.serializers.SubscriptionSerializer.
type Subscription struct {
	ID                   string    `json:"id"`
	UserID               string    `json:"userId"`
	PlanID               string    `json:"planId"`
	Plan                 Plan      `json:"plan"`
	StripeSubscriptionID string    `json:"stripeSubscriptionId"`
	StripeCustomerID     string    `json:"stripeCustomerId"`
	Status               string    `json:"status"`
	CurrentPeriodStart   time.Time `json:"currentPeriodStart"`
	CurrentPeriodEnd     time.Time `json:"currentPeriodEnd"`
	CancelAtPeriodEnd    bool      `json:"cancelAtPeriodEnd"`
	CreatedAt            time.Time `json:"createdAt"`
	UpdatedAt            time.Time `json:"updatedAt"`
}

// Payment mirrors billing.serializers.PaymentSerializer (no userId/updatedAt).
type Payment struct {
	ID              string    `db:"id" json:"id"`
	StripePaymentID string    `db:"stripe_payment_id" json:"stripePaymentId"`
	Amount          int       `db:"amount" json:"amount"`
	Currency        string    `db:"currency" json:"currency"`
	Status          string    `db:"status" json:"status"`
	Description     *string   `db:"description" json:"description"`
	CreatedAt       time.Time `db:"created_at" json:"createdAt"`
}
