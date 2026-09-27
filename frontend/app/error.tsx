"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import Link from "next/link"
import { AlertTriangle } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Application error:", error)
  }, [error])

  const isDev = process.env.NODE_ENV === "development"

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="space-y-2">
          <h1 className="text-8xl font-bold tracking-tight text-muted-foreground">
            500
          </h1>
          <h2 className="text-2xl font-semibold tracking-tight">
            Something went wrong
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            We&apos;re sorry, an unexpected error occurred. Our team has been
            notified and is looking into it.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground/60">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        {isDev && (
          <div className="w-full max-w-lg rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-left">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle
                className="h-4 w-4 text-destructive"
                aria-hidden="true"
              />
              <span className="text-sm font-medium text-destructive">
                Development Error Details
              </span>
            </div>
            <pre className="overflow-auto whitespace-pre-wrap wrap-break-word text-xs text-destructive/80 font-mono">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </div>
        )}

        <div className="flex gap-3">
          <Button onClick={reset} variant="outline">
            Try again
          </Button>
          <Button asChild>
            <Link href="/">Go Home</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  )
}
