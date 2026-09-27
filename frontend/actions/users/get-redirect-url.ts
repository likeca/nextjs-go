"use server";

import { serverTry } from "@/lib/api/server";

/**
 * Get the appropriate redirect URL based on the user's admin status.
 * @returns The URL to redirect to after login
 */
export async function getRedirectUrl(): Promise<string> {
  const res = await serverTry<{ isAdmin: boolean }>("/api/auth/user/");
  if ("error" in res) {
    return "/login";
  }
  // Redirect admins to dashboard, non-admins to profile
  return res.data.isAdmin ? "/dashboard" : "/profile";
}
