'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { signIn, emailOtp, authClient } from '@/lib/auth-client';
import { getRedirectUrl } from '@/actions/users/get-redirect-url';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// ─── Google reCAPTCHA v3 ──────────────────────────────────────────────────────
declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
    };
  }
}

const RECAPTCHA_SCRIPT_ID = 'google-recaptcha-v3';

/** Resolve a v3 token for the given action, or throw if the widget is unusable. */
async function executeRecaptcha(siteKey: string, action: string): Promise<string> {
  const grecaptcha = window.grecaptcha;
  if (!grecaptcha) {
    throw new Error('Security check is still loading. Please try again.');
  }
  await new Promise<void>((resolve) => grecaptcha.ready(resolve));
  return grecaptcha.execute(siteKey, { action });
}

interface LoginFormProps extends React.ComponentProps<'div'> {
  /** reCAPTCHA v3 site key, resolved server-side; empty/omitted disables the captcha. */
  recaptchaSiteKey?: string;
}

export function LoginForm({ className, recaptchaSiteKey = '', ...props }: LoginFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [lastResendTime, setLastResendTime] = useState<number>(0);
  const [showPassword, setShowPassword] = useState(false);
  const RESEND_COOLDOWN = 60000; // 60 seconds

  useEffect(() => {
    if (!recaptchaSiteKey || document.getElementById(RECAPTCHA_SCRIPT_ID)) return;
    const script = document.createElement('script');
    script.id = RECAPTCHA_SCRIPT_ID;
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(recaptchaSiteKey)}`;
    script.async = true;
    document.head.appendChild(script);
  }, [recaptchaSiteKey]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const emailValue = formData.get('email') as string;
    const password = formData.get('password') as string;

    // Validate with Zod
    const validation = loginSchema.safeParse({ email: emailValue, password });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      setIsLoading(false);
      return;
    }

    let captchaToken: string | undefined;
    if (recaptchaSiteKey) {
      try {
        captchaToken = await executeRecaptcha(recaptchaSiteKey, 'login');
      } catch (error: any) {
        toast.error(error.message || 'Security check failed. Please try again.');
        setIsLoading(false);
        return;
      }
    }

    try {
      const { data, error } = await signIn.email({
        email: emailValue,
        password,
        captchaToken,
      });

      if (error) {
        // Check if error is due to unverified email
        if (
          error.message?.toLowerCase().includes('email not verified') ||
          error.message?.toLowerCase().includes('verify')
        ) {
          // Send OTP and show verification screen
          setEmail(emailValue);
          await handleSendOtp(emailValue);
          setShowOtpVerification(true);
          setIsLoading(false);
          return;
        }

        toast.error(error.message || 'Invalid email or password');
        setIsLoading(false);
        return;
      }

      // Better Auth sets twoFactorRedirect when 2FA is required after credential check
      if ((data as any)?.twoFactorRedirect) {
        setEmail(emailValue);
        setShowTwoFactor(true);
        setIsLoading(false);
        return;
      }

      toast.success('Logged in successfully!');
      const redirectUrl = await getRedirectUrl();
      router.push(redirectUrl);
    } catch (error: any) {
      toast.error(error.message || 'Failed to login');
      setIsLoading(false);
    }
  }

  async function handleSendOtp(emailValue: string) {
    try {
      const { error } = await emailOtp.sendVerificationOtp({
        email: emailValue,
        type: 'email-verification',
      });

      if (error) {
        toast.error(error.message || 'Failed to send verification code');
      } else {
        toast.success('Verification code sent to your email!');
        setLastResendTime(Date.now());
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send verification code');
    }
  }

  async function handleOtpVerification(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await emailOtp.verifyEmail({
        email,
        otp,
      });

      if (error) {
        toast.error(error.message || 'Invalid verification code');
        setIsLoading(false);
        return;
      }

      toast.success('Email verified successfully! Please login again.');
      setShowOtpVerification(false);
      setOtp('');
      setIsLoading(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify email');
      setIsLoading(false);
    }
  }

  async function handleResendOtp() {
    const now = Date.now();
    const timeSinceLastResend = now - lastResendTime;

    if (timeSinceLastResend < RESEND_COOLDOWN) {
      const remainingSeconds = Math.ceil((RESEND_COOLDOWN - timeSinceLastResend) / 1000);
      toast.error(`Please wait ${remainingSeconds} seconds before resending`);
      return;
    }

    setIsLoading(true);
    await handleSendOtp(email);
    setIsLoading(false);
  }

  async function handleTwoFactorVerification(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await (authClient as any).twoFactor.verifyTotp({ code: totpCode });
      if (error) {
        toast.error(error.message || 'Invalid authentication code');
        setIsLoading(false);
        return;
      }
      toast.success('Logged in successfully!');
      const redirectUrl = await getRedirectUrl();
      router.push(redirectUrl);
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify code');
      setIsLoading(false);
    }
  }

  if (showTwoFactor) {
    return (
      <div className={cn('flex flex-col gap-6', className)} {...props}>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Two-Factor Authentication</CardTitle>
            <CardDescription>Enter the 6-digit code from your authenticator app</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTwoFactorVerification}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="totp-login">Authentication Code</FieldLabel>
                  <Input
                    id="totp-login"
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    required
                    disabled={isLoading}
                    autoComplete="one-time-code"
                    className="text-center text-2xl tracking-widest"
                    autoFocus
                  />
                  <FieldDescription>Open your authenticator app and enter the current 6-digit code</FieldDescription>
                </Field>
                <Field>
                  <Button type="submit" disabled={isLoading || totpCode.length !== 6}>
                    {isLoading ? 'Verifying…' : 'Verify'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowTwoFactor(false);
                      setTotpCode('');
                    }}
                    disabled={isLoading}
                  >
                    Back to Login
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showOtpVerification) {
    return (
      <div className={cn('flex flex-col gap-6', className)} {...props}>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Verify Your Email</CardTitle>
            <CardDescription>We&apos;ve sent a 6-digit code to {email}</CardDescription>
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
                  <FieldDescription>Enter the 6-digit code sent to your email</FieldDescription>
                </Field>
                <Field>
                  <Button type="submit" disabled={isLoading || otp.length !== 6}>
                    {isLoading ? 'Verifying...' : 'Verify Email'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={handleResendOtp} disabled={isLoading}>
                    Resend Code
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowOtpVerification(false);
                      setOtp('');
                    }}
                    disabled={isLoading}
                  >
                    Back to Login
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>Login with your email and password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email" className={errors.email ? 'text-red-600' : ''}>
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
                  className={errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  aria-invalid={errors.email ? 'true' : 'false'}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
                {errors.email && (
                  <p id="email-error" className="text-sm font-medium text-red-600 mt-1">
                    {errors.email}
                  </p>
                )}
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password" className={errors.password ? 'text-red-600' : ''}>
                    Password
                  </FieldLabel>
                  <a href="/forgot-password" className="ml-auto text-sm underline-offset-4 hover:underline">
                    Forgot your password?
                  </a>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                    className={errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    aria-invalid={errors.password ? 'true' : 'false'}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" className="text-sm font-medium text-red-600 mt-1">
                    {errors.password}
                  </p>
                )}
              </Field>
              <Field>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Logging in...' : 'Login'}
                </Button>
                <FieldDescription className="text-center">
                  Don&apos;t have an account? <a href="/signup">Sign up</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="/terms">Terms of Service</a>
        {', '}
        and <a href="/privacy">Privacy Policy</a>.
      </FieldDescription>
    </div>
  );
}
