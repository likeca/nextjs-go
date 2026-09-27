"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Cookie } from "lucide-react"
import { COOKIE_CONSENT_KEY } from "@/lib/config"

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(COOKIE_CONSENT_KEY)) setShowBanner(true)
  }, [])

  const dispatchConsent = (value: "accepted" | "declined") => {
    localStorage.setItem(COOKIE_CONSENT_KEY, value)
    window.dispatchEvent(new StorageEvent("storage", { key: COOKIE_CONSENT_KEY, newValue: value }))
    setShowBanner(false)
  }

  const handleAccept = () => dispatchConsent("accepted")
  const handleDecline = () => dispatchConsent("declined")

  if (!showBanner) return null

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 bg-background border-t shadow-lg"
    >
      <div className="container mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <Cookie className="h-5 w-5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p id="cookie-consent-title" className="text-sm font-semibold mb-1">
              We use cookies
            </p>
            <p id="cookie-consent-desc" className="text-sm text-muted-foreground">
              We use cookies to improve your experience. By continuing, you agree to our{"+"}
              <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDecline}
            aria-label="Decline non-essential cookies"
          >
            Decline
          </Button>
          <Button
            size="sm"
            onClick={handleAccept}
            aria-label="Accept all cookies"
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  )
}
