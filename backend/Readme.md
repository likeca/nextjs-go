# Go Stack

```bash
┌─────────────┬────────────────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Concern     │ Choice                                     │ Why                                                                                                                                   │
├─────────────┼────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ HTTP router │ stdlib net/http ServeMux (Go 1.22+) or chi │ method+path patterns now built in; chi if you want middleware sugar                                                                   │
├─────────────┼────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ DB access   │ pgx/v5 (direct)                            │ pgx.RowToStructByName + db struct tags; sqlc can be layered on later if wanted                                                        │
├─────────────┼────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Migrations  │ golang-migrate or atlas                    │ atlas can reverse-engineer the existing Django schema — big head start                                                                │
├─────────────┼────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Auth        │ golang-jwt/jwt/v5 + x/crypto/argon2.       │                                                                                                                                       │
├─────────────┼────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Config      │ stdlib os.Getenv                           │ 12-factor, matches your DJANGO_ENVIRONMENT/.env style                                                                                 │
├─────────────┼────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Validation  │ go-playground/validator                    │                                                                                                                                       │
├─────────────┼────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Logging     │ zap                                        │ structured, JSON in prod                                                                                                              │
├─────────────┼────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Stripe      │ stripe-go (official)                       │                                                                                                                                       │
├─────────────┼────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Storage     │ aws-sdk-go-v2/service/s3                   │ R2 is S3-compatible                                                                                                                   │
├─────────────┼────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Email       │ net/smtp or Resend/SendGrid SDK            │                                                                                                                                       │
├─────────────┼────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Tests       │ stdlib httptest + testcontainers-go        │ real Postgres in tests                                                                                                                │
└─────────────┴────────────────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

# Develpment Squence

The sequence is driven by one dependency chain: **the schema is the single source of truth, everything downstream mirrors it.** So you work top-down from the database outward to the HTTP layer, and any change to a field ripples _up_ through that same chain.

## Adding a brand-new resource

**1. `db/migrations/*.sql` — define the table first**
Everything else reads from this. Create the migration pair (`make migrate-create name=add_xyz`), write the `CREATE TABLE` in `.up.sql` and the `DROP TABLE` in `.down.sql`, then `make migrate-up`.

```sql
CREATE TABLE xyz (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now ()
);
```

**2. `model.go` — mirror it as a struct**
Add the struct with the wire shape. If it's a simple flat read, add `db:"..."` tags (for `pgx.RowToStructByName`); otherwise plain `json:"..."` and plan for a positional scan.

```go
type Xyz struct {
    ID   string `db:"id" json:"id"`
    Name string `db:"name" json:"name"`
}
```

**3. `repository.go` — the glue**
Add the method to the `Store` interface, then implement it: the `SELECT` (column order matters if positional), the `Scan`, and any row→DTO mapping. This is where the schema and model get joined.

**4. `handler.go` — the HTTP endpoint**
Add the handler method: parse params → call `store.X(...)` → `httpx.WriteJSON`. Wire it into the router (routes live centrally in `internal/server/server.go`, not per-app).

**5. Verify** — `make vet`, `go test ./...`, and hit the endpoint.

## Changing an existing field

Same chain, in the same order — this is the "three-layer sync" that bites:

1. New migration to `ALTER TABLE` (add/rename column)
2. Add/rename the struct field + tag in `model.go`
3. Update the `SELECT` list **and** the matching `Scan` order in `repository.go` (this is the lockstep that sqlc would eliminate)
4. Done — handler usually doesn't change unless the wire contract changes

## Where sqlc slots in (if you adopt it)

sqlc _compresses_ steps 3 into a codegen step — but it **consumes** steps 1–2 rather than replacing them:

1. `db/migrations/*.sql` — still the schema source (point `sqlc.yaml` at it)
2. `model.go` — still the wire DTOs
3. **`queries/xyz.sql`** (new) — you write the SQL with a `-- name:` comment; run `sqlc generate` to produce `xyz.sql.go` (typed functions replacing hand-written `repository.go`)
4. `handler.go` — unchanged, just calls the generated function

So the sequence becomes: **migration → struct → query file → `sqlc generate` → handler**. The generated code replaces the manual `SELECT`/`Scan` block, but the dynamic-filter and nested-assembly logic stays hand-written.

## The one rule that keeps it all coherent

**Always start at the migration and work outward.** Writing the struct or repository first invites drift — you'll define a field in Go that doesn't exist in Postgres, or vice versa, and only find out at query time. The schema leads; everything downstream is a reflection of it.

go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest

# Project layout

```bash
myapp/
├── cmd/
│   └── api/
│       └── main.go               # entrypoint: load config, init logger, db, router, start server
├── internal/
│   ├── config/
│   │   └── config.go             # os.Getenv-based config struct
│   ├── db/
│   │   ├── migrations/           # golang-migrate .up.sql / .down.sql files
│   │   ├── queries/              # .sql files for sqlc
│   │   └── sqlc/                 # sqlc-generated Go code (gitignored or committed, your call)
│   ├── handlers/                 # HTTP handlers, grouped by resource
│   ├── middleware/               # zap request logging, recoverer, auth, etc.
│   └── server/
│       └── server.go              # Server struct holding logger, db, router
├── sqlc.yaml
├── docker-compose.yml             # postgres for local dev
├── Makefile                       # migrate up/down, sqlc generate, run, build
├── go.mod
└── .env.example
```

# Go CLI

```bash
# Initialize a new module (run once, at project start)
go mod init github.com/likeca/go

# Add a dependency (also happens automatically on first import + build)
go get github.com/go-chi/chi/v5

# Add a specific version
go get github.com/go-chi/chi/v5@v5.1.0

# Update all dependencies to latest minor/patch
go get -u ./...

# Clean up go.mod/go.sum — removes unused deps, adds missing ones
go mod tidy

# Download dependencies into local module cache
go mod download

# See the full dependency graph
go mod graph

# Verify checksums match go.sum (detect tampering)
go mod verify

# Vendor dependencies into a local /vendor folder (optional, for offline builds or strict reproducibility)
go mod vendor

# Create supper admin user
make seed-admin EMAIL=admin@example.com PASSWORD='Adm1n!2345'

```

# Go make

```bash
┌──────────────────┬─────────────────────────────────────────────────────┐
│      Target      │                       Command                       │
├──────────────────┼─────────────────────────────────────────────────────┤
│ make build       │ go build -o bin/api ./cmd/api                       │
├──────────────────┼─────────────────────────────────────────────────────┤
│ make run         │ runs the server, loading .env if present            │
├──────────────────┼─────────────────────────────────────────────────────┤
│ make seed        │ go run ./cmd/api seed (seed → Postgres)             │
├──────────────────┼─────────────────────────────────────────────────────┤
│ make seed-images │ go run ./cmd/api seed-images (discovery POI photos) │
├──────────────────┼─────────────────────────────────────────────────────┤
│ make test        │ go test ./...                                       │
├──────────────────┼─────────────────────────────────────────────────────┤
│ make vet         │ go vet ./...                                        │
├──────────────────┼─────────────────────────────────────────────────────┤
│ make fmt         │ go fmt ./...                                        │
├──────────────────┼─────────────────────────────────────────────────────┤
│ make tidy        │ go mod tidy                                         │
├──────────────────┼─────────────────────────────────────────────────────┤
│ make clean       │ rm -rf bin                                          │
└──────────────────┴─────────────────────────────────────────────────────┘
```

# Go Seed

```bash
make seed                      # seed every seed/**/*.json (upsert by id)
go run ./cmd/api seed -dry-run # preview inside a transaction (rolled back)

