import { redirect } from "next/navigation";
import { getRedirectUrl } from "@/actions/users/get-redirect-url";

export default async function CallbackPage() {
  // Get the appropriate redirect URL based on user's admin status
  const redirectUrl = await getRedirectUrl();
  redirect(redirectUrl);
}
