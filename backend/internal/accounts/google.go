package accounts

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/likeca/lhchub/go/internal/httpx"
	"go.uber.org/zap"
)

// GoogleSignin godoc
// @Summary      Google sign-in
// @Description  Exchanges a Google authorization code for tokens, links/finds the account by email, and returns a JWT pair.
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body  object  true  "{code}"
// @Success      200   {object}  object
// @Failure      400   {object}  httpx.Error
// @Failure      500   {object}  httpx.Error
// @Router       /api/auth/google/ [post]
func (h *Handler) GoogleSignin(w http.ResponseWriter, r *http.Request) {
	if h.googleClientID == "" || h.googleClientSecret == "" {
		httpx.WriteError(w, http.StatusBadRequest, "Google sign-in is not configured.")
		return
	}
	var body struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid JSON.")
		return
	}
	if body.Code == "" {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid JSON.")
		return
	}

	tok, err := exchangeGoogleCode(r.Context(), h.googleClientID, h.googleClientSecret, h.googleCallbackURL, body.Code)
	if err != nil {
		h.logger.Error("google token exchange failed", zap.Error(err))
		httpx.WriteError(w, http.StatusBadRequest, "Invalid code")
		return
	}
	claims, err := decodeIDTokenPayload(tok.IDToken)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid token")
		return
	}
	email, _ := claims["email"].(string)
	if email == "" {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid token")
		return
	}
	name, _ := claims["name"].(string)
	if name == "" {
		name, _ = claims["email"].(string)
	}
	verified, _ := claims["email_verified"].(bool)

	email = strings.ToLower(email)
	u, err := h.repo.UserByEmail(r.Context(), email)
	if errors.Is(err, pgx.ErrNoRows) {
		id, cerr := h.repo.CreateUser(r.Context(), CreateUserInput{
			Name:          name,
			Email:         email,
			EmailVerified: verified,
		})
		if cerr != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
			return
		}
		u, err = h.repo.UserByID(r.Context(), id)
		if err != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
			return
		}
	} else if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	if !u.IsActive {
		httpx.WriteError(w, http.StatusBadRequest, "Unable to log in with provided credentials.")
		return
	}
	h.finishLogin(w, u)
}

type googleTokenResponse struct {
	AccessToken string `json:"access_token"`
	IDToken     string `json:"id_token"`
	TokenType   string `json:"token_type"`
}

// exchangeGoogleCode trades an authorization code for tokens at Google.
func exchangeGoogleCode(ctx context.Context, clientID, clientSecret, callbackURL, code string) (*googleTokenResponse, error) {
	form := url.Values{}
	form.Set("grant_type", "authorization_code")
	form.Set("code", code)
	form.Set("client_id", clientID)
	form.Set("client_secret", clientSecret)
	form.Set("redirect_uri", callbackURL)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://oauth2.googleapis.com/token", strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, errors.New("google token exchange failed: " + resp.Status)
	}
	var tr googleTokenResponse
	if err := json.Unmarshal(raw, &tr); err != nil {
		return nil, err
	}
	return &tr, nil
}

// decodeIDTokenPayload extracts claims from a Google id_token. The signature is
// not re-verified here — the token was fetched over HTTPS directly from
// Google's own token endpoint in exchange for a valid code.
func decodeIDTokenPayload(idToken string) (map[string]any, error) {
	parts := strings.Split(idToken, ".")
	if len(parts) != 3 {
		return nil, errors.New("malformed id_token")
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, err
	}
	var m map[string]any
	if err := json.Unmarshal(payload, &m); err != nil {
		return nil, err
	}
	return m, nil
}
