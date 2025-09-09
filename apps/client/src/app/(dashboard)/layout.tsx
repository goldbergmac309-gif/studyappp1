"use client"

import { PropsWithChildren, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import Header from "@/app/(dashboard)/_components/header"
import Sidebar from "@/app/(dashboard)/_components/sidebar"
import HealthBanner from "@/components/health-banner"

export default function ProtectedLayout({ children }: PropsWithChildren) {
  const { token } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [hydrated, setHydrated] = useState(false)

  // Ensure we only check auth after client hydration (persist rehydration)
  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (!token) {
      // Preserve intended destination in query if needed later
      const to = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : ""
      router.replace(`/login${to}`)
    }
  }, [hydrated, token, router, pathname])

  if (!hydrated) {
    return (
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
          <Separator />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!token) {
    // While we redirect, render nothing to avoid flicker
    return null
  }

  // Authenticated shell
  return (
    <div className="min-h-screen">
      <HealthBanner />
      <Header />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-4 md:grid-cols-[220px_1fr] md:px-6 md:py-6">
        <aside className="hidden md:block">
          <Sidebar />
        </aside>
        <main className="space-y-6 md:space-y-8">{children}</main>
      </div>
    </div>
  )
}
