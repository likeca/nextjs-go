# Seed data

These are **copies** of Django's fixture JSON (`django/*/fixtures/*.json`).
The Go `seed` subcommand reads them (`go run ./cmd/api seed`).

**Django is the source of truth** while the two backends share one Postgres —
edit seed data in `django/<app>/fixtures/*.json` and copy it here.

If you add a seed file for a model the Go `seed` doesn't recognize yet, it fails
with `unknown model "<app>.<model>"` — add that label to the `modelTable` map in
`go/internal/seed/seed.go`.
