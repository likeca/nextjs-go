'use server';

import { serverTry } from '@/lib/api/server';
import { mapBlog } from '@/types/blog';

export async function getBlog(id: string) {
  if (!id) {
    return { error: 'Blog ID is required' };
  }

  const res = await serverTry<Parameters<typeof mapBlog>[0]>(`/api/blogs/${id}/`);
  if ('error' in res) {
    return { error: res.error === 'Not found.' ? 'Blog not found' : res.error };
  }
  return { success: true, blog: mapBlog(res.data) };
}
