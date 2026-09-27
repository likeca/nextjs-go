'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePermission } from '@/hooks/use-permission';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { createBlog } from '@/actions/blogs/create-blog';
import { IconArrowLeft } from '@tabler/icons-react';
import { z } from 'zod';
import { TiptapEditor } from '@/components/tiptap-editor';
import { Badge } from '@/components/ui/badge';
import { IconX } from '@tabler/icons-react';

export default function NewBlogPage() {
  const schema = z.object({
    title: z.string().min(1, "Title is required"),
    slug: z.string().min(1, "Slug is required"),
    content: z.string().min(1, "Content is required"),
    excerpt: z.string().optional(),
    coverImage: z.string().url("Invalid URL").optional().or(z.literal('')),
  });

  const router = useRouter();
  const { isLoading: checkingPermission, hasPermission } = usePermission('blog', 'create');
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [published, setPublished] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Auto-generate slug from title
  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slug) {
      const generatedSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generatedSlug);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate using schema
    const validation = schema.safeParse({
      title,
      slug,
      content,
      excerpt,
      coverImage,
    });

    if (!validation.success) {
      const errors = validation.error.flatten();
      if (errors.fieldErrors.title) toast.error(errors.fieldErrors.title[0]);
      if (errors.fieldErrors.slug) toast.error(errors.fieldErrors.slug[0]);
      if (errors.fieldErrors.content) toast.error(errors.fieldErrors.content[0]);
      if (errors.fieldErrors.excerpt) toast.error(errors.fieldErrors.excerpt[0]);
      if (errors.fieldErrors.coverImage) toast.error(errors.fieldErrors.coverImage[0]);
      return;
    }

    setSubmitting(true);

    try {
      const result = await createBlog({
        title,
        slug,
        content,
        excerpt: excerpt || undefined,
        coverImage: coverImage || undefined,
        published,
        tags,
      });

      if (result.success) {
        toast.success(result.success);
        router.push('/blogs');
      } else if (result.error) {
        toast.error(result.error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
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
                  <BreadcrumbLink href="/blogs">Blogs</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>New Blog</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Header and Content */}
          <div className="px-4 lg:px-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold">Create New Blog</h1>
                <p className="text-sm text-muted-foreground">Add a new blog post</p>
              </div>
              <div>
                <Button size="sm" variant="outline" onClick={() => router.push('/blogs')}>
                  <IconArrowLeft className="mr-2 h-4 w-4" />
                  Back to Blogs
                </Button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="w-full space-y-6">
              {/* Basic Information */}
              <div className="space-y-4 p-6 border rounded-lg">
                <h2 className="text-lg font-semibold">Basic Information</h2>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">
                      Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="title"
                      placeholder="Enter blog title"
                      value={title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="slug">
                      Slug <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="slug"
                      placeholder="blog-post-slug"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      URL-friendly version of the title. Auto-generated from title.
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="excerpt">
                      Excerpt
                    </Label>
                    <Input
                      id="excerpt"
                      placeholder="Brief description of the blog post"
                      value={excerpt}
                      onChange={(e) => setExcerpt(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      A short summary displayed in blog listings.
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="coverImage">
                      Cover Image URL
                    </Label>
                    <Input
                      id="coverImage"
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="tags">
                      Tags
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="tags"
                        placeholder="Add a tag and press Enter"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                      />
                      <Button type="button" size="sm" onClick={handleAddTag}>
                        Add
                      </Button>
                    </div>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {tag}
                            <IconX
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => handleRemoveTag(tag)}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-4 p-6 border rounded-lg">
                <h2 className="text-lg font-semibold">
                  Content <span className="text-red-500">*</span>
                </h2>
                <TiptapEditor
                  content={content}
                  onChange={setContent}
                  placeholder="Start writing your blog post..."
                />
              </div>

              {/* Publishing Options */}
              <div className="space-y-4 p-6 border rounded-lg">
                <h2 className="text-lg font-semibold">Publishing Options</h2>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="published"
                    checked={published}
                    onCheckedChange={setPublished}
                  />
                  <Label htmlFor="published" className="cursor-pointer">
                    Publish immediately
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  If unchecked, the blog will be saved as a draft.
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={() => router.push('/blogs')}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" size="lg" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Blog'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
