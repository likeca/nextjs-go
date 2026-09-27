import { Skeleton } from "@/components/ui/skeleton"

export function BlogCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="p-6 space-y-3">
        {/* Author + date */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-28" />
        </div>
        {/* Title */}
        <Skeleton className="h-6 w-4/5" />
        {/* Excerpt */}
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
        {/* Read more */}
        <Skeleton className="h-4 w-20 mt-1" />
      </div>
    </div>
  )
}

export function BlogPageSkeleton() {
  return (
    <main className="flex-1 container mx-auto px-4 py-12">
      {/* Heading */}
      <div className="mb-10 space-y-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Grid of blog card skeletons */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <BlogCardSkeleton key={`skeleton-blog-card-${i}`} />
        ))}
      </div>
    </main>
  )
}
