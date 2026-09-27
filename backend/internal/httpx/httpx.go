package httpx

import (
	"encoding/json"
	"net/http"
)

// WriteJSON writes v as a JSON response with the given status code.
func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// Error matches DRF's error shape ({ "detail": "..." }).
type Error struct {
	Detail string `json:"detail"`
}

// WriteError writes a JSON error response with the given status and detail.
func WriteError(w http.ResponseWriter, status int, detail string) {
	WriteJSON(w, status, Error{Detail: detail})
}
