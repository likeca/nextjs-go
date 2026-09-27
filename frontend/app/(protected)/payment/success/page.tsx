import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { verifyCheckoutSession } from "@/actions/payments";
import { redirect } from "next/navigation";

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const params = await searchParams;
  const sessionId = params.session_id;

  console.log("[SUCCESS PAGE] Payment success page loaded");
  console.log("[SUCCESS PAGE] Session ID from URL:", sessionId);
  console.log("[SUCCESS PAGE] All search params:", params);

  // Redirect if no session_id - user shouldn't be here without completing payment
  if (!sessionId) {
    console.warn("[SUCCESS PAGE] No session_id provided - redirecting to billing");
    redirect("/billing");
  }

  // Verify and create subscription if the session_id is provided
  if (sessionId) {
    console.log("[SUCCESS PAGE] Calling verifyCheckoutSession with sessionId:", sessionId);
    const result = await verifyCheckoutSession(sessionId);
    console.log("[SUCCESS PAGE] verifyCheckoutSession result:", result);
    
    if (result.error) {
      console.error("[SUCCESS PAGE] Error from verifyCheckoutSession:", result.error);
      // Don't redirect on error, still show success message
      // The webhook might handle it, or the user can check billing page
    } else if (result.success) {
      console.log("[SUCCESS PAGE] Subscription verification successful!");
      if (result.alreadyExists) {
        console.log("[SUCCESS PAGE] Subscription already existed in database");
      } else {
        console.log("[SUCCESS PAGE] New subscription created successfully");
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription>
            Thank you for your purchase. Your subscription is now active.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            You will receive a confirmation email shortly with your subscription details.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild className="flex-1">
              <Link href="/billing">View Subscription</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/profile">Go to Profile</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
