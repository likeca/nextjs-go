'use server';

import { serverTry } from '@/lib/api/server';
import { mapBlog } from '@/types/blog';

interface CreateBlogInput {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  published?: boolean;
  tags?: string[];
}

export async function createBlog(data: CreateBlogInput) {
  const { title, slug, content, excerpt, coverImage, published = false, tags = [] } = data;

  if (!title || !slug || !content) {
    return { error: 'Title, slug, and content are required' };
  }

  const res = await serverTry<Parameters<typeof mapBlog>[0]>('/api/blogs/', {
    method: 'POST',
    body: {
      title,
      slug,
      content,
      excerpt: excerpt || null,
      coverImage: coverImage || null,
      published,
      tags,
    },
  });

  if ('error' in res) {
    return { error: res.error };
  }
  return { success: 'Blog created successfully', blog: mapBlog(res.data) };
}
