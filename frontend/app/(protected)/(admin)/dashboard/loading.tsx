import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {/* Section cards skeleton */}
          <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border p-6 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
          {/* Chart skeleton */}
          <div className="px-4 lg:px-6">
            <div className="rounded-xl border p-6">
              <Skeleton className="h-4 w-48 mb-2" />
              <Skeleton className="h-3 w-64 mb-6" />
              <Skeleton className="h-[200px] w-full" />
            </div>
          </div>
          {/* Table skeleton */}
          <div className="px-4 lg:px-6">
            <div className="rounded-xl border">
              <div className="p-4 border-b">
                <Skeleton className="h-4 w-32" />
              </div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
