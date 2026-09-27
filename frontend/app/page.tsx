import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { appConfig } from '@/lib/config';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { isUserAdmin } from '@/lib/auth-utils';
import { PricingSection } from '@/components/pricing-section';
import { FeaturesSection } from '@/components/features-section';
import { TestimonialsSection } from '@/components/testimonials-section';
import { FaqSection } from '@/components/faq-section';
import { JsonLd } from '@/components/json-ld';
import { buildMetadata, organizationSchema, webSiteSchema, softwareAppSchema, faqSchema } from '@/lib/seo';

import { BackendExecuteButton } from './execute';
import { GroupsButton } from './groups';

export const metadata = buildMetadata({
  title: `${appConfig.name} — Launch Your SaaS Faster`,
  description:
    'Ship your SaaS in days, not months. Production-ready Next.js starter with authentication, Stripe payments, admin dashboard, blog CMS, RBAC, and 50+ components.',
  path: '/',
  keywords: [
    'SaaS boilerplate',
    'Next.js starter kit',
    'Stripe payments',
    'admin dashboard',
    'RBAC',
    'blog CMS',
    'authentication',
    'shadcn/ui',
    'Tailwind CSS',
    'Prisma ORM',
    'production ready',
    'open source',
  ],
});

const homeFaqs = [
  {
    question: "What's included in this boilerplate?",
    answer:
      'Authentication (email/password, OTP, social login), Stripe payments, role-based access control, admin dashboard, blog CMS, email templates, and much more.',
  },
  {
    question: 'Can I use this for commercial projects?',
    answer:
      'Yes! This boilerplate is designed for commercial SaaS products. You own the code and can use it however you like.',
  },
  {
    question: 'How do I customize the branding?',
    answer:
      'Update the .env file with your app name and URL. All branding references use the central config, so changing it in one place updates the entire app.',
  },
  {
    question: 'Does it support multiple pricing plans?',
    answer:
      'Yes. The Stripe integration supports multiple plans with different features. You can configure your plans in the Stripe dashboard.',
  },
  {
    question: 'Is there admin support?',
    answer:
      "Yes, there's a full admin panel with user management, role/permission editor, blog management, and application settings.",
  },
  {
    question: 'What database is supported?',
    answer: 'PostgreSQL via Prisma ORM. The Prisma adapter makes it easy to switch to other databases if needed.',
  },
];

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const isAdmin = await isUserAdmin(session?.user?.id);

  return (
    <div className="flex min-h-screen flex-col">
      <JsonLd data={[organizationSchema(), webSiteSchema(), softwareAppSchema(), faqSchema(homeFaqs)]} />
      <Header user={session?.user} isAdmin={isAdmin} />

      <main className="flex flex-col">
        {/* Hero Section */}
        <section className="flex flex-1 flex-col items-center justify-center px-4 py-24 sm:py-32 text-center">
          <div className="mx-auto max-w-2xl space-y-6 animate-fade-in-up">
            <p className="text-sm font-medium text-muted-foreground tracking-wide">
              {'\uD83D\uDE80'} Production-ready SaaS boilerplate
            </p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Launch your SaaS faster than ever
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">{appConfig.description}</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center pt-2 animate-fade-in-up delay-100">
              <Button size="lg" asChild>
                <Link href="/signup">Get Started Free</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#features">Learn More</Link>
              </Button>
              {/* <BackendExecuteButton /> */}
              <GroupsButton />
            </div>
          </div>
        </section>

        <FeaturesSection />
        <TestimonialsSection />

        {/* Pricing Section */}
        <PricingSection isLoggedIn={!!session} />

        <FaqSection />
      </main>

      <Footer />
    </div>
  );
}
