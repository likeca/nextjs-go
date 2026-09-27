import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="space-y-2">
          <h1 className="text-8xl font-bold tracking-tight text-muted-foreground">
            404
          </h1>
          <h2 className="text-2xl font-semibold tracking-tight">
            Page not found
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Sorry, we couldn&apos;t find the page you&apos;re looking for. It may have been moved, deleted, or the URL may be incorrect.
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/">Go Home</Link>
          </Button>
          <Button asChild>
            <Link href="/contact">Contact Support</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  )
}
