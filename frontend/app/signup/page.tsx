import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Logo } from "@/components/logo"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { SignupForm } from "@/components/signup-form"
import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Create an Account",
  description: "Sign up for a free account. Get started with authentication, payments, and a full-featured SaaS dashboard in minutes.",
  path: "/signup",
  keywords: ["sign up", "register", "create account", "free trial"],
});

export default async function SignupPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="bg-muted flex flex-1 flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <h1 className="sr-only">Create your account</h1>
          <Logo className="self-center" />
          <SignupForm />
        </div>
      </div>
      <Footer />
    </div>
  )
}
