"use client"

import { useEffect } from "react"
import posthog from "posthog-js"
import { COOKIE_CONSENT_KEY } from "@/lib/config"

export function PostHogConsent() {
  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (consent === "accepted") posthog.opt_in_capturing()

    const handleStorage = (e: StorageEvent) => {
      if (e.key !== COOKIE_CONSENT_KEY) return
      if (e.newValue === "accepted") posthog.opt_in_capturing()
      else posthog.opt_out_capturing()
    }

    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  return null
}
