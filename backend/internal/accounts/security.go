package accounts

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/likeca/lhchub/go/internal/idgen"
)

// twoFactorRow is the two_factor table (Django TwoFactor model).
type twoFactorRow struct {
	ID          string `db:"id"`
	UserID      string `db:"user_id"`
	Secret      string `db:"secret"`
	BackupCodes string `db:"backup_codes"` // JSON array of strings
	Confirmed   bool   `db:"confirmed"`
}

// TwoFactorByUser fetches the (single) TOTP enrollment for a user.
func (r *Repository) TwoFactorByUser(ctx context.Context, userID string) (*twoFactorRow, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id::text, user_id::text, secret, backup_codes, confirmed FROM two_factor WHERE user_id = $1`,
		userID)
	if err != nil {
		return nil, err
	}
	tfs, err := pgx.CollectRows(rows, pgx.RowToStructByName[twoFactorRow])
	if err != nil {
		return nil, err
	}
	if len(tfs) == 0 {
		return nil, pgx.ErrNoRows
	}
	return &tfs[0], nil
}

// TwoFactorUpsert inserts or resets an unconfirmed TOTP enrollment.
func (r *Repository) TwoFactorUpsert(ctx context.Context, userID, secret, backupCodes string) error {
	var id string
	err := r.pool.QueryRow(ctx, `SELECT id::text FROM two_factor WHERE user_id = $1`, userID).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		_, err := r.pool.Exec(ctx,
			`INSERT INTO two_factor (id, user_id, secret, backup_codes, confirmed) VALUES ($1, $2, $3, $4, false)`,
			idgen.NewUUID(), userID, secret, backupCodes)
		return err
	}
	if err != nil {
		return err
	}
	_, err = r.pool.Exec(ctx,
		`UPDATE two_factor SET secret = $2, backup_codes = $3, confirmed = false WHERE id = $1`,
		id, secret, backupCodes)
	return err
}

// TwoFactorConfirm marks the enrollment confirmed and flips user.two_factor_enabled.
func (r *Repository) TwoFactorConfirm(ctx context.Context, userID string) error {
	if _, err := r.pool.Exec(ctx, `UPDATE two_factor SET confirmed = true WHERE user_id = $1`, userID); err != nil {
		return err
	}
	_, err := r.pool.Exec(ctx,
		`UPDATE "user" SET two_factor_enabled = true, updated_at = $2 WHERE id = $1`, userID, time.Now())
	return err
}

// TwoFactorSaveBackupCodes persists the (possibly consumed) backup codes.
func (r *Repository) TwoFactorSaveBackupCodes(ctx context.Context, userID, backupCodes string) error {
	_, err := r.pool.Exec(ctx, `UPDATE two_factor SET backup_codes = $2 WHERE user_id = $1`, userID, backupCodes)
	return err
}

// TwoFactorDisable removes the enrollment and flips user.two_factor_enabled off.
func (r *Repository) TwoFactorDisable(ctx context.Context, userID string) error {
	if _, err := r.pool.Exec(ctx, `DELETE FROM two_factor WHERE user_id = $1`, userID); err != nil {
		return err
	}
	_, err := r.pool.Exec(ctx,
		`UPDATE "user" SET two_factor_enabled = false, updated_at = $2 WHERE id = $1`, userID, time.Now())
	return err
}

// EmailOTPUpsert replaces any existing OTP for (email, purpose) and stores a new one.
func (r *Repository) EmailOTPUpsert(ctx context.Context, email, code, purpose string, expiresAt time.Time) error {
	if _, err := r.pool.Exec(ctx, `DELETE FROM email_otp WHERE email = $1 AND purpose = $2`, email, purpose); err != nil {
		return err
	}
	_, err := r.pool.Exec(ctx,
		`INSERT INTO email_otp (id, email, code, purpose, expires_at, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
		idgen.NewUUID(), email, code, purpose, expiresAt, time.Now())
	return err
}

// EmailOTPVerify checks a code (deleting it on success) and marks the user's
// email verified. It returns true when the code matched and was unexpired.
func (r *Repository) EmailOTPVerify(ctx context.Context, email, code, purpose string) (bool, error) {
	var id string
	err := r.pool.QueryRow(ctx,
		`SELECT id::text FROM email_otp WHERE email = $1 AND purpose = $2 AND code = $3 AND expires_at > $4`,
		email, purpose, code, time.Now()).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if _, err := r.pool.Exec(ctx, `DELETE FROM email_otp WHERE email = $1 AND purpose = $2`, email, purpose); err != nil {
		return false, err
	}
	if _, err := r.pool.Exec(ctx,
		`UPDATE "user" SET email_verified = true, updated_at = $2 WHERE LOWER(email) = LOWER($1)`,
		email, time.Now()); err != nil {
		return false, err
	}
	return true, nil
}

// emailChangeRow is the email_change_request table.
type emailChangeRow struct {
	ID        string    `db:"id"`
	UserID    string    `db:"user_id"`
	NewEmail  string    `db:"new_email"`
	Token     string    `db:"token"`
	ExpiresAt time.Time `db:"expires_at"`
}

// EmailChangeUpsert replaces any pending request for the user with a fresh one.
func (r *Repository) EmailChangeUpsert(ctx context.Context, userID, newEmail, token string, expiresAt time.Time) error {
	if _, err := r.pool.Exec(ctx, `DELETE FROM email_change_request WHERE user_id = $1`, userID); err != nil {
		return err
	}
	_, err := r.pool.Exec(ctx,
		`INSERT INTO email_change_request (id, user_id, new_email, token, expires_at, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
		idgen.NewUUID(), userID, newEmail, token, expiresAt, time.Now())
	return err
}

// EmailChangeByToken fetches a pending request by token.
func (r *Repository) EmailChangeByToken(ctx context.Context, token string) (*emailChangeRow, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id::text, user_id::text, new_email, token, expires_at FROM email_change_request WHERE token = $1`,
		token)
	if err != nil {
		return nil, err
	}
	ecs, err := pgx.CollectRows(rows, pgx.RowToStructByName[emailChangeRow])
	if err != nil {
		return nil, err
	}
	if len(ecs) == 0 {
		return nil, pgx.ErrNoRows
	}
	return &ecs[0], nil
}

// EmailChangeDelete removes a request by id.
func (r *Repository) EmailChangeDelete(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM email_change_request WHERE id = $1`, id)
	return err
}

// SetPassword stores a pre-hashed password for a user.
func (r *Repository) SetPassword(ctx context.Context, userID, passwordHash string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE "user" SET password = $2, updated_at = $3 WHERE id = $1`, userID, passwordHash, time.Now())
	return err
}

// SetEmailVerified flips a user's email_verified flag.
func (r *Repository) SetEmailVerified(ctx context.Context, userID string, verified bool) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE "user" SET email_verified = $2, updated_at = $3 WHERE id = $1`, userID, verified, time.Now())
	return err
}
