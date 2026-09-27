import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function FormSkeleton() {
  return (
    <div className="space-y-6">
      {/* Avatar + name row */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>

      {/* Field rows */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={`skeleton-field-${i}`} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}

      {/* Submit button */}
      <Skeleton className="h-9 w-28" />
    </div>
  )
}

export function ProfilePageSkeleton() {
  return (
    <div className="container max-w-4xl mx-auto flex-1 py-10 px-4">
      {/* Heading */}
      <div className="mb-8 space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Tabs bar */}
      <div className="flex gap-2 mb-6">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>

      {/* Profile card */}
      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <FormSkeleton />
        </CardContent>
      </Card>
    </div>
  )
}
