import { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { Mail, Phone, MapPin, Clock, Globe, MessageCircle } from 'lucide-react';
import { IconBrandMeta } from '@tabler/icons-react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ContactForm } from '@/components/contact-form';
import { getPublicSettings } from '@/actions/settings/get-public-settings';
import { auth } from '@/lib/auth';
import { isUserAdmin } from '@/lib/auth-utils';
import { appConfig } from '@/lib/config';

import { buildMetadata } from '@/lib/seo';
import { meta } from 'zod/v4/core';

export const metadata: Metadata = buildMetadata({
  title: `Contact Us \u2014 ${appConfig.name}`,
  description: `Get in touch with ${appConfig.name}. We'd love to hear from you \u2014 send us a message, ask a question, or request support.`,
  path: '/contact',
  keywords: ['contact', 'support', 'help', 'get in touch', 'customer service'],
});

const SOCIAL_ICONS = {
  meta: IconBrandMeta,
  facebook: Globe,
  // facebook: Facebook,
  // twitter: Twitter,
  // instagram: Instagram,
  // linkedin: Linkedin,
  // youtube: Youtube,
} as const;

const SOCIAL_LABELS: Record<string, string> = {
  meta: 'Meta',
  facebook: 'Facebook',
  // twitter: 'Twitter / X',
  // instagram: 'Instagram',
  // linkedin: 'LinkedIn',
  // youtube: 'YouTube',
  // tiktok: 'TikTok',
};

const FALLBACK_EMAIL = process.env.EMAIL_FROM || 'support@example.com';
const FALLBACK_ADDRESS = 'Remote-first company, worldwide';

export default async function ContactPage() {
  const [sessionResult, settingsResult] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getPublicSettings(),
  ]);

  const session = sessionResult;
  const isAdmin = await isUserAdmin(session?.user?.id);

  const settings =
    'success' in settingsResult && settingsResult.success ? settingsResult.data : null;

  const fullAddress = settings
    ? [settings.address, settings.city, settings.state, settings.zipCode, settings.country]
        .filter(Boolean)
        .join(', ')
    : null;

  const socialLinks = settings
    ? (
        [
          ['meta', settings.meta],
          ['facebook', settings.facebook],
          // ['twitter', settings.twitter],
          // ['instagram', settings.instagram],
          // ['linkedin', settings.linkedin],
          // ['youtube', settings.youtube],
          // ['tiktok', settings.tiktok],
        ] as [string, string][]
      ).filter(([, url]) => Boolean(url))
    : [];

  const contactEmail = settings?.email || FALLBACK_EMAIL;
  const contactAddress = fullAddress || FALLBACK_ADDRESS;

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={session?.user} isAdmin={isAdmin} />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b bg-muted/30 py-16 text-center">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Contact Us</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Have a question or want to work with us? We&apos;d love to hear from you.
            </p>
          </div>
        </section>

        {/* Contact Info + Form */}
        <section className="container mx-auto px-4 py-16">
          <div className="grid gap-10 lg:grid-cols-5">
            {/* Left column \u2014 contact details */}
            <div className="space-y-8 lg:col-span-2">
              <div>
                <h2 className="text-xl font-semibold mb-2">Get in Touch</h2>
                <p className="text-sm text-muted-foreground mb-4">{appConfig.description}</p>
                <ul className="space-y-4 text-sm">
                  <li className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-0.5">
                        Email
                      </p>
                      <a
                        href={`mailto:${contactEmail}`}
                        className="hover:underline"
                        aria-label={`Email us at ${contactEmail}`}
                      >
                        {contactEmail}
                      </a>
                    </div>
                  </li>

                  {settings?.phone && (
                    <li className="flex items-start gap-3">
                      <Phone className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-0.5">
                          Phone
                        </p>
                        <a
                          href={`tel:${settings.phone}`}
                          className="hover:underline"
                          aria-label={`Call us at ${settings.phone}`}
                        >
                          {settings.phone}
                        </a>
                      </div>
                    </li>
                  )}

                  {settings?.whatsappNumber && (
                    <li className="flex items-start gap-3">
                      <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-0.5">
                          WhatsApp
                        </p>
                        <a
                          href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                          aria-label={`Chat on WhatsApp`}
                        >
                          {settings.whatsappNumber}
                        </a>
                      </div>
                    </li>
                  )}

                  <li className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-0.5">
                        Address
                      </p>
                      <address className="not-italic">{contactAddress}</address>
                    </div>
                  </li>

                  {settings?.businessHours && (
                    <li className="flex items-start gap-3">
                      <Clock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-0.5">
                          Business Hours
                        </p>
                        <p className="whitespace-pre-line">{settings.businessHours}</p>
                      </div>
                    </li>
                  )}
                </ul>
              </div>

              {/* Social Media */}
              {socialLinks.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Follow Us</h2>
                  <ul className="space-y-3">
                    {socialLinks.map(([platform, url]) => {
                      const Icon = SOCIAL_ICONS[platform as keyof typeof SOCIAL_ICONS] ?? Globe;
                      return (
                        <li key={platform}>
                          <Link
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 text-sm hover:text-foreground text-muted-foreground transition-colors group"
                            aria-label={`Follow us on ${SOCIAL_LABELS[platform] ?? platform}`}
                          >
                            <Icon className="h-5 w-5 shrink-0 group-hover:text-foreground" />
                            <span>{SOCIAL_LABELS[platform] ?? platform}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {/* Right column \u2014 contact form */}
            <div className="lg:col-span-3">
              <ContactForm />
            </div>
          </div>
        </section>

        {/* Google Maps */}
        {settings?.googleMapsUrl && (
          <section className="border-t">
            <div className="container mx-auto px-4 py-16">
              <h2 className="text-xl font-semibold mb-6">Find Us</h2>
              <div className="overflow-hidden rounded-xl border">
                <iframe
                  src={settings.googleMapsUrl}
                  width="100%"
                  height="400"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Our location on Google Maps"
                  aria-label="Google Maps showing our location"
                />
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
