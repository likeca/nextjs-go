"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { z } from "zod"

const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [token, setToken] = useState<string | null>(null)
  const [uid, setUid] = useState<string | null>(null)

  useEffect(() => {
    // Django's dj-rest-auth reset link carries both uid and token.
    const params = new URLSearchParams(window.location.search)
    const tokenParam = params.get('token')
    const uidParam = params.get('uid')
    if (tokenParam && uidParam) {
      setToken(tokenParam)
      setUid(uidParam)
    } else {
      toast.error("Invalid reset link")
      router.push("/login")
    }
  }, [router])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrors({})

    if (!token || !uid) {
      toast.error("Invalid reset link")
      return
    }

    const formData = new FormData(e.currentTarget)
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirm-password") as string

    // Validate with Zod
    const validation = resetPasswordSchema.safeParse({ 
      password, 
      confirmPassword 
    })

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {}
      if (validation.error?.issues) {
        validation.error.issues.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message
          }
        })
      }
      setErrors(fieldErrors)
      toast.error("Please fix the errors in the form")
      return
    }

    setIsLoading(true)

    try {
      const { error } = await authClient.resetPassword({
        uid,
        token,
        newPassword: password,
      })

      if (error) {
        toast.error(error.message || "Failed to reset password")
        setIsLoading(false)
        return
      }

      toast.success("Password reset successfully!")
      router.push("/login")
    } catch (error: any) {
      toast.error(error.message || "Failed to reset password")
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Invalid Reset Link</CardTitle>
            <CardDescription>
              The password reset link is invalid or has expired
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Reset Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="password" className={errors.password ? "text-red-600" : ""}>
                  New Password
                </FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  disabled={isLoading}
                  className={errors.password ? "border-red-500 focus-visible:ring-red-500" : ""}
                  aria-invalid={errors.password ? "true" : "false"}
                  aria-describedby={errors.password ? "password-error" : undefined}
                />
                {errors.password && (
                  <p id="password-error" className="text-sm font-medium text-red-600 mt-1">
                    {errors.password}
                  </p>
                )}
                <FieldDescription>
                  Must be at least 8 characters long.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="confirm-password" className={errors.confirmPassword ? "text-red-600" : ""}>
                  Confirm New Password
                </FieldLabel>
                <Input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  required
                  disabled={isLoading}
                  className={errors.confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""}
                  aria-invalid={errors.confirmPassword ? "true" : "false"}
                  aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                />
                {errors.confirmPassword && (
                  <p id="confirmPassword-error" className="text-sm font-medium text-red-600 mt-1">
                    {errors.confirmPassword}
                  </p>
                )}
              </Field>
              <Field>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Resetting..." : "Reset Password"}
                </Button>
                <FieldDescription className="text-center">
                  <a href="/login">Back to login</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
