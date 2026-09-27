import { Metadata } from "next";
import { headers } from "next/headers";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { appConfig } from "@/lib/config";
import { auth } from "@/lib/auth";
import { isUserAdmin } from "@/lib/auth-utils";

import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: `Privacy Policy \u2014 ${appConfig.name}`,
  description: `Read the Privacy Policy for ${appConfig.name}. Learn how we collect, use, and protect your personal data.`,
  path: "/privacy",
  keywords: ["privacy policy", "data protection", "GDPR", "personal data"],
});

export default async function PrivacyPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const isAdmin = await isUserAdmin(session?.user?.id);

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={session?.user} isAdmin={isAdmin} />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
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
            <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed">
              We collect information you provide directly to us, such as when you create an account,
              make a purchase, or contact us for support. This includes your name, email address, and
              payment information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use the information we collect to provide, maintain, and improve our services,
              process transactions, send you technical notices and support messages, and respond to
              your comments and questions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies and similar tracking technologies to track activity on our service and
              hold certain information. You can instruct your browser to refuse all cookies or to
              indicate when a cookie is being sent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              The security of your data is important to us. We use industry-standard encryption and
              security practices, but no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may employ third-party companies and individuals to facilitate our service. These
              third parties have access to your Personal Information only to perform these tasks on
              our behalf.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              You have the right to access, correct, or delete your personal data. To exercise these
              rights, please contact us through our contact page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us through our{" "}
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
