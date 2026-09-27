import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { OrganizationManager } from "@/components/organization-manager"

export const metadata = {
  title: "Organizations",
  description: "Manage your teams and organizations",
}

export default async function OrganizationsPage() {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  if (!session) redirect("/login")

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
          <div className="mb-2">
            <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
            <p className="text-muted-foreground mt-2">
              Create and manage organizations to collaborate with your team.
            </p>
          </div>
          <OrganizationManager />
        </div>
      </div>
    </div>
  )
}
