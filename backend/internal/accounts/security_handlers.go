package accounts

import (
	"crypto/rand"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/likeca/lhchub/go/internal/auth"
	"github.com/likeca/lhchub/go/internal/httpx"
	"github.com/likeca/lhchub/go/internal/mail"
	"github.com/likeca/lhchub/go/internal/totp"
)

const (
	totpIssuer       = "SaaS App"
	otpExpiryMinutes = 10
	emailChangeHours = 24
)

// finishLogin is the shared post-credential step: gate 2FA users, else issue JWTs.
func (h *Handler) finishLogin(w http.ResponseWriter, u *userRow) {
	if u.TwoFactorEnabled {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"twoFactorRequired": true,
			"preAuthToken":      auth.SignPreAuth(h.secret, u.ID),
		})
		return
	}
	h.issueTokensStatus(w, http.StatusOK, u.dto())
}

// requireUser returns the current authenticated user (401 on failure).
func (h *Handler) requireUser(w http.ResponseWriter, r *http.Request) *userRow {
	p, err := auth.Require(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusUnauthorized, "Authentication credentials were not provided.")
		return nil
	}
	u, err := h.repo.UserByID(r.Context(), p.UserID)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteError(w, http.StatusUnauthorized, "Authentication credentials were not provided.")
		return nil
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return nil
	}
	return u
}

// ─── TOTP 2FA ──────────────────────────────────────────────────────────────

// TwoFactorEnable godoc
// @Summary      Enable 2FA
// @Description  Generates a TOTP secret and backup codes for the current user.
// @Tags         auth
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  object  true  "{password}"
// @Success      200   {object}  object
// @Failure      400   {object}  object
// @Failure      401   {object}  httpx.Error
// @Failure      500   {object}  httpx.Error
// @Router       /api/auth/2fa/enable/ [post]
func (h *Handler) TwoFactorEnable(w http.ResponseWriter, r *http.Request) {
	u := h.requireUser(w, r)
	if u == nil {
		return
	}
	var body struct {
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid JSON.")
		return
	}
	if !auth.VerifyPassword(body.Password, u.Password) {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "Incorrect password"})
		return
	}
	secret, err := totp.GenerateSecret()
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	codes, err := totp.BackupCodes(10)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	codesJSON, _ := json.Marshal(codes)
	if err := h.repo.TwoFactorUpsert(r.Context(), u.ID, secret, string(codesJSON)); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"totpURI":     totp.ProvisioningURI(secret, u.Email, totpIssuer),
		"backupCodes": codes,
	})
}

// TwoFactorVerify godoc
// @Summary      Verify 2FA
// @Description  Confirms a TOTP code and activates 2FA for the current user.
// @Tags         auth
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  object  true  "{code}"
// @Success      200   {object}  object
// @Failure      400   {object}  object
// @Failure      401   {object}  httpx.Error
// @Failure      500   {object}  httpx.Error
// @Router       /api/auth/2fa/verify/ [post]
func (h *Handler) TwoFactorVerify(w http.ResponseWriter, r *http.Request) {
	u := h.requireUser(w, r)
	if u == nil {
		return
	}
	var body struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid JSON.")
		return
	}
	tf, err := h.repo.TwoFactorByUser(r.Context(), u.ID)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "Two-factor is not set up"})
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	if !totp.Verify(tf.Secret, strings.TrimSpace(body.Code)) {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid authentication code"})
		return
	}
	if !tf.Confirmed {
		if err := h.repo.TwoFactorConfirm(r.Context(), u.ID); err != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
			return
		}
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true})
}

// TwoFactorDisable godoc
// @Summary      Disable 2FA
// @Description  Disables 2FA for the current user.
// @Tags         auth
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  object  true  "{password}"
// @Success      200   {object}  object
// @Failure      400   {object}  object
// @Failure      401   {object}  httpx.Error
// @Failure      500   {object}  httpx.Error
// @Router       /api/auth/2fa/disable/ [post]
func (h *Handler) TwoFactorDisable(w http.ResponseWriter, r *http.Request) {
	u := h.requireUser(w, r)
	if u == nil {
		return
	}
	var body struct {
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid JSON.")
		return
	}
	if !auth.VerifyPassword(body.Password, u.Password) {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "Incorrect password"})
		return
	}
	if err := h.repo.TwoFactorDisable(r.Context(), u.ID); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true})
}

