"use server";

import { serverTry } from "@/lib/api/server";

export const createCheckoutSession = async (planId: string) => {
  if (!planId || typeof planId !== "string") {
    return { error: "Invalid plan" };
  }

  const res = await serverTry<{ url: string }>("/api/billing/checkout/", {
    method: "POST",
    body: { planId },
  });

  if ("error" in res) {
    if (res.error.toLowerCase().includes("not authenticated")) return { error: "Authentication required" };
    return { error: res.error || "Unable to process request" };
  }
  return { url: res.data.url };
};
