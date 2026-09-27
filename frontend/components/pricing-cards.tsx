"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { createCheckoutSession } from "@/actions/payments/create-checkout-session";
import { toast } from "sonner";

type PricingInterval = "monthly" | "yearly";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  interval: string;
  features: string[];
  isPopular: boolean;
  stripePriceId: string;
}

interface PricingCardsProps {
  plans: Plan[];
  isLoggedIn: boolean;
}

export const PricingCards = ({ plans, isLoggedIn }: PricingCardsProps) => {
  const [interval, setInterval] = useState<PricingInterval>("monthly");
  const [isPending, startTransition] = useTransition();
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  const filteredPlans = plans.filter(
    (plan) => plan.interval === (interval === "monthly" ? "month" : "year")
  );

  const handleBuyNow = (planId: string) => {
    if (!isLoggedIn) {
      toast.error("Please login to purchase a plan");
      window.location.href = "/login";
      return;
    }

    // Check if using placeholder Stripe IDs
    const plan = filteredPlans.find(p => p.id === planId);
    if (plan?.stripePriceId.startsWith("price_") && !plan.stripePriceId.includes("_1")) {
      toast.error("Payment system is being configured. Please try again later.");
      console.error("Placeholder Stripe Price ID detected:", plan.stripePriceId);
      return;
    }

    setLoadingPlanId(planId);
    startTransition(async () => {
      const result = await createCheckoutSession(planId);
      
      if (result.error) {
        toast.error(result.error);
        setLoadingPlanId(null);
        return;
      }

      if (result.url) {
        window.location.href = result.url;
      }
    });
  };

  const formatPrice = (amount: number) => {
    return (amount / 100).toFixed(2);
  };

  return (
    <div className="space-y-10">
      {/* Interval Toggle — Pill style */}
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center rounded-full border bg-muted/50 p-1">
          <button
            type="button"
            onClick={() => setInterval("monthly")}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
              interval === "monthly"
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setInterval("yearly")}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-all flex items-center gap-2 ${
              interval === "yearly"
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Yearly
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-foreground text-background border-0">
              Save 17%
            </Badge>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-8 md:grid-cols-3">
        {filteredPlans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative flex flex-col transition-all duration-300 ${
              plan.isPopular
                ? "border-foreground border-2 shadow-md scale-[1.02]"
                : "hover:shadow-sm"
            }`}
          >
            {plan.isPopular && (
              <div className="absolute -top-4 left-0 right-0 flex justify-center">
                <Badge className="px-4 py-1 bg-foreground text-background border-0 shadow-sm">Most Popular</Badge>
              </div>
            )}

            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>

            <CardContent className="flex-1 space-y-6">
              <div className="text-center">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold">
                    ${formatPrice(plan.amount)}
                  </span>
                  <span className="text-muted-foreground">
                    /{interval === "monthly" ? "mo" : "yr"}
                  </span>
                </div>
              </div>

              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 shrink-0 text-primary" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              <Button
                className="w-full"
                size="lg"
                variant={plan.isPopular ? "default" : "outline"}
                onClick={() => handleBuyNow(plan.id)}
                disabled={isPending && loadingPlanId === plan.id}
              >
                {isPending && loadingPlanId === plan.id
                  ? "Loading..."
                  : "Buy Now"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};
