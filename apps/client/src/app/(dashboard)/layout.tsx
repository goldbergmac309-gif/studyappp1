"use client"

import { PropsWithChildren, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import AppSidebar from "@/app/(dashboard)/_components/sidebar"
import Header from "@/app/(dashboard)/_components/header"
import { Skeleton } from "@/components/ui/skeleton"
import { Sidebar, SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function ProtectedLayout({ children }: PropsWithChildren) {
  const { token } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [hydrated, setHydrated] = useState(false)
  // Sidebar open state is managed by SidebarProvider internally

  useEffect(() => { setHydrated(true) }, [])

  useEffect(() => {
    if (!hydrated) return
    if (!token) {
      const to = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : ""
      router.replace(`/login${to}`)
    }
  }, [hydrated, token, router, pathname])

  // Sidebar persistence handled by SidebarProvider

  if (!hydrated) {
    return (
      <div className="min-h-screen grid grid-cols-1 md:grid-cols-[272px_1fr]">
        <aside className="hidden md:block bg-sidebar" />
        <main className="p-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!token) return null

  // AppShell: Sidebar + Inset content
  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen bg-background">
        <Sidebar>
          <AppSidebar />
        </Sidebar>
        <SidebarInset>
          <Header />
          <div className="mx-auto max-w-7xl w-full p-6 md:p-8 lg:p-10">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
