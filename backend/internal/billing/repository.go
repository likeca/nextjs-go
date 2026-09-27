package billing

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/likeca/lhchub/go/internal/idgen"
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository { return &Repository{pool: pool} }

// planCols selects the plan columns for a single-table plan query. `interval`
// is a reserved word, so it must be quoted.
const planCols = `id, name, description, stripe_price_id, stripe_product_id,
	amount, currency, "interval", features, is_popular, is_active, created_at, updated_at`

// planColsJoined selects the plan columns for the subscription JOIN, qualified
// and aliased. plan.id equals s.plan_id (the JOIN condition), so it is not
// selected; the plan's created_at/updated_at are aliased to avoid colliding
// with the subscription's own columns of the same name.
const planColsJoined = `p.name, p.description, p.stripe_price_id, p.stripe_product_id,
	p.amount, p.currency, p."interval", p.features, p.is_popular, p.is_active,
	p.created_at AS plan_created_at, p.updated_at AS plan_updated_at`

// subscriptionCols selects the subscription columns, qualified for the JOIN.
const subscriptionCols = `s.id::text, s.user_id::text, s.plan_id::text, s.stripe_subscription_id,
	s.stripe_customer_id, s.status, s.current_period_start, s.current_period_end, s.cancel_at_period_end,
	s.created_at, s.updated_at`

// subscriptionRow is a subscription joined with its plan. Columns are mapped by
// name (db tags); the plan's id is recovered from plan_id and its
// created_at/updated_at arrive under the plan_* aliases.
type subscriptionRow struct {
	ID                   string    `db:"id"`
	UserID               string    `db:"user_id"`
	PlanID               string    `db:"plan_id"`
	StripeSubscriptionID string    `db:"stripe_subscription_id"`
	StripeCustomerID     string    `db:"stripe_customer_id"`
	Status               string    `db:"status"`
	CurrentPeriodStart   time.Time `db:"current_period_start"`
	CurrentPeriodEnd     time.Time `db:"current_period_end"`
	CancelAtPeriodEnd    bool      `db:"cancel_at_period_end"`
	CreatedAt            time.Time `db:"created_at"`
	UpdatedAt            time.Time `db:"updated_at"`

	// joined plan columns (id omitted — equals plan_id via the JOIN condition)
	Name            string    `db:"name"`
	Description     *string   `db:"description"`
	StripePriceID   string    `db:"stripe_price_id"`
	StripeProductID string    `db:"stripe_product_id"`
	Amount          int       `db:"amount"`
	Currency        string    `db:"currency"`
	Interval        string    `db:"interval"`
	Features        []string  `db:"features"`
	IsPopular       bool      `db:"is_popular"`
	IsActive        bool      `db:"is_active"`
	PlanCreatedAt   time.Time `db:"plan_created_at"`
	PlanUpdatedAt   time.Time `db:"plan_updated_at"`
}

// newPlan normalizes a scanned plan row: an empty features array serializes as
// [] not null on the wire.
func newPlan(p Plan) Plan {
	if p.Features == nil {
		p.Features = []string{}
	}
	return p
}

// newSubscription maps a joined subscription row to the wire DTO. The plan's id
// is the same as the subscription's plan_id (the JOIN condition).
func newSubscription(s subscriptionRow) Subscription {
	plan := Plan{
		ID:              s.PlanID,
		Name:            s.Name,
		Description:     s.Description,
		StripePriceID:   s.StripePriceID,
		StripeProductID: s.StripeProductID,
		Amount:          s.Amount,
		Currency:        s.Currency,
		Interval:        s.Interval,
		Features:        s.Features,
		IsPopular:       s.IsPopular,
		IsActive:        s.IsActive,
		CreatedAt:       s.PlanCreatedAt,
		UpdatedAt:       s.PlanUpdatedAt,
	}
	if plan.Features == nil {
		plan.Features = []string{}
	}
	return Subscription{
		ID:                   s.ID,
		UserID:               s.UserID,
		PlanID:               s.PlanID,
		Plan:                 plan,
		StripeSubscriptionID: s.StripeSubscriptionID,
		StripeCustomerID:     s.StripeCustomerID,
		Status:               s.Status,
		CurrentPeriodStart:   s.CurrentPeriodStart,
		CurrentPeriodEnd:     s.CurrentPeriodEnd,
		CancelAtPeriodEnd:    s.CancelAtPeriodEnd,
		CreatedAt:            s.CreatedAt,
		UpdatedAt:            s.UpdatedAt,
	}
}

// Plans lists active plans ordered by amount (matches PlanViewSet.get_queryset).
func (r *Repository) Plans(ctx context.Context) ([]Plan, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+planCols+` FROM plan WHERE is_active = true ORDER BY amount`)
	if err != nil {
		return nil, err
	}
	plans, err := pgx.CollectRows(rows, pgx.RowToStructByName[Plan])
	if err != nil {
		return nil, err
	}
	out := make([]Plan, 0, len(plans))
	for _, p := range plans {
		out = append(out, newPlan(p))
	}
	return out, nil
}

