import { ProfilePageSkeleton } from "@/components/skeletons/form-skeleton"

export default function ProfileLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <ProfilePageSkeleton />
    </div>
  )
}
