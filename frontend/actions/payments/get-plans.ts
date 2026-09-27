"use server";

import { serverTry } from "@/lib/api/server";
import { mapPlan, type Plan } from "@/types/payment";

export const getActivePlans = async () => {
  const res = await serverTry<unknown[]>("/api/billing/plans/");
  if ("error" in res) {
    return { error: "Failed to fetch plans", plans: [] as Plan[] };
  }
  return { plans: res.data.map(mapPlan) };
};
