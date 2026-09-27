-- name: ScratchInsertNullable :exec
INSERT INTO "user" (id, name, email, phone, role_id) VALUES ($1, $2, $3, $4, $5);
