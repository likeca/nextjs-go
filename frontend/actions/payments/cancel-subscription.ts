"use server";

import { serverTry } from "@/lib/api/server";

export const cancelSubscription = async (subscriptionId: string) => {
  const res = await serverTry("/api/billing/cancel/", {
    method: "POST",
    body: { subscriptionId },
  });
  if ("error" in res) {
    if (res.error.toLowerCase().includes("not authenticated")) return { error: "Authentication required" };
    return { error: res.error || "Unable to cancel subscription" };
  }
  return { success: true };
};
