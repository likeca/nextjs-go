'use server';

import { serverTry } from '@/lib/api/server';
import { mapBlog } from '@/types/blog';

interface UpdateBlogInput {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  published?: boolean;
  tags?: string[];
}

export async function updateBlog(data: UpdateBlogInput) {
  const { id, title, slug, content, excerpt, coverImage, published, tags = [] } = data;

  if (!id || !title || !slug || !content) {
    return { error: 'ID, title, slug, and content are required' };
  }

  const res = await serverTry<Parameters<typeof mapBlog>[0]>(`/api/blogs/${id}/`, {
    method: 'PATCH',
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
    return { error: res.error === 'Not found.' ? 'Blog not found' : res.error };
  }
  return { success: 'Blog updated successfully', blog: mapBlog(res.data) };
}
