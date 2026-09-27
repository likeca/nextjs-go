"use client"

import { Component, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback) return this.props.fallback

    const isDev = process.env.NODE_ENV === "development"

    return (
      <div
        className="flex flex-col items-center justify-center min-h-[200px] gap-4 p-6 text-center rounded-lg border border-destructive/20 bg-destructive/5"
        role="alert"
      >
        <AlertTriangle
          className="h-5 w-5 text-destructive"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-destructive">
          Something went wrong rendering this section
        </p>
        {isDev && this.state.error && (
          <pre className="max-w-full overflow-auto whitespace-pre-wrap break-words text-xs text-destructive/70 font-mono bg-destructive/5 rounded p-2 border border-destructive/10">
            {this.state.error.message}
          </pre>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => this.setState({ hasError: false, error: undefined })}
        >
          Try again
        </Button>
      </div>
    )
  }
}