// TwoFactorLoginVerify godoc
// @Summary      Complete 2FA login
// @Description  Verifies a TOTP or backup code against a preAuthToken and issues JWT tokens.
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body  object  true  "{preAuthToken, code}"
// @Success      200   {object}  object
// @Failure      400   {object}  object
// @Failure      500   {object}  httpx.Error
// @Router       /api/auth/2fa/login-verify/ [post]
func (h *Handler) TwoFactorLoginVerify(w http.ResponseWriter, r *http.Request) {
	var body struct {
		PreAuthToken string `json:"preAuthToken"`
		Code         string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid JSON.")
		return
	}
	userID, ok := auth.VerifyPreAuth(h.secret, body.PreAuthToken)
	if !ok {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid or expired session"})
		return
	}
	u, err := h.repo.UserByID(r.Context(), userID)
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && !u.IsActive) {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid or expired session"})
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	tf, err := h.repo.TwoFactorByUser(r.Context(), userID)
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && !tf.Confirmed) {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid or expired session"})
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	code := strings.TrimSpace(body.Code)
	if totp.Verify(tf.Secret, code) {
		h.issueTokensStatus(w, http.StatusOK, u.dto())
		return
	}
	// fall back to a backup code (consumed on use)
	if newJSON, ok := consumeBackupCode(tf.BackupCodes, code); ok {
		if err := h.repo.TwoFactorSaveBackupCodes(r.Context(), userID, newJSON); err != nil {
			httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
			return
		}
		h.issueTokensStatus(w, http.StatusOK, u.dto())
		return
	}
	httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid authentication code"})
}

// fmtSixDigits returns a zero-padded 6-digit code (Django's randbelow(1000000)).
func fmtSixDigits() string {
	var b [4]byte
	_, _ = rand.Read(b[:])
	return fmt.Sprintf("%06d", binary.BigEndian.Uint32(b[:])%1000000)
}

// randomHex returns nBytes of random hex (Django's secrets.token_hex).
func randomHex(nBytes int) string {
	b := make([]byte, nBytes)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// consumeBackupCode removes code from the JSON-encoded backup list.
func consumeBackupCode(backupCodesJSON, code string) (string, bool) {
	var codes []string
	if err := json.Unmarshal([]byte(backupCodesJSON), &codes); err != nil {
		return backupCodesJSON, false
	}
	for i, c := range codes {
		if c == code {
			codes = append(codes[:i], codes[i+1:]...)
			newJSON, _ := json.Marshal(codes)
			return string(newJSON), true
		}
	}
	return backupCodesJSON, false
}

// ─── email OTP ─────────────────────────────────────────────────────────────

// EmailOTPSend godoc
// @Summary      Send email OTP
// @Description  Emails a one-time code for verification.
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body  object  true  "{email, type}"
// @Success      200   {object}  object
// @Failure      400   {object}  object
// @Failure      500   {object}  httpx.Error
// @Router       /api/auth/otp/send/ [post]
func (h *Handler) EmailOTPSend(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email string `json:"email"`
		Type  string `json:"type"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid JSON.")
		return
	}
	email := strings.ToLower(strings.TrimSpace(body.Email))
	if email == "" {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "Email is required"})
		return
	}
	purpose := body.Type
	if purpose == "" {
		purpose = "email-verification"
	}
	code := fmtSixDigits()
	if err := h.repo.EmailOTPUpsert(r.Context(), email, code, purpose, time.Now().Add(otpExpiryMinutes*time.Minute)); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	_ = h.mailer.Send(r.Context(), mail.Message{
		To:      email,
		Subject: "Your verification code",
		Body:    "Your verification code is " + code + ". It expires in " + strconv.Itoa(otpExpiryMinutes) + " minutes.",
	})
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true})
}

// EmailOTPVerify godoc
// @Summary      Verify email OTP
// @Description  Verifies a one-time code sent by email.
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body  object  true  "{email, otp, type}"
// @Success      200   {object}  object
// @Failure      400   {object}  object
// @Failure      500   {object}  httpx.Error
// @Router       /api/auth/otp/verify/ [post]
func (h *Handler) EmailOTPVerify(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email string `json:"email"`
		Otp   string `json:"otp"`
		Type  string `json:"type"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid JSON.")
		return
	}
	email := strings.ToLower(strings.TrimSpace(body.Email))
	otp := strings.TrimSpace(body.Otp)
	if email == "" || otp == "" {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "Email and code are required"})
		return
	}
	purpose := body.Type
	if purpose == "" {
		purpose = "email-verification"
	}
	valid, err := h.repo.EmailOTPVerify(r.Context(), email, otp, purpose)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	if !valid {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid or expired code"})
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true})
}

