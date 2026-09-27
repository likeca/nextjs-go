"use client"

import * as React from "react"
import {
  IconDashboard,
  IconUsers,
  IconShield,
  IconSettings,
  IconArticle,
  type Icon,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Logo } from "@/components/logo"

// Icon mapping to avoid passing component classes through props
const iconMap: Record<string, Icon> = {
  dashboard: IconDashboard,
  users: IconUsers,
  blogs: IconArticle,
  accessControl: IconShield,
  settings: IconSettings,
}

const navMainData: Array<{
  title: string
  url: string
  iconKey: keyof typeof iconMap
  items?: Array<{
    title: string
    url: string
  }>
}> = [
  {
    title: "Dashboard",
    url: "/dashboard",
    iconKey: "dashboard",
  },
  {
    title: "Users",
    url: "/users",
    iconKey: "users",
    items: [
      {
        title: "All Users",
        url: "/users",
      },
      {
        title: "Create User",
        url: "/users/new",
      },
    ],
  },
  {
    title: "Blogs",
    url: "/blogs",
    iconKey: "blogs",
    items: [
      {
        title: "All Blogs",
        url: "/blogs",
      },
      {
        title: "Create Blog",
        url: "/blogs/new",
      },
    ],
  },
  {
    title: "Access Control",
    url: "/roles",
    iconKey: "accessControl",
    items: [
      {
        title: "Roles",
        url: "/roles",
      },
      {
        title: "Permissions",
        url: "/permissions",
      },
    ],
  },
  {
    title: "Settings",
    url: "/settings",
    iconKey: "settings",
  },
]

export function AppSidebar({ 
  user,
  ...props 
}: React.ComponentProps<typeof Sidebar> & {
  user?: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  } | null;
}) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Logo href="/dashboard" className="text-base font-semibold" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainData.map(item => ({
          ...item,
          icon: iconMap[item.iconKey]
        }))} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{
          name: user?.name || "Guest",
          email: user?.email || "guest@example.com",
          avatar: user?.image || "",
          initials: user?.name ? getInitials(user.name) : "GU",
        }} />
      </SidebarFooter>
    </Sidebar>
  )
}
