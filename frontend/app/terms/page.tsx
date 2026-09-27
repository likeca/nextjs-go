import { Metadata } from "next";
import { headers } from "next/headers";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { appConfig } from "@/lib/config";
import { auth } from "@/lib/auth";
import { isUserAdmin } from "@/lib/auth-utils";

import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: `Terms of Service \u2014 ${appConfig.name}`,
  description: `Read the Terms of Service for ${appConfig.name}. Learn about our policies, user responsibilities, and service agreements.`,
  path: "/terms",
  keywords: ["terms of service", "legal", "user agreement", "policies"],
});

export default async function TermsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const isAdmin = await isUserAdmin(session?.user?.id);

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={session?.user} isAdmin={isAdmin} />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated:{" "}
          {new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using this service, you accept and agree to be bound by the terms and
              provision of this agreement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Use License</h2>
            <p className="text-muted-foreground leading-relaxed">
              Permission is granted to temporarily download one copy of the materials on our website
              for personal, non-commercial transitory viewing only.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              When you create an account with us, you must provide information that is accurate,
              complete, and current at all times. You are responsible for safeguarding your account
              credentials.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Prohibited Activities</h2>
            <p className="text-muted-foreground leading-relaxed">
              You may not use our service for any illegal or unauthorized purpose nor may you violate
              any laws in your jurisdiction when using the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              In no event shall we be liable for any indirect, incidental, special, exemplary, or
              consequential damages arising out of or in connection with your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these terms at any time. We will notify users of any
              material changes by updating the date at the top of this page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms, please contact us through our{" "}
              <a href="/contact" className="text-primary underline underline-offset-4">
                contact page
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