// ─── password change / reset ───────────────────────────────────────────────

// PasswordChange godoc
// @Summary      Change password
// @Description  Changes the current user's password.
// @Tags         auth
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  object  true  "{old_password, new_password1, new_password2}"
// @Success      200   {object}  object
// @Failure      400   {object}  object
// @Failure      401   {object}  httpx.Error
// @Failure      500   {object}  httpx.Error
// @Router       /api/auth/password/change/ [post]
func (h *Handler) PasswordChange(w http.ResponseWriter, r *http.Request) {
	u := h.requireUser(w, r)
	if u == nil {
		return
	}
	var body struct {
		OldPassword  string `json:"old_password"`
		NewPassword1 string `json:"new_password1"`
		NewPassword2 string `json:"new_password2"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid JSON.")
		return
	}
	if !auth.VerifyPassword(body.OldPassword, u.Password) {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"old_password": []string{"Invalid password."}})
		return
	}
	if body.NewPassword1 != body.NewPassword2 {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"new_password2": []string{"The two password fields didn't match."}})
		return
	}
	if len(body.NewPassword1) < 8 {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"new_password1": []string{"This password is too short. It must contain at least 8 characters."}})
		return
	}
	hash, err := auth.HashPassword(body.NewPassword1)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	if err := h.repo.SetPassword(r.Context(), u.ID, hash); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"detail": "New password has been saved."})
}

// PasswordResetRequest godoc
// @Summary      Request password reset
// @Description  Emails a password-reset link. Always returns success to avoid leaking registered emails.
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body  object  true  "{email}"
// @Success      200   {object}  object
// @Failure      400   {object}  object
// @Failure      500   {object}  httpx.Error
// @Router       /api/auth/password/reset/ [post]
func (h *Handler) PasswordResetRequest(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid JSON.")
		return
	}
	email := strings.ToLower(strings.TrimSpace(body.Email))
	if email == "" {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"email": []string{"This field is required."}})
		return
	}
	// Always return the same success to avoid leaking which emails are registered.
	u, err := h.repo.UserByEmail(r.Context(), email)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"detail": "Password reset e-mail has been sent."})
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	uid := encodeUID(u.ID)
	token := makeResetToken(h.secret, u.ID, u.Password, time.Now().Unix())
	resetURL := h.frontendURL + "/reset-password?uid=" + uid + "&token=" + token
	_ = h.mailer.Send(r.Context(), mail.Message{
		To:      u.Email,
		Subject: "Password reset",
		Body:    "Please go to the following page and choose a new password:\n\n" + resetURL,
	})
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"detail": "Password reset e-mail has been sent."})
}

// PasswordResetConfirm godoc
// @Summary      Confirm password reset
// @Description  Resets the password using a uid + token from the reset email.
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body  object  true  "{uid, token, new_password1, new_password2}"
// @Success      200   {object}  object
// @Failure      400   {object}  object
// @Failure      500   {object}  httpx.Error
// @Router       /api/auth/password/reset/confirm/ [post]
func (h *Handler) PasswordResetConfirm(w http.ResponseWriter, r *http.Request) {
	var body struct {
		UID          string `json:"uid"`
		Token        string `json:"token"`
		NewPassword1 string `json:"new_password1"`
		NewPassword2 string `json:"new_password2"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid JSON.")
		return
	}
	if body.NewPassword1 != body.NewPassword2 {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"new_password2": []string{"The two password fields didn't match."}})
		return
	}
	if len(body.NewPassword1) < 8 {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"new_password1": []string{"This password is too short. It must contain at least 8 characters."}})
		return
	}
	userID, err := decodeUID(body.UID)
	if err != nil {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"uid": []string{"Invalid value"}})
		return
	}
	u, err := h.repo.UserByID(r.Context(), userID)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"uid": []string{"Invalid value"}})
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	if !verifyResetToken(h.secret, u.ID, u.Password, body.Token, time.Now()) {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"token": []string{"Invalid value"}})
		return
	}
	hash, err := auth.HashPassword(body.NewPassword1)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	if err := h.repo.SetPassword(r.Context(), u.ID, hash); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"detail": "Password has been reset with the new password."})
}

