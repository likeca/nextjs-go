# Go backend tasks. Entry point is cmd/api — the same binary serves the HTTP
# API on :8080 (default) and runs the seed commands.

.PHONY: help build run seed seed-images seed-admin test vet fmt tidy clean migrate-create migrate-up migrate-down

# Default target: show available targets and their parameters.
help:
	@echo "Usage: make <target> [parameters]"
	@echo ""
	@echo "Targets:"
	@echo "  build          - Compile the API server"
	@echo "  clean          - Remove bin/"
	@echo "  fmt            - Run go fmt"
	@echo "  run            - Run the API server, loading .env if present"
	@echo "  tidy           - Run go mod tidy"
	@echo "  test           - Run all tests (go test ./...)"
	@echo "  vet            - Run go vet"
	@echo "  seed                                                       - Load seed data into Postgres"
	@echo "  seed-admin email=<email> password=<password> name='admin'  - Create/update the bootstrap admin user"
	@echo "  seed-images                                                - Download discovery POI photos to mediaRoot (or R2 when configured)"
	@echo "  migrate-create name='add_users'                            - Create a new sequential migration pair (name=...) and (up + down) under internal/db/migrations."
	@echo "  migrate-up                                                 - Apply pending migrations"
	@echo "  migrate-down                                               - Roll back all migrations"

BIN := bin/api

# Load .env into the environment. A plain `. ./.env` misparses values that
# contain `&` (shell background operator) or surrounding quotes, so parse the
# file line by line and export each KEY=VALUE verbatim.
define ENV_LOAD
if [ -f .env ]; then set -a; while IFS= read -r _env_line; do case "$$_env_line" in ''|\#*) continue;; esac; _env_key="$${_env_line%%=*}"; _env_val="$${_env_line#*=}"; case "$$_env_val" in \'*\') _env_val="$${_env_val#\'}"; _env_val="$${_env_val%\'}";; \"*\") _env_val="$${_env_val#\"}"; _env_val="$${_env_val%\"}";; esac; export "$$_env_key=$$_env_val"; done < .env; set +a; fi
endef

# Compile the API server.
build:
	go build -o $(BIN) ./cmd/api

clean:
	rm -rf bin

fmt:
	go fmt ./...

run:
	@$(ENV_LOAD); go run ./cmd/api

test:
	go test ./...

tidy:
	go mod tidy

vet:
	go vet ./...

migrate-create:
	migrate create -ext sql -dir internal/db/migrations -seq $(name)

migrate-up:
	@$(ENV_LOAD); migrate -path internal/db/migrations -database "$$DATABASE_URL" up

migrate-down:
	@$(ENV_LOAD); migrate -path internal/db/migrations -database "$$DATABASE_URL" down

migrate-force:
	@$(ENV_LOAD); migrate -path internal/db/migrations -database "$$DATABASE_URL" force 1

seed:
	@$(ENV_LOAD); go run ./cmd/api seed

seed-admin:
	@$(ENV_LOAD); go run ./cmd/api seed-admin -email "$(email)" -password "$(password)" -name "$(name)"

seed-images:
	@$(ENV_LOAD); go run ./cmd/api seed-images
