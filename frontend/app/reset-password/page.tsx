import { ResetPasswordForm } from "@/components/reset-password-form"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Reset Password",
  description: "Create a new password for your account.",
  path: "/reset-password",
  keywords: ["reset password", "new password"],
  noIndex: true,
});

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <ResetPasswordForm />
        </div>
      </main>
      <Footer />
    </div>
  )
}
