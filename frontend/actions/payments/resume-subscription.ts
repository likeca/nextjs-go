"use server";

import { serverTry } from "@/lib/api/server";

export const resumeSubscription = async (subscriptionId: string) => {
  const res = await serverTry("/api/billing/resume/", {
    method: "POST",
    body: { subscriptionId },
  });
  if ("error" in res) {
    if (res.error.toLowerCase().includes("not authenticated")) return { error: "Unauthorized" };
    return { error: res.error || "Failed to resume subscription" };
  }
  return { success: true };
};
