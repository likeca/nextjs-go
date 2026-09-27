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
import { PhoneInput } from "@/components/ui/phone-input"
import { signUp, emailOtp } from "@/lib/auth-client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { z } from "zod"
import { isValidPhoneNumber, type Value } from "react-phone-number-input"
import { Eye, EyeOff } from "lucide-react"

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.union([z.string(), z.undefined()]).optional().refine((val) => {
    // Phone is optional - empty or valid
    if (!val || val.length === 0) return true;
    try {
      return isValidPhoneNumber(val);
    } catch {
      return false;
    }
  }, {
    message: 'Please enter a valid phone number',
  }),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

const getPasswordStrength = (password: string): { label: string; color: string; width: string } => {
  if (!password) return { label: "", color: "", width: "0%" }
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { label: "Weak", color: "bg-destructive", width: "25%" }
  if (score === 2) return { label: "Fair", color: "bg-yellow-500", width: "50%" }
  if (score === 3) return { label: "Strong", color: "bg-blue-500", width: "75%" }
  return { label: "Very Strong", color: "bg-green-500", width: "100%" }
}

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [phone, setPhone] = useState<Value | undefined>()
  const [showOtpVerification, setShowOtpVerification] = useState(false)
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [lastResendTime, setLastResendTime] = useState<number>(0)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordValue, setPasswordValue] = useState("")
  const RESEND_COOLDOWN = 60000 // 60 seconds

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrors({})

    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const emailValue = formData.get("email") as string
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirm-password") as string

    // Validate with Zod
    const validation = signupSchema.safeParse({ 
      name, 
      email: emailValue, 
      phone,
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
      const signupData: any = {
        email: emailValue,
        password,
        name,
      };
      
      // Add phone if provided
      if (phone) {
        signupData.phone = phone;
      }

      const { data, error } = await signUp.email(signupData);

      if (error) {
        toast.error(error.message || "Failed to create account")
        setIsLoading(false)
        return
      }

      // Show OTP verification form
      setEmail(emailValue)
      setShowOtpVerification(true)
      toast.success("Account created! Please check your email for the verification code.")
      setLastResendTime(Date.now())
      setIsLoading(false)
    } catch (error: any) {
      toast.error(error.message || "Failed to create account")
      setIsLoading(false)
    }
  }

  async function handleOtpVerification(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data, error } = await emailOtp.verifyEmail({
        email,
        otp,
      })

      if (error) {
        toast.error(error.message || "Invalid verification code")
        setIsLoading(false)
        return
      }

      toast.success("Email verified successfully!")
      router.push("/login")
    } catch (error: any) {
      toast.error(error.message || "Failed to verify email")
      setIsLoading(false)
    }
  }

  async function handleResendOtp() {
    const now = Date.now()
    const timeSinceLastResend = now - lastResendTime
    
    if (timeSinceLastResend < RESEND_COOLDOWN) {
      const remainingSeconds = Math.ceil((RESEND_COOLDOWN - timeSinceLastResend) / 1000)
      toast.error(`Please wait ${remainingSeconds} seconds before resending`)
      return
    }

    setIsLoading(true)
    try {
      const { error } = await emailOtp.sendVerificationOtp({
        email,
        type: 'email-verification',
      })

      if (error) {
        toast.error(error.message || "Failed to resend code")
      } else {
        toast.success("Verification code resent!")
        setLastResendTime(Date.now())
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to resend code")
    } finally {
      setIsLoading(false)
    }
  }

  if (showOtpVerification) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Verify Your Email</CardTitle>
            <CardDescription>
              We&apos;ve sent a 6-digit code to {email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleOtpVerification}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="otp">Verification Code</FieldLabel>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    required
                    disabled={isLoading}
                    className="text-center text-2xl tracking-widest"
                  />
                  <FieldDescription>
                    Enter the 6-digit code sent to your email
                  </FieldDescription>
                </Field>
                <Field>
                  <Button type="submit" disabled={isLoading || otp.length !== 6}>
                    {isLoading ? "Verifying..." : "Verify Email"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={handleResendOtp}
                    disabled={isLoading}
                  >
                    Resend Code
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>
            Enter your email below to create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name" className={errors.name ? "text-red-600" : ""}>
                  Full Name
                </FieldLabel>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  required
                  disabled={isLoading}
                  autoComplete="name"
                  className={errors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
                  aria-invalid={errors.name ? "true" : "false"}
                  aria-describedby={errors.name ? "name-error" : undefined}
                />
                {errors.name && (
                  <p id="name-error" className="text-sm font-medium text-red-600 mt-1">
                    {errors.name}
                  </p>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="email" className={errors.email ? "text-red-600" : ""}>
                  Email
                </FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                  className={errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
                  aria-invalid={errors.email ? "true" : "false"}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                {errors.email && (
                  <p id="email-error" className="text-sm font-medium text-red-600 mt-1">
                    {errors.email}
                  </p>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="phone" className={errors.phone ? "text-red-600" : ""}>
                  Phone Number (Optional)
                </FieldLabel>
                <PhoneInput
                  id="phone"
                  value={phone}
                  onChange={(value) => setPhone(value || undefined)}
                  placeholder="+1 (555) 000-0000"
                  disabled={isLoading}
                  error={!!errors.phone}
                  aria-invalid={errors.phone ? "true" : "false"}
                  aria-describedby={errors.phone ? "phone-error" : undefined}
                />
                {errors.phone && (
                  <p id="phone-error" className="text-sm font-medium text-red-600 mt-1">
                    {errors.phone}
                  </p>
                )}
              </Field>
              <Field>
                <Field className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="password" className={errors.password ? "text-red-600" : ""}>
                      Password
                    </FieldLabel>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        disabled={isLoading}
                        autoComplete="new-password"
                        value={passwordValue}
                        onChange={(e) => setPasswordValue(e.target.value)}
                        className={errors.password ? "border-red-500 focus-visible:ring-red-500" : ""}
                        aria-invalid={errors.password ? "true" : "false"}
                        aria-describedby={errors.password ? "password-error" : undefined}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {passwordValue && (
                      <div className="mt-1">
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${getPasswordStrength(passwordValue).color}`}
                            style={{ width: getPasswordStrength(passwordValue).width }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Password strength: {getPasswordStrength(passwordValue).label}
                        </p>
                      </div>
                    )}
                    {errors.password && (
                      <p id="password-error" className="text-sm font-medium text-red-600 mt-1">
                        {errors.password}
                      </p>
                    )}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm-password" className={errors.confirmPassword ? "text-red-600" : ""}>
                      Confirm Password
                    </FieldLabel>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        name="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        disabled={isLoading}
                        autoComplete="new-password"
                        className={errors.confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""}
                        aria-invalid={errors.confirmPassword ? "true" : "false"}
                        aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        tabIndex={-1}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p id="confirmPassword-error" className="text-sm font-medium text-red-600 mt-1">
                        {errors.confirmPassword}
                      </p>
                    )}
                  </Field>
                </Field>
                <FieldDescription>
                  Must be at least 8 characters long.
                </FieldDescription>
              </Field>
              <Field>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
                <FieldDescription className="text-center">
                  Already have an account? <a href="/login">Sign in</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="/terms">Terms of Service</a>{", "}
        and <a href="/privacy">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
