package marketplace

// Category mirrors Django marketplace.Category.
type Category struct {
	ID   string `db:"id" json:"id"`
	Icon string `db:"icon" json:"icon"`
	Name string `db:"name" json:"name"`
	Sub  string `db:"sub" json:"sub"`
}

// Review mirrors Django ProviderReview.
type Review struct {
	Name  string `db:"name" json:"name"`
	Stars int    `db:"stars" json:"stars"`
	Text  string `db:"text" json:"text"`
}

// Provider mirrors Django ProviderSerializer (camelCase on the wire).
type Provider struct {
	ID         string   `json:"id"` // provider slug, used in /providers/[id] routes
	Name       string   `json:"name"`
	Initials   string   `json:"initials"`
	Color      string   `json:"color"`
	Trade      string   `json:"trade"`
	City       string   `json:"city"`
	Rating     float64  `json:"rating"`
	Jobs       int      `json:"jobs"`
	DistanceKm int      `json:"distanceKm"`
	Lat        *float64 `json:"lat"`
	Lng        *float64 `json:"lng"`
	Years      int      `json:"years"`
	Verified   bool     `json:"verified"`
	From       int      `json:"from"`
	About      string   `json:"about"`
	Reviews    []Review `json:"reviews"`
}

// Job mirrors Django JobSerializer.
type Job struct {
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Category    string  `json:"category"`
	Area        string  `json:"area"`
	Budget      int     `json:"budget"`
	Status      string  `json:"status"`
	Provider    *string `json:"provider"` // provider.name, null when unassigned
	Applicants  int     `json:"applicants"`
	Note        string  `json:"note"`
}

// JobInput is the writable subset of Job (POST /api/marketplace/jobs/).
type JobInput struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Category    string `json:"category"`
	Area        string `json:"area"`
	Budget      int    `json:"budget"`
}

// Application mirrors Django JobApplicationSerializer.
type Application struct {
	ID       string   `json:"id"`
	JobID    string   `json:"jobId"`
	Provider Provider `json:"provider"`
	Price    int      `json:"price"`
	Message  string   `json:"message"`
}

// ThreadMessage mirrors Django MessageSerializer.
type ThreadMessage struct {
	Me   bool   `json:"me"`
	Text string `json:"text"`
	Time string `json:"time"`
}

// Thread mirrors Django MessageThreadSerializer.
type Thread struct {
	ID       string          `json:"id"`
	Name     string          `json:"name"`
	Initials string          `json:"initials"`
	Color    string          `json:"color"`
	Preview  string          `json:"preview"`
	Time     string          `json:"time"`
	Unread   int             `json:"unread"`
	Messages []ThreadMessage `json:"messages"`
}

// Transaction mirrors Django WalletTransactionSerializer.
type Transaction struct {
	ID     string `db:"id" json:"id"`
	Label  string `db:"label" json:"label"`
	Date   string `db:"date_label" json:"date"`
	Amount int    `db:"amount" json:"amount"`
}
