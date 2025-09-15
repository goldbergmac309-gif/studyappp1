"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { LayoutDashboard, BookText, Settings as SettingsIcon, User } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { usePathname } from "next/navigation"
import { listSubjects } from "@/lib/api"
import type { Subject } from "@/lib/types"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function AppSidebar() {
  const { state } = useSidebar()
  const collapsed = state === "collapsed"
  const pathname = usePathname()
  const [recent, setRecent] = useState<Subject[]>([])
  const [recentLoading, setRecentLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        setRecentLoading(true)
        const data = await listSubjects('recent')
        if (!cancelled) setRecent(data.slice(0, 5))
      } catch {
        // silent
      } finally {
        if (!cancelled) setRecentLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  const navLink = (href: string, icon: React.ReactNode, label: string) => {
    const active = pathname === href || (href !== "/" && pathname?.startsWith(href))
    const linkEl = (
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 rounded-md transition-colors",
          collapsed ? "justify-center p-2" : "px-3 py-2",
          active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent"
        )}
        aria-current={active ? "page" : undefined}
        aria-label={label}
      >
        {icon}
        {!collapsed && <span>{label}</span>}
      </Link>
    )

    if (!collapsed) return linkEl
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
          <TooltipContent side="right" align="center">{label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <nav className="text-sm text-sidebar-foreground">
      <SidebarContent>
        <SidebarHeader>
          <div className={cn("pb-2", collapsed ? "px-0" : "px-2")}>
            <div className="text-lg font-semibold tracking-tight">{collapsed ? "S" : "Synapse"}</div>
          </div>
        </SidebarHeader>

        <SidebarGroup>
          <SidebarGroupLabel>{!collapsed ? "Navigation" : null}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                {navLink("/dashboard", <LayoutDashboard className="h-4 w-4 opacity-80" />, "Dashboard")}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>{!collapsed ? "Subjects" : null}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                {navLink("/subjects", <BookText className="h-4 w-4 opacity-80" />, "All subjects")}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && (
          <SidebarGroup>
            <SidebarGroupLabel>Recent</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {(recent || []).map((s) => (
                  <SidebarMenuItem key={s.id}>
                    {navLink(`/subjects/${s.id}`, <BookText className="h-4 w-4 opacity-70" />, s.name)}
                  </SidebarMenuItem>
                ))}
                {!recentLoading && recent.length === 0 && (
                  <div className="px-3 py-1.5 text-xs text-muted-foreground">No recent</div>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>{!collapsed ? "Account" : null}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                {navLink("/profile", <User className="h-4 w-4 opacity-80" />, "Profile")}
              </SidebarMenuItem>
              <SidebarMenuItem>
                {navLink("/settings", <SettingsIcon className="h-4 w-4 opacity-80" />, "Settings")}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarFooter />
      </SidebarContent>
      <SidebarRail />
    </nav>
  )
}
