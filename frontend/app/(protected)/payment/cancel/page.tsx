import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function PaymentCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const params = await searchParams;
  
  // Only allow access if coming from a payment flow
  // Users shouldn't access this page directly
  if (!params.from || params.from !== "checkout") {
    console.warn("[CANCEL PAGE] Invalid access - redirecting to billing");
    redirect("/billing");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Payment Canceled</CardTitle>
          <CardDescription>
            Your payment was canceled. No charges have been made.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            If you experienced any issues or have questions, please contact our support team.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild className="flex-1">
              <Link href="/billing">View Plans</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/profile">Back to Profile</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
