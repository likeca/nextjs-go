package discovery

import (
	"net/http"

	"github.com/likeca/lhchub/go/internal/httpx"
)

type Handler struct {
	store Store
}

func NewHandler(store Store) *Handler { return &Handler{store: store} }

// ListItems godoc
// @Summary      List discovery items
// @Description  Returns Local Discovery POIs filtered by city and type.
// @Tags         discovery
// @Produce      json
// @Param        city  query  string  false  "City slug to filter by"
// @Param        type  query  string  false  "POI type: things_to_do|events|promos|news"
// @Success      200   {array}  discovery.Item
// @Failure      500   {object}  httpx.Error
// @Router       /api/discovery/items/ [get]
func (h *Handler) ListItems(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	items, err := h.store.Items(r.Context(), q.Get("city"), q.Get("type"))
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, items)
}