// PlanByID fetches an active plan (nil, pgx.ErrNoRows when absent/inactive).
func (r *Repository) PlanByID(ctx context.Context, id string) (*Plan, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+planCols+` FROM plan WHERE id = $1 AND is_active = true`, id)
	if err != nil {
		return nil, err
	}
	plans, err := pgx.CollectRows(rows, pgx.RowToStructByName[Plan])
	if err != nil {
		return nil, err
	}
	if len(plans) == 0 {
		return nil, pgx.ErrNoRows
	}
	p := newPlan(plans[0])
	return &p, nil
}

// PlanByStripePriceID fetches a plan by its Stripe price id (used by the webhook).
func (r *Repository) PlanByStripePriceID(ctx context.Context, priceID string) (*Plan, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+planCols+` FROM plan WHERE stripe_price_id = $1`, priceID)
	if err != nil {
		return nil, err
	}
	plans, err := pgx.CollectRows(rows, pgx.RowToStructByName[Plan])
	if err != nil {
		return nil, err
	}
	if len(plans) == 0 {
		return nil, pgx.ErrNoRows
	}
	p := newPlan(plans[0])
	return &p, nil
}

// Subscriptions lists a user's subscriptions (newest first) with the plan joined.
func (r *Repository) Subscriptions(ctx context.Context, userID string) ([]Subscription, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+subscriptionCols+`, `+planColsJoined+`
		 FROM subscription s JOIN plan p ON p.id = s.plan_id
		 WHERE s.user_id = $1 ORDER BY s.created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	subs, err := pgx.CollectRows(rows, pgx.RowToStructByName[subscriptionRow])
	if err != nil {
		return nil, err
	}
	out := make([]Subscription, 0, len(subs))
	for _, s := range subs {
		out = append(out, newSubscription(s))
	}
	return out, nil
}

// CurrentSubscription returns the user's active/trialing subscription, or
// pgx.ErrNoRows when there is none.
func (r *Repository) CurrentSubscription(ctx context.Context, userID string) (*Subscription, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+subscriptionCols+`, `+planColsJoined+`
		 FROM subscription s JOIN plan p ON p.id = s.plan_id
		 WHERE s.user_id = $1 AND s.status IN ('active', 'trialing')
		 ORDER BY s.created_at DESC LIMIT 1`, userID)
	if err != nil {
		return nil, err
	}
	subs, err := pgx.CollectRows(rows, pgx.RowToStructByName[subscriptionRow])
	if err != nil {
		return nil, err
	}
	if len(subs) == 0 {
		return nil, pgx.ErrNoRows
	}
	s := newSubscription(subs[0])
	return &s, nil
}

// SubscriptionByIDForUser fetches one subscription owned by userID.
func (r *Repository) SubscriptionByIDForUser(ctx context.Context, userID, subID string) (*Subscription, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+subscriptionCols+`, `+planColsJoined+`
		 FROM subscription s JOIN plan p ON p.id = s.plan_id
		 WHERE s.id = $1 AND s.user_id = $2`, subID, userID)
	if err != nil {
		return nil, err
	}
	subs, err := pgx.CollectRows(rows, pgx.RowToStructByName[subscriptionRow])
	if err != nil {
		return nil, err
	}
	if len(subs) == 0 {
		return nil, pgx.ErrNoRows
	}
	s := newSubscription(subs[0])
	return &s, nil
}

// Payments lists a user's payments (newest first).
func (r *Repository) Payments(ctx context.Context, userID string) ([]Payment, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id::text, stripe_payment_id, amount, currency, status, description, created_at
		 FROM payment WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowToStructByName[Payment])
}

// SetCancelAtPeriodEnd flips the local cancel flag after a Stripe modify.
func (r *Repository) SetCancelAtPeriodEnd(ctx context.Context, subID string, val bool) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE subscription SET cancel_at_period_end = $2, updated_at = $3 WHERE id = $1`,
		subID, val, time.Now())
	return err
}

// UpsertSubscriptionInput is the resolved data for a subscription upsert
// (user and plan already looked up by the caller).
type UpsertSubscriptionInput struct {
	StripeSubscriptionID string
	UserID               string
	PlanID               string
	StripeCustomerID     string
	Status               string
	CurrentPeriodStart   time.Time
	CurrentPeriodEnd     time.Time
	CancelAtPeriodEnd    bool
}

