package marketplace

import (
	"context"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/likeca/lhchub/go/internal/idgen"
)

// cityCenters mirrors Django marketplace.serializers.CITY_CENTERS — keep the
// two lists in sync.
var cityCenters = map[string][2]float64{
	"Calgary":       {51.0447, -114.0719},
	"Markham":       {43.8561, -79.337},
	"Mississauga":   {43.589, -79.6441},
	"Montreal":      {45.5019, -73.5674},
	"Ottawa":        {45.4215, -75.6972},
	"Richmond Hill": {43.8828, -79.4403},
	"Toronto":       {43.6532, -79.3832},
	"Vancouver":     {49.2827, -123.1207},
	"Vaughan":       {43.8372, -79.5083},
}

// ProviderFilter holds the query params the provider list endpoint supports.
type ProviderFilter struct {
	City     string
	Trade    string
	Verified *bool
	MaxPrice *int
}

// JobFilter holds the query params the job list endpoint supports.
type JobFilter struct {
	Status   string
	Category string
}

// Store is the data access the marketplace handlers depend on.
type Store interface {
	Categories(ctx context.Context) ([]Category, error)
	Providers(ctx context.Context, f ProviderFilter) ([]Provider, error)
	ProviderBySlug(ctx context.Context, slug string) (*Provider, error)

	Jobs(ctx context.Context, f JobFilter) ([]Job, error)
	JobByID(ctx context.Context, id string) (*Job, error)
	CreateJob(ctx context.Context, userID string, in JobInput) (*Job, error)

	Applications(ctx context.Context, jobID string) ([]Application, error)
	Threads(ctx context.Context) ([]Thread, error)
	Transactions(ctx context.Context) ([]Transaction, error)
}

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository { return &Repository{pool: pool} }

