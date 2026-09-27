package discovery

// Item is a discover POI on the wire (mirrors Django DiscoverItemSerializer).
type Item struct {
	ID             string  `json:"id"`
	Type           string  `json:"type"`
	City           string  `json:"city"`
	Name           string  `json:"name"`
	Detail         string  `json:"detail"`
	Meta           string  `json:"meta"`
	Icon           string  `json:"icon"`
	Lat            float64 `json:"lat"`
	Lng            float64 `json:"lng"`
	ImageURL       *string `json:"imageUrl"`
	ValidStartDate *string `json:"validStartDate"`
	ValidEndDate   *string `json:"validEndDate"`
}
