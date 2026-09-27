-- This reproduces the tables the Go code reads/writes, keyed to the column names
-- the repositories and the `seed` subcommand expect. IDs are UUIDs generated in
-- Go (see internal/idgen); timestamps are supplied by the application/seed, so
-- the NOT NULL columns below carry lightweight defaults only as a safety net.
-- No FOREIGN KEY constraints: the seed data references user/provider UUIDs that
-- aren't all present on a fresh database, and the Go queries JOIN explicitly.
-- accounts
CREATE TABLE "user" (
    id                 uuid        PRIMARY KEY,
    name               text        NOT NULL,
    email              text        NOT NULL UNIQUE,
    phone              text,
    email_verified     boolean     NOT NULL DEFAULT FALSE,
    image              text,
    is_admin           boolean     NOT NULL DEFAULT FALSE,
    role_id            uuid,
    stripe_customer_id text,
    two_factor_enabled boolean     NOT NULL DEFAULT FALSE,
    is_active          boolean     NOT NULL DEFAULT TRUE,
    is_superuser       boolean     NOT NULL DEFAULT FALSE,
    is_staff           boolean     NOT NULL DEFAULT FALSE,
    password           text        NOT NULL DEFAULT '',
    last_login         timestamptz,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "role" (
    id          uuid        PRIMARY KEY,
    name        text        NOT NULL UNIQUE,
    description text,
    is_system   boolean     NOT NULL DEFAULT FALSE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE permission (
    id          uuid        PRIMARY KEY,
    name        text        NOT NULL,
    description text,
    resource    text        NOT NULL,
    action      text        NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE role_permission (
    id            uuid        PRIMARY KEY,
    role_id       uuid        NOT NULL,
    permission_id uuid        NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (role_id, permission_id)
);

CREATE TABLE two_factor (
    id           uuid    PRIMARY KEY,
    user_id      uuid    NOT NULL UNIQUE,
    secret       text    NOT NULL,
    backup_codes text    NOT NULL,
    confirmed    boolean NOT NULL DEFAULT FALSE
);

CREATE TABLE email_otp (
    id         uuid        PRIMARY KEY,
    email      text        NOT NULL,
    code       text        NOT NULL,
    purpose    text        NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE email_change_request (
    id         uuid        PRIMARY KEY,
    user_id    uuid        NOT NULL,
    new_email  text        NOT NULL,
    token      text        NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- marketplace ─────────────────────────────────────────────────────────────
CREATE TABLE marketplace_category (
    id         uuid    PRIMARY KEY,
    icon       text    NOT NULL,
    name       text    NOT NULL,
    sub        text    NOT NULL,
    sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE marketplace_provider (
    id          uuid             PRIMARY KEY,
    slug        text             NOT NULL UNIQUE,
    name        text             NOT NULL,
    initials    text             NOT NULL,
    color       text             NOT NULL,
    trade       text             NOT NULL,
    city        text             NOT NULL,
    rating      double precision NOT NULL DEFAULT 0,
    jobs_count  integer          NOT NULL DEFAULT 0,
    distance_km integer          NOT NULL DEFAULT 0,
    lat         double precision,
    lng         double precision,
    years       integer          NOT NULL DEFAULT 0,
    verified    boolean          NOT NULL DEFAULT FALSE,
    from_price  integer          NOT NULL DEFAULT 0,
    about       text             NOT NULL,
    user_id     uuid,
    created_at  timestamptz      NOT NULL DEFAULT now(),
    updated_at  timestamptz      NOT NULL DEFAULT now()
);

CREATE TABLE marketplace_provider_review (
    id          uuid        PRIMARY KEY,
    provider_id uuid        NOT NULL,
    name        text        NOT NULL,
    stars       integer     NOT NULL DEFAULT 0,
    text        text        NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE marketplace_job (
    id              uuid        PRIMARY KEY,
    title           text        NOT NULL,
    description     text        NOT NULL,
    category        text        NOT NULL,
    area            text        NOT NULL,
    budget          integer     NOT NULL DEFAULT 0,
    status          text        NOT NULL,
    posted_by_id    uuid,
    provider_id     uuid,
    applicant_count integer     NOT NULL DEFAULT 0,
    note            text        NOT NULL DEFAULT '',
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE marketplace_job_application (
    id          uuid        PRIMARY KEY,
    job_id      uuid        NOT NULL,
    provider_id uuid        NOT NULL,
    price       integer     NOT NULL DEFAULT 0,
    message     text        NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE marketplace_message_thread (
    id          uuid        PRIMARY KEY,
    slug        text        NOT NULL UNIQUE,
    provider_id uuid        NOT NULL,
    user_id     uuid,
    time_label  text        NOT NULL,
    unread      integer     NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE marketplace_message (
    id         uuid        PRIMARY KEY,
    thread_id  uuid        NOT NULL,
    sender     text        NOT NULL,
    text       text        NOT NULL,
    time_label text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE marketplace_wallet_transaction (
    id         uuid        PRIMARY KEY,
    user_id    uuid, -- nullable: demo rows carry no user, and the repo never reads this column
    label      text        NOT NULL,
    date_label text        NOT NULL,
    amount     integer     NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- discovery
-- The four POI tables share one shape (DiscoverItemBase).
CREATE TABLE discovery_thing_to_do (
    id               uuid             PRIMARY KEY,
    city             text             NOT NULL,
    name             text             NOT NULL,
    detail           text             NOT NULL,
    meta             text             NOT NULL,
    icon             text             NOT NULL,
    image            text,
    valid_start_date date,
    valid_end_date   date,
    lat              double precision NOT NULL,
    lng              double precision NOT NULL,
    sort_order       integer          NOT NULL DEFAULT 0,
    created_at       timestamptz      NOT NULL DEFAULT now(),
    updated_at       timestamptz      NOT NULL DEFAULT now()
);

CREATE TABLE discovery_event (
    id               uuid             PRIMARY KEY,
    city             text             NOT NULL,
    name             text             NOT NULL,
    detail           text             NOT NULL,
    meta             text             NOT NULL,
    icon             text             NOT NULL,
    image            text,
    valid_start_date date,
    valid_end_date   date,
    lat              double precision NOT NULL,
    lng              double precision NOT NULL,
    sort_order       integer          NOT NULL DEFAULT 0,
    created_at       timestamptz      NOT NULL DEFAULT now(),
    updated_at       timestamptz      NOT NULL DEFAULT now()
);

CREATE TABLE discovery_promo (
    id               uuid             PRIMARY KEY,
    city             text             NOT NULL,
    name             text             NOT NULL,
    detail           text             NOT NULL,
    meta             text             NOT NULL,
    icon             text             NOT NULL,
    image            text,
    valid_start_date date,
    valid_end_date   date,
    lat              double precision NOT NULL,
    lng              double precision NOT NULL,
    sort_order       integer          NOT NULL DEFAULT 0,
    created_at       timestamptz      NOT NULL DEFAULT now(),
    updated_at       timestamptz      NOT NULL DEFAULT now()
);

CREATE TABLE discovery_news (
    id               uuid             PRIMARY KEY,
    city             text             NOT NULL,
    name             text             NOT NULL,
    detail           text             NOT NULL,
    meta             text             NOT NULL,
    icon             text             NOT NULL,
    image            text,
    valid_start_date date,
    valid_end_date   date,
    lat              double precision NOT NULL,
    lng              double precision NOT NULL,
    sort_order       integer          NOT NULL DEFAULT 0,
    created_at       timestamptz      NOT NULL DEFAULT now(),
    updated_at       timestamptz      NOT NULL DEFAULT now()
);

-- ── billing ─────────────────────────────────────────────────────────────────
CREATE TABLE plan (
    id                uuid        PRIMARY KEY,
    name              text        NOT NULL,
    description       text,
    stripe_price_id   text        NOT NULL,
    stripe_product_id text        NOT NULL,
    amount            integer     NOT NULL DEFAULT 0,
    currency          text        NOT NULL,
    "interval"        text        NOT NULL,
    features          text[]      NOT NULL DEFAULT '{}',
    is_popular        boolean     NOT NULL DEFAULT FALSE,
    is_active         boolean     NOT NULL DEFAULT FALSE,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE subscription (
    id                     uuid        PRIMARY KEY,
    user_id                uuid        NOT NULL,
    plan_id                uuid        NOT NULL,
    stripe_subscription_id text        NOT NULL UNIQUE,
    stripe_customer_id     text        NOT NULL,
    status                 text        NOT NULL,
    current_period_start   timestamptz NOT NULL,
    current_period_end     timestamptz NOT NULL,
    cancel_at_period_end   boolean     NOT NULL DEFAULT FALSE,
    created_at             timestamptz NOT NULL DEFAULT now(),
    updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payment (
    id                uuid        PRIMARY KEY,
    user_id           uuid        NOT NULL,
    stripe_payment_id text        NOT NULL UNIQUE,
    amount            integer     NOT NULL DEFAULT 0,
    currency          text        NOT NULL,
    status            text        NOT NULL,
    description       text,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ── indexes on join/lookup columns ──────────────────────────────────────────
CREATE INDEX idx_user_role_id ON "user" (role_id);

CREATE INDEX idx_provider_user_id ON marketplace_provider (user_id);

CREATE INDEX idx_provider_review_provider_id ON marketplace_provider_review (provider_id);

CREATE INDEX idx_job_provider_id ON marketplace_job (provider_id);

CREATE INDEX idx_job_posted_by_id ON marketplace_job (posted_by_id);

CREATE INDEX idx_job_application_job_id ON marketplace_job_application (job_id);

CREATE INDEX idx_job_application_provider_id ON marketplace_job_application (provider_id);

CREATE INDEX idx_message_thread_id ON marketplace_message (thread_id);

CREATE INDEX idx_message_thread_provider_id ON marketplace_message_thread (provider_id);

CREATE INDEX idx_message_thread_user_id ON marketplace_message_thread (user_id);

CREATE INDEX idx_wallet_transaction_user_id ON marketplace_wallet_transaction (user_id);

CREATE INDEX idx_subscription_user_id ON subscription (user_id);

CREATE INDEX idx_subscription_plan_id ON subscription (plan_id);

CREATE INDEX idx_payment_user_id ON payment (user_id);

CREATE INDEX idx_role_permission_permission_id ON role_permission (permission_id);

CREATE INDEX idx_email_otp_email ON email_otp (email);

CREATE INDEX idx_email_change_request_user_id ON email_change_request (user_id);
