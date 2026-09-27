import { BillingPageSkeleton } from "@/components/skeletons/billing-skeleton"

export default function BillingLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <BillingPageSkeleton />
    </div>
  )
}
