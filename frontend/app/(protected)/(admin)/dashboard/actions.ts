"use server"

import { serverTry } from "@/lib/api/server"

interface DashboardStats {
  totalUsers: number
  activeSubscriptions: number
  totalRevenue: number
  recentUsers: { id: string; name: string; email: string; createdAt: string }[]
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await serverTry<DashboardStats>("/api/dashboard/stats/")
  if ("error" in res) {
    return { totalUsers: 0, activeSubscriptions: 0, totalRevenue: 0, recentUsers: [] }
  }
  return res.data
}
