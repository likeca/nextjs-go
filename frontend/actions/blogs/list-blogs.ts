'use server';

import { serverTry } from '@/lib/api/server';
import { mapBlog } from '@/types/blog';

interface ListBlogsParams {
  page?: number;
  limit?: number;
  filters?: {
    title?: string;
    authorId?: string;
    published?: string;
    tags?: string;
  };
}

interface PaginatedBlogs {
  count: number;
  results: Parameters<typeof mapBlog>[0][];
}

export async function listBlogs(params?: ListBlogsParams) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;
  const filters = params?.filters ?? {};

  const res = await serverTry<PaginatedBlogs>('/api/blogs/', {
    query: {
      page,
      search: filters.title,
      authorId: filters.authorId,
      published: filters.published,
      tags: filters.tags,
    },
  });

  if ('error' in res) {
    return {
      error: 'Failed to fetch blogs: ' + res.error,
      blogs: [],
      pagination: { page: 1, limit, total: 0, totalPages: 0 },
    };
  }

  const total = res.data.count;
  return {
    success: true,
    blogs: res.data.results.map(mapBlog),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
