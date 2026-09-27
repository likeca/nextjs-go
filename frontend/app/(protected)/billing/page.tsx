import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUserSubscription } from "@/actions/payments";
import { isUserAdmin } from "@/lib/auth-utils";
import BillingClient from "@/components/billing-client";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Billing | Manage Your Subscription",
  description: "View and manage your subscription plan and billing information",
};

export default async function BillingPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const isAdmin = await isUserAdmin(session?.user?.id);
  const { subscription } = await getUserSubscription();

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={session?.user} isAdmin={isAdmin} />

      <div className="container max-w-4xl mx-auto flex-1 py-10 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground mt-2">
            Manage your subscription plan and billing settings
          </p>
        </div>

        <BillingClient subscription={subscription || null} />
      </div>

      <Footer />
    </div>
  );
}
