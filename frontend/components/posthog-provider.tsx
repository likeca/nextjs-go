"use client"

import { useEffect } from "react"
import { COOKIE_CONSENT_KEY } from "@/lib/config"

export function PostHogConsent() {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return

    const consent = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (consent === "accepted") {
      import("posthog-js").then(({ default: posthog }) => posthog.opt_in_capturing())
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key !== COOKIE_CONSENT_KEY) return
      import("posthog-js").then(({ default: posthog }) => {
        if (e.newValue === "accepted") posthog.opt_in_capturing()
        else posthog.opt_out_capturing()
      })
    }

    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  return null
}