// UpsertSubscription inserts or updates a subscription keyed on
// stripe_subscription_id (Django's update_or_create).
func (r *Repository) UpsertSubscription(ctx context.Context, in UpsertSubscriptionInput) error {
	now := time.Now()
	_, err := r.pool.Exec(ctx,
		`INSERT INTO subscription
			(id, user_id, plan_id, stripe_subscription_id, stripe_customer_id, status,
			 current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
		 ON CONFLICT (stripe_subscription_id) DO UPDATE SET
			user_id = EXCLUDED.user_id, plan_id = EXCLUDED.plan_id,
			stripe_customer_id = EXCLUDED.stripe_customer_id, status = EXCLUDED.status,
			current_period_start = EXCLUDED.current_period_start,
			current_period_end = EXCLUDED.current_period_end,
			cancel_at_period_end = EXCLUDED.cancel_at_period_end,
			updated_at = EXCLUDED.updated_at`,
		idgen.NewUUID(), in.UserID, in.PlanID, in.StripeSubscriptionID, in.StripeCustomerID,
		in.Status, in.CurrentPeriodStart, in.CurrentPeriodEnd, in.CancelAtPeriodEnd, now)
	return err
}

// SubscriptionExistsByStripeID reports whether a subscription with the given
// Stripe id is already stored.
func (r *Repository) SubscriptionExistsByStripeID(ctx context.Context, stripeSubID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM subscription WHERE stripe_subscription_id = $1)`, stripeSubID).Scan(&exists)
	return exists, err
}

// UpsertPaymentInput is the resolved data for a payment upsert.
type UpsertPaymentInput struct {
	StripePaymentID string
	UserID          string
	Amount          int
	Currency        string
	Status          string
	Description     string
}

// UpsertPayment inserts or updates a payment keyed on stripe_payment_id.
func (r *Repository) UpsertPayment(ctx context.Context, in UpsertPaymentInput) error {
	now := time.Now()
	_, err := r.pool.Exec(ctx,
		`INSERT INTO payment
			(id, user_id, stripe_payment_id, amount, currency, status, description, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
		 ON CONFLICT (stripe_payment_id) DO UPDATE SET
			user_id = EXCLUDED.user_id, amount = EXCLUDED.amount, currency = EXCLUDED.currency,
			status = EXCLUDED.status, description = EXCLUDED.description,
			updated_at = EXCLUDED.updated_at`,
		idgen.NewUUID(), in.UserID, in.StripePaymentID, in.Amount, in.Currency, in.Status, in.Description, now)
	return err
}

// AdminTotals returns the admin dashboard billing aggregates: the number of
// active subscriptions (status 'active'/'trialing') and the total revenue from
// succeeded payments, in the smallest currency unit (cents). Django's dashboard
// stub left both at zero because its billing app was disabled; Go has live
// billing, so it can report the real numbers.
func (r *Repository) AdminTotals(ctx context.Context) (activeSubscriptions, revenueCents int, err error) {
	if err := r.pool.QueryRow(ctx,
		`SELECT count(*) FROM subscription WHERE status IN ('active', 'trialing')`).
		Scan(&activeSubscriptions); err != nil {
		return 0, 0, err
	}
	if err := r.pool.QueryRow(ctx,
		`SELECT COALESCE(SUM(amount), 0) FROM payment WHERE status = 'succeeded'`).
		Scan(&revenueCents); err != nil {
		return 0, 0, err
	}
	return activeSubscriptions, revenueCents, nil
}

// UserStripeCustomerID returns the user's stored Stripe customer id ("" when none).
func (r *Repository) UserStripeCustomerID(ctx context.Context, userID string) (string, error) {
	var id *string
	err := r.pool.QueryRow(ctx, `SELECT stripe_customer_id FROM "user" WHERE id = $1`, userID).Scan(&id)
	if err != nil {
		return "", err
	}
	if id == nil {
		return "", nil
	}
	return *id, nil
}

// SetUserStripeCustomerID persists a Stripe customer id on the user.
func (r *Repository) SetUserStripeCustomerID(ctx context.Context, userID, customerID string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE "user" SET stripe_customer_id = $2, updated_at = $3 WHERE id = $1`,
		userID, customerID, time.Now())
	return err
}

// UserEmailName returns the user's email and name (for Stripe customer creation).
func (r *Repository) UserEmailName(ctx context.Context, userID string) (email, name string, err error) {
	err = r.pool.QueryRow(ctx, `SELECT email, name FROM "user" WHERE id = $1`, userID).Scan(&email, &name)
	return email, name, err
}

// UserExists reports whether a user row with the given id exists.
func (r *Repository) UserExists(ctx context.Context, userID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM "user" WHERE id = $1)`, userID).Scan(&exists)
	return exists, err
}

// UserByStripeCustomerID returns a user id by its Stripe customer id.
func (r *Repository) UserByStripeCustomerID(ctx context.Context, customerID string) (string, error) {
	var id string
	err := r.pool.QueryRow(ctx, `SELECT id::text FROM "user" WHERE stripe_customer_id = $1`, customerID).Scan(&id)
	return id, err
}
