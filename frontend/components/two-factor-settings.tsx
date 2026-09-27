"use client"

import { useState } from "react"
import QRCode from "react-qr-code"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"
import { Shield, ShieldCheck, Eye, EyeOff, Copy, Check } from "lucide-react"

type TwoFactorStep = "idle" | "enter-password" | "show-qr" | "confirm-disable"

export function TwoFactorSettings() {
  const { data: session } = authClient.useSession()
  const [step, setStep] = useState<TwoFactorStep>("idle")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [totpCode, setTotpCode] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [copiedUri, setCopiedUri] = useState(false)

  const isTwoFactorEnabled = (session?.user as any)?.twoFactorEnabled

  const handleCancel = () => {
    setStep("idle")
    setPassword("")
    setTotpCode("")
    setQrCode(null)
    setShowPassword(false)
  }

  const handleEnableTwoFactor = async () => {
    if (!password) {
      toast.error("Please enter your password")
      return
    }
    setIsLoading(true)
    try {
      const result = await (authClient as any).twoFactor.enable({ password })
      if (result?.data?.totpURI) {
        setQrCode(result.data.totpURI)
        setBackupCodes(result.data.backupCodes || [])
        setPassword("")
        setShowPassword(false)
        setStep("show-qr")
      } else {
        toast.error(result?.error?.message || "Failed to enable 2FA")
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to enable 2FA")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyAndEnable = async () => {
    setIsLoading(true)
    try {
      const { error } = await (authClient as any).twoFactor.verifyTotp({ code: totpCode })
      if (error) {
        toast.error(error.message || "Invalid code. Please try again.")
      } else {
        toast.success("Two-factor authentication enabled!")
        handleCancel()
      }
    } catch (error: any) {
      toast.error(error.message || "Invalid code. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisableTwoFactor = async () => {
    if (!password) {
      toast.error("Please enter your password")
      return
    }
    setIsLoading(true)
    try {
      const { error } = await (authClient as any).twoFactor.disable({ password })
      if (error) {
        toast.error(error.message || "Failed to disable 2FA")
      } else {
        toast.success("Two-factor authentication disabled")
        handleCancel()
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to disable 2FA")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyUri = async () => {
    if (!qrCode) return
    await navigator.clipboard.writeText(qrCode)
    setCopiedUri(true)
    setTimeout(() => setCopiedUri(false), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {isTwoFactorEnabled ? (
            <ShieldCheck className="h-5 w-5 text-green-500" />
          ) : (
            <Shield className="h-5 w-5 text-muted-foreground" />
          )}
          <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
          {isTwoFactorEnabled && (
            <Badge variant="default" className="ml-auto">Enabled</Badge>
          )}
        </div>
        <CardDescription>
          Add an extra layer of security to your account using an authenticator app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* ── Idle: enable / disable button ─────────────────────────── */}
        {step === "idle" && (
          <div className="flex gap-2">
            {!isTwoFactorEnabled ? (
              <Button onClick={() => setStep("enter-password")}>
                Enable 2FA
              </Button>
            ) : (
              <Button variant="destructive" onClick={() => setStep("confirm-disable")}>
                Disable 2FA
              </Button>
            )}
          </div>
        )}

        {/* ── Enter password to start enable flow ────────────────────── */}
        {step === "enter-password" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Confirm your current password to set up two-factor authentication.
            </p>
            <div className="space-y-2">
              <Label htmlFor="enable-password">Current Password</Label>
              <div className="relative">
                <Input
                  id="enable-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isLoading}
                  onKeyDown={(e) => e.key === "Enter" && handleEnableTwoFactor()}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleEnableTwoFactor}
                disabled={isLoading || !password}
              >
                {isLoading ? "Verifying…" : "Continue"}
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* ── Show QR code and verify TOTP to activate ───────────────── */}
        {step === "show-qr" && qrCode && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.),
              then enter the 6-digit code below to activate.
            </p>

            <div className="flex flex-col items-center gap-2">
              <div className="flex justify-center p-4 bg-white rounded-lg border">
                <QRCode value={qrCode} size={180} />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopyUri}
                className="text-xs text-muted-foreground"
                aria-label="Copy setup URI for manual entry"
              >
                {copiedUri ? (
                  <><Check className="h-3 w-3 mr-1" /> Copied!</>
                ) : (
                  <><Copy className="h-3 w-3 mr-1" /> Copy setup key manually</>
                )}
              </Button>
            </div>

            {backupCodes.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">
                  ⚠️ Save your backup codes — each can only be used once:
                </p>
                <div className="grid grid-cols-2 gap-1 font-mono text-xs bg-muted p-3 rounded">
                  {backupCodes.map((code) => (
                    <span key={code}>{code}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="totp-verify">6-digit verification code</Label>
              <div className="flex gap-2">
                <Input
                  id="totp-verify"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-32 font-mono text-center"
                  autoComplete="one-time-code"
                  onKeyDown={(e) =>
                    e.key === "Enter" && totpCode.length === 6 && handleVerifyAndEnable()
                  }
                />
                <Button
                  onClick={handleVerifyAndEnable}
                  disabled={isLoading || totpCode.length !== 6}
                >
                  {isLoading ? "Verifying…" : "Verify & Enable"}
                </Button>
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isLoading}>
              Cancel
            </Button>
          </div>
        )}

        {/* ── Confirm password to disable 2FA ────────────────────────── */}
        {step === "confirm-disable" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter your current password to disable two-factor authentication.
            </p>
            <div className="space-y-2">
              <Label htmlFor="disable-password">Current Password</Label>
              <div className="relative">
                <Input
                  id="disable-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isLoading}
                  onKeyDown={(e) => e.key === "Enter" && handleDisableTwoFactor()}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleDisableTwoFactor}
                disabled={isLoading || !password}
              >
                {isLoading ? "Disabling…" : "Disable 2FA"}
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
