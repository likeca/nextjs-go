FROM golang:1.27-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api

FROM alpine:3
RUN apk add --no-cache ca-certificates tzdata && adduser -D -u 10001 app
WORKDIR /app
COPY --from=builder /out/api ./api
# Seed JSON is read relative to the working dir by `api seed`.
COPY --from=builder /src/seed ./seed
RUN mkdir media && chown app:app media
USER app
EXPOSE 8080
ENV PORT=8080
ENTRYPOINT ["/app/api"]
