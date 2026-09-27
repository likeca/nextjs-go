import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface SectionCardsProps {
  stats?: {
    totalUsers: number
    activeSubscriptions: number
    totalRevenue: number
  }
}

export function SectionCards({ stats }: SectionCardsProps) {
  // Payment amounts are stored in cents — convert to dollars
  const totalRevenueDollars = ((stats?.totalRevenue ?? 0) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const totalUsers = stats?.totalUsers ?? 0
  const activeSubscriptions = stats?.activeSubscriptions ?? 0
  const conversionRate =
    totalUsers > 0
      ? ((activeSubscriptions / totalUsers) * 100).toFixed(1)
      : null

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Revenue</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            ${totalRevenueDollars}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              Live
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Succeeded payments <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Aggregated from all payment records
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Users</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {totalUsers.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              Live
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Registered accounts <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            All-time user count
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Subscriptions</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {activeSubscriptions.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              Live
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Active paying subscribers <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Current active subscriptions
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Conversion Rate</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {conversionRate !== null ? `${conversionRate}%` : "N/A"}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {conversionRate !== null && parseFloat(conversionRate) >= 5 ? (
                <>
                  <IconTrendingUp />
                  Healthy
                </>
              ) : (
                <>
                  <IconTrendingDown />
                  Watch
                </>
              )}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Active subs / total users <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Subscription conversion rate
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
