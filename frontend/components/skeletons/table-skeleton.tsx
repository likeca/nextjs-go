import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface TableSkeletonProps {
  columns?: number
  rows?: number
}

export function TableSkeleton({ columns = 7, rows = 8 }: TableSkeletonProps) {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: columns }).map((_, i) => (
              <TableHead key={`skeleton-header-${i}`}>
                <Skeleton className="h-4 w-20" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={`skeleton-row-${i}`}>
              {Array.from({ length: columns }).map((_, j) => (
                <TableCell key={`skeleton-cell-${i}-${j}`}>
                  <Skeleton className="h-4 w-full max-w-[160px]" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function TableSkeletonRows({ columns = 7, rows = 5 }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={`skeleton-row-${i}`}>
          {Array.from({ length: columns }).map((_, j) => (
            <TableCell key={`skeleton-cell-${i}-${j}`}>
              <Skeleton className="h-4 w-full max-w-[160px]" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}
