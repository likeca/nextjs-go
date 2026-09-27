// App configuration from environment variables
export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "SaaS App",
  description: process.env.NEXT_PUBLIC_APP_DESCRIPTION || "A production-ready SaaS boilerplate",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  logo: process.env.NEXT_PUBLIC_APP_LOGO || "/logo.png",
  supportEmail: process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM || "support@example.com",
  company: {
    name: process.env.NEXT_PUBLIC_COMPANY_NAME || process.env.NEXT_PUBLIC_APP_NAME || "SaaS App",
    address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || "Remote-first company",
    twitter: process.env.NEXT_PUBLIC_TWITTER_URL,
    github: process.env.NEXT_PUBLIC_GITHUB_URL,
    linkedin: process.env.NEXT_PUBLIC_LINKEDIN_URL,
  },
  nav: {
    marketing: [
      { href: "/#features", label: "Features" },
      { href: "/#pricing", label: "Pricing" },
      { href: "/blog", label: "Blog" },
      { href: "/contact", label: "Contact" },
    ],
    legal: [
      { href: "/terms", label: "Terms of Service" },
      { href: "/privacy", label: "Privacy Policy" },
    ],
  },
  features: {
    blog: true,
    socialLogin: !!(process.env.GOOGLE_CLIENT_ID || process.env.GITHUB_CLIENT_ID),
    twoFactor: true,
    apiKeys: true,
    analytics: !!(
      process.env.NEXT_PUBLIC_POSTHOG_KEY ||
      process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
      process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN
    ),
  },
} as const

export const COOKIE_CONSENT_KEY = "cookie-consent"
