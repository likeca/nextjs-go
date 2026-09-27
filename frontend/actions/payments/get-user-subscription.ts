"use server";

import { serverTry } from "@/lib/api/server";
import { mapSubscription, type Subscription } from "@/types/payment";

export const getUserSubscription = async () => {
  const res = await serverTry<{ subscription: unknown }>("/api/billing/subscriptions/current/");
  if ("error" in res) {
    if (res.error.toLowerCase().includes("not authenticated")) return { error: "Unauthorized" };
    return { error: "Failed to fetch subscription" };
  }
  const sub: Subscription | null = res.data.subscription
    ? mapSubscription(res.data.subscription)
    : null;
  return { subscription: sub };
};
