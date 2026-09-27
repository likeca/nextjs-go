import { ForgotPasswordForm } from "@/components/forgot-password-form"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Forgot Password",
  description: "Reset your password. Enter your email address and we will send you a link to reset your password.",
  path: "/forgot-password",
  keywords: ["forgot password", "reset password", "account recovery"],
  noIndex: true,
});

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <ForgotPasswordForm />
        </div>
      </main>
      <Footer />
    </div>
  )
}
