'use server';

import { serverTry } from '@/lib/api/server';

export async function deleteBlog(id: string) {
  if (!id) {
    return { error: 'Blog ID is required' };
  }

  const res = await serverTry(`/api/blogs/${id}/`, { method: 'DELETE' });
  if ('error' in res) {
    return { error: res.error === 'Not found.' ? 'Blog not found' : res.error };
  }
  return { success: 'Blog deleted successfully' };
}
