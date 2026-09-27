-- RBAC bootstrap: permissions and roles.
--
-- The Go backend's permission check (accounts.HasResourcePermission) bypasses for
-- superusers and for `is_admin` users whose role is named "Super Admin"; everyone
-- else needs an explicit (resource, action) row in role_permission. This migration
-- recreates the canonical Django `seed_rbac` permission matrix (8 resources × 4
-- actions, named "<resource>.<action>") so the admin UI keeps its full toggle set,
-- then creates a "Super Admin" role (full access) and an "Editor" role (blog CRUD
-- + settings read). The admin account itself is created by `seed-admin`, so no
-- credentials are baked into the schema.
--
-- IDs are fixed so the migration is deterministic and the down migration can
-- remove exactly what it created. role_permission.id is generated on the fly.
-- ── permissions (8 resources × 4 actions) ────────────────────────────────────
INSERT INTO permission (id, name, resource, action)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'user.create', 'user', 'create'),
    ('00000000-0000-0000-0000-000000000002', 'user.read', 'user', 'read'),
    ('00000000-0000-0000-0000-000000000003', 'user.update', 'user', 'update'),
    ('00000000-0000-0000-0000-000000000004', 'user.delete', 'user', 'delete'),
    ('00000000-0000-0000-0000-000000000005', 'role.create', 'role', 'create'),
    ('00000000-0000-0000-0000-000000000006', 'role.read', 'role', 'read'),
    ('00000000-0000-0000-0000-000000000007', 'role.update', 'role', 'update'),
    ('00000000-0000-0000-0000-000000000008', 'role.delete', 'role', 'delete'),
    ('00000000-0000-0000-0000-000000000009', 'permission.create', 'permission', 'create'),
    ('00000000-0000-0000-0000-000000000010', 'permission.read', 'permission', 'read'),
    ('00000000-0000-0000-0000-000000000011', 'permission.update', 'permission', 'update'),
    ('00000000-0000-0000-0000-000000000012', 'permission.delete', 'permission', 'delete'),
    ('00000000-0000-0000-0000-000000000013', 'blog.create', 'blog', 'create'),
    ('00000000-0000-0000-0000-000000000014', 'blog.read', 'blog', 'read'),
    ('00000000-0000-0000-0000-000000000015', 'blog.update', 'blog', 'update'),
    ('00000000-0000-0000-0000-000000000016', 'blog.delete', 'blog', 'delete'),
    ('00000000-0000-0000-0000-000000000017', 'settings.create', 'settings', 'create'),
    ('00000000-0000-0000-0000-000000000018', 'settings.read', 'settings', 'read'),
    ('00000000-0000-0000-0000-000000000019', 'settings.update', 'settings', 'update'),
    ('00000000-0000-0000-0000-000000000020', 'settings.delete', 'settings', 'delete'),
    ('00000000-0000-0000-0000-000000000021', 'contact.create', 'contact', 'create'),
    ('00000000-0000-0000-0000-000000000022', 'contact.read', 'contact', 'read'),
    ('00000000-0000-0000-0000-000000000023', 'contact.update', 'contact', 'update'),
    ('00000000-0000-0000-0000-000000000024', 'contact.delete', 'contact', 'delete'),
    ('00000000-0000-0000-0000-000000000025', 'marketplace.create', 'marketplace', 'create'),
    ('00000000-0000-0000-0000-000000000026', 'marketplace.read', 'marketplace', 'read'),
    ('00000000-0000-0000-0000-000000000027', 'marketplace.update', 'marketplace', 'update'),
    ('00000000-0000-0000-0000-000000000028', 'marketplace.delete', 'marketplace', 'delete'),
    ('00000000-0000-0000-0000-000000000029', 'discovery.create', 'discovery', 'create'),
    ('00000000-0000-0000-0000-000000000030', 'discovery.read', 'discovery', 'read'),
    ('00000000-0000-0000-0000-000000000031', 'discovery.update', 'discovery', 'update'),
    ('00000000-0000-0000-0000-000000000032', 'discovery.delete', 'discovery', 'delete');

-- ── roles ────────────────────────────────────────────────────────────────────
INSERT INTO "role" (id, name, description, is_system)
VALUES
    ('00000000-0000-0000-0000-000000000101', 'Super Admin', 'Full access to all resources', TRUE),
    ('00000000-0000-0000-0000-000000000102', 'Editor', 'Manage blog content and settings', TRUE)
ON CONFLICT (name)
    DO NOTHING;

-- Super Admin gets every permission.
INSERT INTO role_permission (id, role_id, permission_id, created_at)
SELECT
    gen_random_uuid(),
    r.id,
    p.id,
    now()
FROM
    "role" r,
    permission p
WHERE
    r.name = 'Super Admin'
ON CONFLICT (role_id,
    permission_id)
    DO NOTHING;

-- Editor gets blog CRUD + read settings.
INSERT INTO role_permission (id, role_id, permission_id, created_at)
SELECT
    gen_random_uuid(),
    r.id,
    p.id,
    now()
FROM
    "role" r,
    permission p
WHERE
    r.name = 'Editor'
    AND (p.resource = 'blog'
        OR (p.resource = 'settings'
            AND p.action = 'read'))
ON CONFLICT (role_id,
    permission_id)
    DO NOTHING;
