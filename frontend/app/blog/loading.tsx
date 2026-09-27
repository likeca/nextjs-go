import { BlogPageSkeleton } from "@/components/skeletons/blog-skeleton"

export default function BlogLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <BlogPageSkeleton />
    </div>
  )
}
