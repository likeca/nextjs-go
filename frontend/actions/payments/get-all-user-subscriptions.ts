"use server";

import { serverTry } from "@/lib/api/server";
import { mapSubscription, type Subscription } from "@/types/payment";

export const getAllUserSubscriptions = async () => {
  const res = await serverTry<unknown[]>("/api/billing/subscriptions/");
  if ("error" in res) {
    if (res.error.toLowerCase().includes("not authenticated")) return { error: "Unauthorized" };
    return { error: "Failed to fetch subscriptions" };
  }
  return { subscriptions: res.data.map(mapSubscription) as Subscription[] };
};
