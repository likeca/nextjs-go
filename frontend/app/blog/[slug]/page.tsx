import { notFound } from 'next/navigation';
import { serverTry } from '@/lib/api/server';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import type { Metadata } from 'next';
import DOMPurify from 'isomorphic-dompurify';
import { JsonLd } from '@/components/json-ld';
import { articleSchema, breadcrumbSchema } from '@/lib/seo';
import { appConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  author: { name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const res = await serverTry<BlogPost>(`/api/blogs/slug/${slug}/`);
  const post = 'error' in res ? null : res.data;

  if (!post) return { title: 'Post not found' };

  const url = `${appConfig.url}/blog/${slug}`;

  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    keywords: ['blog', 'article', 'SaaS', slug.replace(/-/g, ' ')],
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      url,
      type: 'article',
      siteName: appConfig.name,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt ?? undefined,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const res = await serverTry<BlogPost>(`/api/blogs/slug/${slug}/`);
  const post = 'error' in res ? null : res.data;

  if (!post) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <JsonLd
        data={[
          articleSchema({
            title: post.title,
            description: post.excerpt ?? '',
            slug: post.slug,
            authorName: post.author?.name ?? undefined,
            publishedAt: new Date(post.createdAt).toISOString(),
            modifiedAt: post.updatedAt ? new Date(post.updatedAt).toISOString() : undefined,
          }),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Blog', path: '/blog' },
            { name: post.title, path: `/blog/${post.slug}` },
          ]),
        ]}
      />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            {post.author?.name && <span>By {post.author.name}</span>}
            <span>·</span>
            <time>
              {new Date(post.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">{post.title}</h1>
          {post.excerpt && <p className="mt-4 text-xl text-muted-foreground">{post.excerpt}</p>}
        </div>
        <div
          className="prose prose-neutral dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(post.content, {
              ALLOWED_TAGS: [
                'p',
                'b',
                'i',
                'em',
                'strong',
                'a',
                'ul',
                'ol',
                'li',
                'h1',
                'h2',
                'h3',
                'h4',
                'h5',
                'h6',
                'img',
                'blockquote',
                'code',
                'pre',
              ],
              ALLOWED_ATTR: ['href', 'src', 'alt', 'class'],
              ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|ftp):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
            }),
          }}
        />
        <div className="mt-12 pt-6 border-t">
          <a href="/blog" className="text-sm text-primary hover:underline">
            ← Back to Blog
          </a>
        </div>
      </main>
      <Footer />
    </div>
  );
}
