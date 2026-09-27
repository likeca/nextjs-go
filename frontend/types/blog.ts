/** Shared Blog shape returned by the blog server actions (dates as Date, matching
 *  the previous Prisma contract so consuming pages stay unchanged). */
export interface Blog {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  coverImage: string | null;
  author: {
    id: string;
    name: string;
    email: string;
  };
  published: boolean;
  publishedAt: Date | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface RawBlog {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  coverImage: string | null;
  author: { id: string; name: string; email: string };
  published: boolean;
  publishedAt: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/** Convert the Django JSON payload (ISO date strings) into the Blog shape. */
export function mapBlog(raw: RawBlog): Blog {
  return {
    id: raw.id,
    title: raw.title,
    slug: raw.slug,
    content: raw.content,
    excerpt: raw.excerpt,
    coverImage: raw.coverImage,
    author: raw.author,
    published: raw.published,
    publishedAt: raw.publishedAt ? new Date(raw.publishedAt) : null,
    tags: raw.tags ?? [],
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  };
}