// ─── email change ──────────────────────────────────────────────────────────

// EmailChangeRequest godoc
// @Summary      Request email change
// @Description  Emails a verification link to the new address.
// @Tags         auth
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  object  true  "{newEmail}"
// @Success      200   {object}  object
// @Failure      400   {object}  object
// @Failure      401   {object}  httpx.Error
// @Failure      500   {object}  httpx.Error
// @Router       /api/user/email-change/ [post]
func (h *Handler) EmailChangeRequest(w http.ResponseWriter, r *http.Request) {
	u := h.requireUser(w, r)
	if u == nil {
		return
	}
	var body struct {
		NewEmail string `json:"newEmail"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid JSON.")
		return
	}
	newEmail := strings.ToLower(strings.TrimSpace(body.NewEmail))
	if newEmail == "" {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "New email is required"})
		return
	}
	if newEmail == strings.ToLower(u.Email) {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "New email must be different from current email"})
		return
	}
	if _, err := h.repo.UserByEmail(r.Context(), newEmail); err == nil {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "This email is already in use"})
		return
	} else if !errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	token := randomHex(32)
	if err := h.repo.EmailChangeUpsert(r.Context(), u.ID, newEmail, token, time.Now().Add(emailChangeHours*time.Hour)); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	verifyURL := h.frontendURL + "/verify-email-change?token=" + token
	_ = h.mailer.Send(r.Context(), mail.Message{
		To:      newEmail,
		Subject: "Verify your new email address",
		Body:    "Confirm your email change by visiting: " + verifyURL,
	})
	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"message": "A verification email has been sent to your new email address.",
	})
}

// EmailChangeConfirm godoc
// @Summary      Confirm email change
// @Description  Applies a pending email change using the emailed token.
// @Tags         auth
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  object  true  "{token}"
// @Success      200   {object}  object
// @Failure      400   {object}  object
// @Failure      401   {object}  httpx.Error
// @Failure      500   {object}  httpx.Error
// @Router       /api/user/email-change/confirm/ [post]
func (h *Handler) EmailChangeConfirm(w http.ResponseWriter, r *http.Request) {
	u := h.requireUser(w, r)
	if u == nil {
		return
	}
	var body struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid JSON.")
		return
	}
	if body.Token == "" {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "Token is required"})
		return
	}
	req, err := h.repo.EmailChangeByToken(r.Context(), body.Token)
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && req.ExpiresAt.Before(time.Now())) {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid or expired token"})
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	// The confirm endpoint is authenticated; tie the request to the caller.
	if req.UserID != u.ID {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid or expired token"})
		return
	}
	if _, err := h.repo.UserByEmail(r.Context(), req.NewEmail); err == nil {
		httpx.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "This email is already in use"})
		return
	} else if !errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	if _, err := h.repo.UpdateUser(r.Context(), u.ID, UpdateUserInput{Email: &req.NewEmail}); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	if err := h.repo.SetEmailVerified(r.Context(), u.ID, true); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	if err := h.repo.EmailChangeDelete(r.Context(), req.ID); err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"success":  true,
		"message":  "Email updated successfully",
		"newEmail": req.NewEmail,
	})
}