func (r *Repository) Categories(ctx context.Context) ([]Category, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, icon, name, sub FROM marketplace_category ORDER BY sort_order, name`)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowToStructByName[Category])
}

// providerRow is the flat shape of a marketplace_provider row. Columns are
// mapped by name via pgx.RowToStructByName (db tags), so the SELECT column
// order no longer has to match the struct field order.
type providerRow struct {
	ID         string   `db:"id"`
	Slug       string   `db:"slug"`
	Name       string   `db:"name"`
	Initials   string   `db:"initials"`
	Color      string   `db:"color"`
	Trade      string   `db:"trade"`
	City       string   `db:"city"`
	Rating     float64  `db:"rating"`
	JobsCount  int      `db:"jobs_count"`
	DistanceKm int      `db:"distance_km"`
	Lat        *float64 `db:"lat"`
	Lng        *float64 `db:"lng"`
	Years      int      `db:"years"`
	Verified   bool     `db:"verified"`
	FromPrice  int      `db:"from_price"`
	About      string   `db:"about"`
}

const providerCols = `id, slug, name, initials, color, trade, city,
	rating::float8, jobs_count, distance_km, lat, lng, years, verified, from_price, about`

// providerColsAlias is providerCols qualified for use in a JOIN. Columns map to
// providerRow fields by name, so order no longer needs to match the struct.
const providerColsAlias = `p.id, p.slug, p.name, p.initials, p.color, p.trade, p.city,
	p.rating::float8, p.jobs_count, p.distance_km, p.lat, p.lng, p.years, p.verified, p.from_price, p.about`

func (r *Repository) Providers(ctx context.Context, f ProviderFilter) ([]Provider, error) {
	where, args := buildProviderWhere(f)
	q := `SELECT ` + providerCols + ` FROM marketplace_provider ` + where +
		` ORDER BY distance_km, rating DESC`
	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	providers, err := pgx.CollectRows(rows, pgx.RowToStructByName[providerRow])
	if err != nil {
		return nil, err
	}
	return r.attachReviews(ctx, providers)
}

func (r *Repository) ProviderBySlug(ctx context.Context, slug string) (*Provider, error) {
	q := `SELECT ` + providerCols + ` FROM marketplace_provider WHERE slug = $1`
	rows, err := r.pool.Query(ctx, q, slug)
	if err != nil {
		return nil, err
	}
	providers, err := pgx.CollectRows(rows, pgx.RowToStructByName[providerRow])
	if err != nil {
		return nil, err
	}
	if len(providers) == 0 {
		return nil, pgx.ErrNoRows
	}
	withReviews, err := r.attachReviews(ctx, providers)
	if err != nil {
		return nil, err
	}
	return &withReviews[0], nil
}

func (r *Repository) attachReviews(ctx context.Context, providers []providerRow) ([]Provider, error) {
	if len(providers) == 0 {
		return []Provider{}, nil
	}
	ids := make([]string, len(providers))
	for i, p := range providers {
		ids[i] = p.ID
	}
	reviews, err := r.reviewsByProvider(ctx, ids)
	if err != nil {
		return nil, err
	}
	out := make([]Provider, 0, len(providers))
	for _, p := range providers {
		out = append(out, newProvider(p, reviews[p.ID]))
	}
	return out, nil
}

// reviewsByProvider fetches reviews for a set of provider ids keyed by id.
func (r *Repository) reviewsByProvider(ctx context.Context, ids []string) (map[string][]Review, error) {
	reviews := map[string][]Review{}
	if len(ids) == 0 {
		return reviews, nil
	}
	rows, err := r.pool.Query(ctx,
		`SELECT provider_id::text, name, stars, text FROM marketplace_provider_review
		 WHERE provider_id::text = ANY($1::text[]) ORDER BY created_at DESC`, ids)
	if err != nil {
		return nil, err
	}
	// reviewRow pairs a review with its provider_id so results can be grouped.
	type reviewRow struct {
		ProviderID string `db:"provider_id"`
		Review
	}
	rows2, err := pgx.CollectRows(rows, pgx.RowToStructByName[reviewRow])
	if err != nil {
		return nil, err
	}
	for _, rv := range rows2 {
		reviews[rv.ProviderID] = append(reviews[rv.ProviderID], rv.Review)
	}
	return reviews, nil
}

// newProvider maps a provider row (+ its reviews) to the wire Provider DTO.
func newProvider(p providerRow, revs []Review) Provider {
	if revs == nil {
		revs = []Review{}
	}
	return Provider{
		ID:         p.Slug,
		Name:       p.Name,
		Initials:   p.Initials,
		Color:      p.Color,
		Trade:      p.Trade,
		City:       p.City,
		Rating:     p.Rating,
		Jobs:       p.JobsCount,
		DistanceKm: distanceKm(p.City, p.Lat, p.Lng, p.DistanceKm),
		Lat:        p.Lat,
		Lng:        p.Lng,
		Years:      p.Years,
		Verified:   p.Verified,
		From:       p.FromPrice,
		About:      p.About,
		Reviews:    revs,
	}
}

func buildProviderWhere(f ProviderFilter) (string, []any) {
	clauses := make([]string, 0, 4)
	args := make([]any, 0, 4)

	if f.City != "" {
		args = append(args, f.City)
		clauses = append(clauses, fmt.Sprintf("LOWER(city) = LOWER($%d)", len(args)))
	}
	if f.Trade != "" {
		args = append(args, "%"+f.Trade+"%")
		clauses = append(clauses, fmt.Sprintf("trade ILIKE $%d", len(args)))
	}
	if f.Verified != nil {
		args = append(args, *f.Verified)
		clauses = append(clauses, fmt.Sprintf("verified = $%d", len(args)))
	}
	if f.MaxPrice != nil {
		args = append(args, *f.MaxPrice)
		clauses = append(clauses, fmt.Sprintf("from_price < $%d", len(args)))
	}

	if len(clauses) == 0 {
		return "", args
	}
	return "WHERE " + strings.Join(clauses, " AND "), args
}

func distanceKm(city string, lat, lng *float64, stored int) int {
	center, ok := cityCenters[city]
	if !ok || lat == nil || lng == nil {
		return stored
	}
	return int(math.Round(haversineKm(*lat, *lng, center[0], center[1])))
}

func haversineKm(lat1, lng1, lat2, lng2 float64) float64 {
	const earthRadiusKm = 6371.0
	dlat := (lat2 - lat1) * math.Pi / 180
	dlng := (lng2 - lng1) * math.Pi / 180
	a := math.Sin(dlat/2)*math.Sin(dlat/2) +
		math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*
			math.Sin(dlng/2)*math.Sin(dlng/2)
	return earthRadiusKm * 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
}

const jobCols = `j.id::text, j.title, j.description, j.category, j.area, j.budget,
	j.status, p.name AS provider_name, j.applicant_count, j.note`

type jobRow struct {
	ID           string  `db:"id"`
	Title        string  `db:"title"`
	Description  string  `db:"description"`
	Category     string  `db:"category"`
	Area         string  `db:"area"`
	Budget       int     `db:"budget"`
	Status       string  `db:"status"`
	ProviderName *string `db:"provider_name"`
	Applicants   int     `db:"applicant_count"`
	Note         string  `db:"note"`
}

// newJob maps a job row to the wire Job DTO.
func newJob(j jobRow) Job {
	return Job{
		ID:          j.ID,
		Title:       j.Title,
		Description: j.Description,
		Category:    j.Category,
		Area:        j.Area,
		Budget:      j.Budget,
		Status:      j.Status,
		Provider:    j.ProviderName,
		Applicants:  j.Applicants,
		Note:        j.Note,
	}
}

func (r *Repository) Jobs(ctx context.Context, f JobFilter) ([]Job, error) {
	where, args := buildJobWhere(f)
	rows, err := r.pool.Query(ctx,
		`SELECT `+jobCols+` FROM marketplace_job j
		 LEFT JOIN marketplace_provider p ON p.id = j.provider_id `+where+
			` ORDER BY j.created_at`, args...)
	if err != nil {
		return nil, err
	}
	jr, err := pgx.CollectRows(rows, pgx.RowToStructByName[jobRow])
	if err != nil {
		return nil, err
	}
	jobs := make([]Job, 0, len(jr))
	for _, j := range jr {
		jobs = append(jobs, newJob(j))
	}
	return jobs, nil
}

func (r *Repository) JobByID(ctx context.Context, id string) (*Job, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+jobCols+` FROM marketplace_job j
		 LEFT JOIN marketplace_provider p ON p.id = j.provider_id
		 WHERE j.id = $1`, id)
	if err != nil {
		return nil, err
	}
	jr, err := pgx.CollectRows(rows, pgx.RowToStructByName[jobRow])
	if err != nil {
		return nil, err
	}
	if len(jr) == 0 {
		return nil, pgx.ErrNoRows
	}
	job := newJob(jr[0])
	return &job, nil
}

// CreateJob inserts a new OPEN job posted by userID and returns the wire DTO.
func (r *Repository) CreateJob(ctx context.Context, userID string, in JobInput) (*Job, error) {
	id := idgen.NewUUID()
	now := time.Now()
	_, err := r.pool.Exec(ctx,
		`INSERT INTO marketplace_job
			(id, title, description, category, area, budget, status, posted_by_id, applicant_count, note, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, 'OPEN', $7, 0, '', $8, $8)`,
		id, in.Title, in.Description, in.Category, in.Area, in.Budget, userID, now)
	if err != nil {
		return nil, err
	}
	return &Job{
		ID:          id,
		Title:       in.Title,
		Description: in.Description,
		Category:    in.Category,
		Area:        in.Area,
		Budget:      in.Budget,
		Status:      "OPEN",
		Provider:    nil,
		Applicants:  0,
		Note:        "",
	}, nil
}

func buildJobWhere(f JobFilter) (string, []any) {
	clauses := make([]string, 0, 2)
	args := make([]any, 0, 2)
	if f.Status != "" && f.Status != "all" {
		args = append(args, f.Status)
		clauses = append(clauses, fmt.Sprintf("j.status = $%d", len(args)))
	}
	if f.Category != "" {
		args = append(args, f.Category)
		clauses = append(clauses, fmt.Sprintf("LOWER(j.category) = LOWER($%d)", len(args)))
	}
	if len(clauses) == 0 {
		return "", args
	}
	return "WHERE " + strings.Join(clauses, " AND "), args
}

func (r *Repository) Applications(ctx context.Context, jobID string) ([]Application, error) {
	where := ""
	args := []any{}
	if jobID != "" {
		where = "WHERE ja.job_id = $1"
		args = append(args, jobID)
	}
	rows, err := r.pool.Query(ctx,
		`SELECT ja.id::text AS app_id, ja.job_id::text AS job_id, `+providerColsAlias+`, ja.price, ja.message
		 FROM marketplace_job_application ja
		 JOIN marketplace_provider p ON p.id = ja.provider_id `+where+
			` ORDER BY ja.price`, args...)
	if err != nil {
		return nil, err
	}

	// appRow joins an application with its provider. Provider columns are mapped
	// by name through the embedded providerRow; the application id is aliased to
	// app_id so it doesn't collide with the provider's id column.
	type appRow struct {
		AppID   string `db:"app_id"`
		JobID   string `db:"job_id"`
		Price   int    `db:"price"`
		Message string `db:"message"`
		providerRow
	}
	rows2, err := pgx.CollectRows(rows, pgx.RowToStructByName[appRow])
	if err != nil {
		return nil, err
	}

	// Fetch reviews once per unique provider, then assemble.
	seen := map[string]bool{}
	ids := make([]string, 0)
	for _, a := range rows2 {
		if !seen[a.ID] {
			seen[a.ID] = true
			ids = append(ids, a.ID)
		}
	}
	reviews, err := r.reviewsByProvider(ctx, ids)
	if err != nil {
		return nil, err
	}

	out := make([]Application, 0, len(rows2))
	for _, a := range rows2 {
		out = append(out, Application{
			ID:       a.AppID,
			JobID:    a.JobID,
			Provider: newProvider(a.providerRow, reviews[a.ID]),
			Price:    a.Price,
			Message:  a.Message,
		})
	}
	return out, nil
}

func (r *Repository) Threads(ctx context.Context) ([]Thread, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT t.id::text, t.slug, p.name, p.initials, p.color, t.time_label, t.unread
		 FROM marketplace_message_thread t
		 JOIN marketplace_provider p ON p.id = t.provider_id
		 ORDER BY t.created_at`)
	if err != nil {
		return nil, err
	}

	type threadRow struct {
		ID       string `db:"id"`
		Slug     string `db:"slug"`
		Name     string `db:"name"`
		Initials string `db:"initials"`
		Color    string `db:"color"`
		Time     string `db:"time_label"`
		Unread   int    `db:"unread"`
	}
	threads, err := pgx.CollectRows(rows, pgx.RowToStructByName[threadRow])
	if err != nil {
		return nil, err
	}
	if len(threads) == 0 {
		return []Thread{}, nil
	}

	// Load messages for all threads in one query, keyed by thread id.
	ids := make([]string, len(threads))
	for i, t := range threads {
		ids[i] = t.ID
	}
	mrows, err := r.pool.Query(ctx,
		`SELECT thread_id::text, sender, text, time_label
		 FROM marketplace_message
		 WHERE thread_id::text = ANY($1::text[])
		 ORDER BY created_at`, ids)
	if err != nil {
		return nil, err
	}

	type messageRow struct {
		ThreadID string `db:"thread_id"`
		Sender   string `db:"sender"`
		Text     string `db:"text"`
		Time     string `db:"time_label"`
	}
	messages, err := pgx.CollectRows(mrows, pgx.RowToStructByName[messageRow])
	if err != nil {
		return nil, err
	}
	msgs := map[string][]ThreadMessage{}
	for _, m := range messages {
		msgs[m.ThreadID] = append(msgs[m.ThreadID], ThreadMessage{
			Me:   m.Sender == "client",
			Text: m.Text,
			Time: m.Time,
		})
	}

	out := make([]Thread, 0, len(threads))
	for _, t := range threads {
		m := msgs[t.ID]
		if m == nil {
			m = []ThreadMessage{}
		}
		preview := ""
		if len(m) > 0 {
			preview = m[len(m)-1].Text
		}
		out = append(out, Thread{
			ID:       t.Slug,
			Name:     t.Name,
			Initials: t.Initials,
			Color:    t.Color,
			Preview:  preview,
			Time:     t.Time,
			Unread:   t.Unread,
			Messages: m,
		})
	}
	return out, nil
}

func (r *Repository) Transactions(ctx context.Context) ([]Transaction, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id::text, label, date_label, amount
		 FROM marketplace_wallet_transaction
		 ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowToStructByName[Transaction])
}
