"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  CreditCard,
  CheckCircle,
  XCircle,
  Calendar,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import {
  cancelSubscription,
  resumeSubscription,
  createBillingPortalSession,
} from "@/actions/payments";
import Link from "next/link";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  interval: string;
  features: string[];
  isPopular: boolean;
}

interface Subscription {
  id: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  plan: Plan;
}

interface BillingClientProps {
  subscription: Subscription | null;
}

export default function BillingClient({ subscription }: BillingClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      const result = await createBillingPortalSession();

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      toast.error("Failed to open billing portal");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;

    setCancelLoading(true);
    try {
      const result = await cancelSubscription(subscription.id);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Subscription will be canceled at the end of the billing period");
      router.refresh();
    } catch (error) {
      toast.error("Failed to cancel subscription");
    } finally {
      setCancelLoading(false);
    }
  };

  const handleResumeSubscription = async () => {
    if (!subscription) return;

    setResumeLoading(true);
    try {
      const result = await resumeSubscription(subscription.id);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Subscription resumed successfully");
      router.refresh();
    } catch (error) {
      toast.error("Failed to resume subscription");
    } finally {
      setResumeLoading(false);
    }
  };

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-muted-foreground" />
            No Active Subscription
          </CardTitle>
          <CardDescription>
            You don&apos;t have an active subscription yet. Choose a plan to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/#pricing">
              View Available Plans
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                {subscription.plan.name} Plan
              </CardTitle>
              <CardDescription className="mt-1">
                {subscription.plan.description}
              </CardDescription>
            </div>
            <Badge
              variant={subscription.status === "active" ? "default" : "secondary"}
              className="capitalize"
            >
              {subscription.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Pricing Info */}
          <div className="flex items-baseline gap-1">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <span className="text-3xl font-bold">
              {(subscription.plan.amount / 100).toFixed(2)}
            </span>
            <span className="text-muted-foreground">
              / {subscription.plan.interval}
            </span>
          </div>

          {/* Billing Period */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Current billing period:</span>
            </div>
            <p className="text-sm text-muted-foreground pl-6">
              {format(new Date(subscription.currentPeriodStart), "MMM dd, yyyy")} 
              {" - "}
              {format(new Date(subscription.currentPeriodEnd), "MMM dd, yyyy")}
            </p>
          </div>

          {/* Next Billing Date */}
          {!subscription.cancelAtPeriodEnd && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm font-medium">Next billing date</p>
              <p className="text-lg font-semibold">
                {format(new Date(subscription.currentPeriodEnd), "MMMM dd, yyyy")}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                ${(subscription.plan.amount / 100).toFixed(2)} will be charged to your payment method
              </p>
            </div>
          )}

          {/* Cancellation Notice */}
          {subscription.cancelAtPeriodEnd && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
              <p className="text-sm font-medium text-destructive">
                Subscription Scheduled for Cancellation
              </p>
              <p className="text-sm text-destructive/80 mt-1">
                Your subscription will end on{" "}
                {format(new Date(subscription.currentPeriodEnd), "MMMM dd, yyyy")}.
                You&apos;ll continue to have access until then.
              </p>
            </div>
          )}

          {/* Features List */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Plan features:</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {subscription.plan.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Management Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Manage Subscription
          </CardTitle>
          <CardDescription>
            Update your billing information, payment method, or subscription plan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              onClick={handleManageBilling}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Loading..." : "Update Payment Method"}
            </Button>
            <Button
              variant="outline"
              asChild
              className="w-full"
            >
              <Link href="/#pricing">Change Plan</Link>
            </Button>
          </div>

          <div className="pt-4 border-t">
            {subscription.cancelAtPeriodEnd ? (
              <Button
                variant="default"
                onClick={handleResumeSubscription}
                disabled={resumeLoading}
                className="w-full"
              >
                {resumeLoading ? "Resuming..." : "Resume Subscription"}
              </Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full"
                  >
                    Cancel Subscription
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your subscription will be canceled at the end of the current billing period
                      ({format(new Date(subscription.currentPeriodEnd), "MMMM dd, yyyy")}).
                      You&apos;ll continue to have access until then.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancelSubscription}
                      disabled={cancelLoading}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {cancelLoading ? "Canceling..." : "Yes, Cancel Subscription"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
