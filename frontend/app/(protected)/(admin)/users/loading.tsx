import { TableSkeleton } from "@/components/skeletons/table-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

export default function UsersLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {/* Breadcrumb skeleton */}
          <div className="px-4 lg:px-6">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-3" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>

          <div className="px-4 lg:px-6">
            {/* Header skeleton */}
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-1">
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>

            {/* Table skeleton */}
            <TableSkeleton columns={7} rows={8} />
          </div>
        </div>
      </div>
    </div>
  )
}
