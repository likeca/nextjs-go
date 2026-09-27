import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Access Denied",
  description: "You do not have permission to access this page.",
  path: "/unauthorized",
  noIndex: true,
});

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">403</h1>
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground max-w-md">
            You don&apos;t have permission to access this page. Please contact your administrator if you believe this is an error.
          </p>
          <div className="flex gap-3 justify-center">
            <Button asChild variant="outline">
              <Link href="/">Go Home</Link>
            </Button>
            <Button asChild>
              <Link href="/login">Login</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