```

# golang-migrate

```bash
┌─────────────────────────────────┬────────────────────────────────────────────────────────────────────────┐
│             Django              │                             golang-migrate                             │
├─────────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ manage.py makemigrations        │ migrate create -ext sql -dir … -seq <name> (then edit the SQL by hand) │
├─────────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ manage.py migrate               │ migrate … up (apply all pending)                                       │
├─────────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ manage.py migrate app 0003      │ migrate … up 3 (apply up to version 3)                                 │
├─────────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ manage.py migrate app zero      │ migrate … down 1 (roll back one) / down (all)                          │
├─────────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ manage.py showmigrations        │ migrate … version (current), plus -verbose for more                    │
├─────────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ force a version without running │ migrate … force <v> (baseline an existing DB)                          │
└─────────────────────────────────┴────────────────────────────────────────────────────────────────────────┘

# 1. install the CLI
# go install github.com/golang-migrate/migrate/v4/cmd/migrate@latest
brew install golang-migrate

# 2. apply against lhchub-go
cd go
migrate -path internal/db/migrations -database "postgres://postgres:postgres@127.0.0.1:5432/lhchub-go?sslmode=disable" up

# 3. seed the demo data
make seed

# Use Makefile
migrate-create:
	migrate create -ext sql -dir internal/db/migrations -seq $(name)

migrate-up:
	migrate -path internal/db/migrations -database "$(DATABASE_URL)" up

migrate-down:
	migrate -path internal/db/migrations -database "$(DATABASE_URL)" down
```

# Swagger

```bash




```

# CLI Reference

```bash
 Prerequisites:
 - Postgres running at DATABASE_URL (config default: postgres://postgres:postgres@127.0.0.1:5432/lhchub-go; your go/.env overrides this)
 - Migrations applied if not already: make migrate-up


# Simplest (loads go/.env automatically)
cd /Users/patrickli/Workspace/LHCHub/go
make run

# Direct (no .env, uses config defaults):
cd /Users/patrickli/Workspace/LHCHub/go
go run ./cmd/api


# Related commands (same binary, via os.Args[1]):
- make seed → go run ./cmd/api seed
- make seed-images → go run ./cmd/api seed-images
- make seed-admin EMAIL=... PASSWORD=... → go run ./cmd/api seed-admin ...

make build compiles it to go/bin/api if you want a binary instead.
```
