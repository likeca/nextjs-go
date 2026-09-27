"use server";

import { serverTry } from "@/lib/api/server";

export const createBillingPortalSession = async () => {
  const res = await serverTry<{ url: string }>("/api/billing/portal/", { method: "POST" });
  if ("error" in res) {
    if (res.error.toLowerCase().includes("not authenticated")) return { error: "Authentication required" };
    return { error: res.error || "Unable to access billing portal" };
  }
  return { url: res.data.url };
};
