'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermission } from '@/hooks/use-permission';
import { IconPlus, IconPencil, IconTrash, IconEye } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { listBlogs } from '@/actions/blogs/list-blogs';
import { deleteBlog } from '@/actions/blogs/delete-blog';
import { BlogFilters, BlogFilterValues } from './filters';
import { formatDate } from '@/lib/utils';

interface Blog {
  id: string;
  title: string;
  slug: string;
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

export default function BlogsPage() {
  const router = useRouter();
  const { isLoading: checkingPermission, hasPermission } = usePermission('blog', 'read');
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingBlogId, setDeletingBlogId] = useState<string | null>(null);
  const [filters, setFilters] = useState<BlogFilterValues>({
    title: '',
    authorId: 'all',
    published: 'all',
    tags: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadBlogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage, filters]);

  const loadBlogs = async () => {
    setLoading(true);
    const result = await listBlogs({
      page: currentPage,
      limit: itemsPerPage,
      filters: {
        title: filters.title,
        authorId: filters.authorId,
        published: filters.published,
        tags: filters.tags,
      },
    });
    if (result.success) {
      setBlogs(result.blogs);
      setTotalPages(result.pagination.totalPages);
      setTotalCount(result.pagination.total);
    } else if (result.error) {
      toast.error(result.error);
    }
    setLoading(false);
  };

  const handleFilterChange = (newFilters: BlogFilterValues) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Calculate display indices
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalCount);

  const handleDeleteClick = (id: string) => {
    setDeletingBlogId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingBlogId) return;

    try {
      const result = await deleteBlog(deletingBlogId);

      if (result.success) {
        toast.success(result.success);
        loadBlogs();
      } else if (result.error) {
        toast.error(result.error);
      }
    } finally {
      setDeleteDialogOpen(false);
      setDeletingBlogId(null);
    }
  };

  return (
    <>
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {/* Breadcrumb */}
          <div className="px-4 lg:px-6">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>Blogs</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>

              {/* Header and Content */}
              <div className="px-4 lg:px-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-2xl font-semibold">Blogs</h1>
                    <p className="text-sm text-muted-foreground">
                      Manage blog posts
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <BlogFilters
                      onFilterChange={handleFilterChange}
                      currentFilters={filters}
                    />
                    <Button size="sm" onClick={() => router.push('/blogs/new')}>
                      <IconPlus className="mr-2 h-4 w-4" />
                      Add Blog
                    </Button>
                  </div>
                </div>

                {/* Table */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Author</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead>Published At</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : blogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            {totalCount === 0
                              ? 'No blogs found. Click "Add Blog" to create one.'
                              : 'No blogs match the current filters.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        blogs.map((blog) => (
                          <TableRow key={blog.id}>
                            <TableCell className="font-medium">{blog.title}</TableCell>
                            <TableCell>{blog.author.name}</TableCell>
                            <TableCell>
                              <Badge variant={blog.published ? 'default' : 'secondary'}>
                                {blog.published ? 'Published' : 'Draft'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {blog.tags.length > 0 ? (
                                  blog.tags.slice(0, 2).map((tag, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-sm text-muted-foreground">No tags</span>
                                )}
                                {blog.tags.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{blog.tags.length - 2}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {blog.publishedAt ? formatDate(blog.publishedAt) : '-'}
                            </TableCell>
                            <TableCell>
                              {formatDate(blog.createdAt)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => router.push(`/blogs/${blog.id}`)}
                                >
                                  <IconPencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteClick(blog.id)}
                                >
                                  <IconTrash className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls */}
                {totalCount > 0 && (
                  <div className="flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Showing {startIndex + 1} to {endIndex} of {totalCount} blogs
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Items per page:</span>
                        <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the blog post.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingBlogId(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
