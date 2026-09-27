import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function OrganizationCardSkeleton() {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={`skeleton-member-${i}`} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function OrganizationPageSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
          {/* Heading */}
          <div className="mb-2 space-y-2">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-80" />
          </div>

          {/* Create org button area */}
          <div className="flex justify-end">
            <Skeleton className="h-9 w-44" />
          </div>

          {/* Organization cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <OrganizationCardSkeleton key={`skeleton-org-card-${i}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
