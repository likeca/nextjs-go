-- name: UserByEmail :one
SELECT u.id::text, u.name, u.email, u.email_verified, u.image, u.phone,
       u.is_admin, u.role_id, COALESCE(r.name, '') AS role_name, u.stripe_customer_id,
       u.two_factor_enabled, u.is_active, u.is_superuser, u.password, u.created_at, u.updated_at
FROM "user" u
LEFT JOIN role r ON r.id = u.role_id
WHERE LOWER(u.email) = LOWER($1);

-- name: UserByID :one
SELECT u.id::text, u.name, u.email, u.email_verified, u.image, u.phone,
       u.is_admin, u.role_id, COALESCE(r.name, '') AS role_name, u.stripe_customer_id,
       u.two_factor_enabled, u.is_active, u.is_superuser, u.password, u.created_at, u.updated_at
FROM "user" u
LEFT JOIN role r ON r.id = u.role_id
WHERE u.id = $1;
