import type { Metadata } from 'next';
import { Outfit, DM_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { CookieConsent } from '@/components/cookie-consent';
import { PostHogConsent } from '@/components/posthog-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { appConfig } from '@/lib/config';
import './globals.css';

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  display: 'swap',
});

const dmMono = DM_Mono({
  variable: '--font-dm-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
});

const siteUrl = appConfig.url;

export const metadata: Metadata = {
  title: {
    default: `${appConfig.name} — Launch Your SaaS Faster`,
    template: `%s | ${appConfig.name}`,
  },
  description:
    'Ship your SaaS in days, not months. Production-ready Next.js starter with authentication, Stripe payments, admin dashboard, blog CMS, RBAC, and 50+ components.',
  keywords: [
    'SaaS',
    'Next.js',
    'boilerplate',
    'starter kit',
    'TypeScript',
    'authentication',
    'Stripe',
    'admin dashboard',
    'React',
    'Tailwind CSS',
    'Prisma',
    'shadcn/ui',
    'RBAC',
  ],
  authors: [{ name: appConfig.company.name, url: siteUrl }],
  creator: appConfig.company.name,
  publisher: appConfig.company.name,
  metadataBase: new URL(siteUrl),
  alternates: { canonical: siteUrl },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    title: `${appConfig.name} — Launch Your SaaS Faster`,
    description:
      'Ship your SaaS in days, not months. Production-ready Next.js starter with authentication, Stripe payments, admin dashboard, blog CMS, RBAC, and 50+ components.',
    siteName: appConfig.name,
    images: [{ url: `${siteUrl}/logo.svg`, width: 512, height: 512, alt: `${appConfig.name} Logo` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${appConfig.name} — Launch Your SaaS Faster`,
    description:
      'Ship your SaaS in days, not months. Production-ready Next.js starter with auth, Stripe, admin dashboard, blog CMS & 50+ components.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.variable} ${dmMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <PostHogConsent />
          {children}
          <Toaster />
          <CookieConsent />
        </ThemeProvider>
      </body>
    </html>
  );
}
