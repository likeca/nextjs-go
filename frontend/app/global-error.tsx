"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Global error:", error)
  }, [error])

  const isDev = process.env.NODE_ENV === "development"

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Critical Error</title>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700&display=swap"
        />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily: "'Geist', system-ui, -apple-system, sans-serif",
          backgroundColor: "#fafafa",
          color: "#171717",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            gap: "24px",
            textAlign: "center",
            padding: "24px",
          }}
        >
          <h1
            style={{
              fontSize: "8rem",
              fontWeight: 700,
              lineHeight: 1,
              margin: 0,
              color: "#a3a3a3",
              letterSpacing: "-0.025em",
            }}
          >
            500
          </h1>
          <div style={{ maxWidth: "28rem" }}>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: 600,
                margin: "0 0 8px 0",
                letterSpacing: "-0.015em",
              }}
            >
              Critical Error
            </h2>
            <p style={{ color: "#737373", margin: 0, lineHeight: 1.6 }}>
              A critical error occurred that prevented the page from loading.
              Please try refreshing the page or contact support if the problem
              persists.
            </p>
            {error.digest && (
              <p
                style={{
                  color: "#a3a3a3",
                  fontSize: "0.75rem",
                  marginTop: "8px",
                }}
              >
                Error ID: {error.digest}
              </p>
            )}
          </div>

          {isDev && (
            <div
              style={{
                width: "100%",
                maxWidth: "32rem",
                borderRadius: "8px",
                border: "1px solid rgba(220, 38, 38, 0.3)",
                backgroundColor: "rgba(220, 38, 38, 0.05)",
                padding: "16px",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#dc2626",
                  marginBottom: "8px",
                }}
              >
                ⚠ Development Error Details
              </div>
              <pre
                style={{
                  fontSize: "0.75rem",
                  color: "rgba(220, 38, 38, 0.8)",
                  fontFamily: "'Geist Mono', monospace",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  margin: 0,
                  overflow: "auto",
                }}
              >
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </div>
          )}

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={reset}
              style={{
                padding: "8px 20px",
                borderRadius: "6px",
                border: "1px solid #e5e5e5",
                cursor: "pointer",
                background: "#ffffff",
                color: "#171717",
                fontSize: "0.875rem",
                fontWeight: 500,
                fontFamily: "inherit",
              }}
              aria-label="Try again to reload the page"
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "8px 20px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                background: "#171717",
                color: "#fafafa",
                fontSize: "0.875rem",
                fontWeight: 500,
                fontFamily: "inherit",
                textDecoration: "none",
              }}
              aria-label="Return to homepage"
            >
              Go Home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
