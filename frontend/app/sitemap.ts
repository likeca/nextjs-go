import type { MetadataRoute } from "next";

import { serverTry } from "@/lib/api/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const now = new Date();

  // Fetch published blog posts (from Django) for dynamic sitemap entries
  let blogEntries: MetadataRoute.Sitemap = [];
  const res = await serverTry<{ results: { slug: string; createdAt: string; updatedAt: string }[] }>(
    "/api/blogs/",
    { query: { published: "true" } },
  );
  if (!("error" in res)) {
    blogEntries = res.data.results.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.updatedAt ?? post.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  }

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...blogEntries,
  ];
}
