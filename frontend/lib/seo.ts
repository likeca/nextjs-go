import { appConfig } from "@/lib/config";
import type { Metadata } from "next";

const baseUrl = appConfig.url;

// ─── Reusable metadata builder ──────────────────────────────────────────────
type PageSeoOptions = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  noIndex?: boolean;
  ogType?: "website" | "article";
  ogImage?: string;
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
};

export const buildMetadata = ({
  title,
  description,
  path,
  keywords = [],
  noIndex = false,
  ogType = "website",
  ogImage,
  publishedTime,
  modifiedTime,
  authors,
}: PageSeoOptions): Metadata => {
  const url = `${baseUrl}${path}`;
  const defaultKeywords = [
    "SaaS",
    "Next.js",
    "boilerplate",
    "starter kit",
    "TypeScript",
    "React",
  ];

  return {
    title,
    description,
    keywords: [...defaultKeywords, ...keywords],
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: appConfig.name,
      type: ogType,
      locale: "en_US",
      ...(ogImage && { images: [{ url: ogImage, width: 1200, height: 630, alt: title }] }),
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
      ...(authors && { authors }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(ogImage && { images: [ogImage] }),
    },
    ...(noIndex && {
      robots: { index: false, follow: false },
    }),
  };
};

// ─── JSON-LD Schema Generators ──────────────────────────────────────────────

export const organizationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: appConfig.company.name,
  url: baseUrl,
  logo: `${baseUrl}/logo.svg`,
  contactPoint: {
    "@type": "ContactPoint",
    email: appConfig.supportEmail,
    contactType: "customer support",
  },
  ...(appConfig.company.twitter && {
    sameAs: [
      appConfig.company.twitter,
      appConfig.company.github,
      appConfig.company.linkedin,
    ].filter(Boolean),
  }),
});

export const webSiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: appConfig.name,
  url: baseUrl,
  description: appConfig.description,
  publisher: { "@type": "Organization", name: appConfig.company.name },
  potentialAction: {
    "@type": "SearchAction",
    target: `${baseUrl}/blog?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
});

export const webPageSchema = (name: string, description: string, path: string) => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  name,
  description,
  url: `${baseUrl}${path}`,
  isPartOf: { "@type": "WebSite", url: baseUrl },
  publisher: { "@type": "Organization", name: appConfig.company.name },
});

export const breadcrumbSchema = (items: { name: string; path: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: `${baseUrl}${item.path}`,
  })),
});

export const faqSchema = (items: { question: string; answer: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
});

export const articleSchema = (article: {
  title: string;
  description: string;
  slug: string;
  authorName?: string;
  publishedAt: string;
  modifiedAt?: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: article.title,
  description: article.description,
  url: `${baseUrl}/blog/${article.slug}`,
  datePublished: article.publishedAt,
  ...(article.modifiedAt && { dateModified: article.modifiedAt }),
  author: {
    "@type": "Person",
    name: article.authorName ?? appConfig.company.name,
  },
  publisher: {
    "@type": "Organization",
    name: appConfig.company.name,
    logo: { "@type": "ImageObject", url: `${baseUrl}/logo.svg` },
  },
  isPartOf: { "@type": "WebSite", url: baseUrl },
});

export const softwareAppSchema = () => ({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: appConfig.name,
  description: appConfig.description,
  url: baseUrl,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
});
