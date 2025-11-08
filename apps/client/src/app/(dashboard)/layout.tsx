"use client"

import { PropsWithChildren, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import api from "@/lib/api"
import AppSidebar from "@/app/(dashboard)/_components/sidebar"
import Header from "@/app/(dashboard)/_components/header"
import { Skeleton } from "@/components/ui/skeleton"
import { Sidebar, SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AiConsentModal } from "@/components/consent/AiConsentModal"

export default function ProtectedLayout({ children }: PropsWithChildren) {
  const { token, hydrated, actions } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [clientReady, setClientReady] = useState(false)
  // Sidebar open state is managed by SidebarProvider internally

  useEffect(() => { setClientReady(true) }, [])

  useEffect(() => {
    if (!clientReady) return
    if (token) return
    // E2E/Test harness bypass: if a flag is present, seed auth from localStorage immediately.
    try {
      const e2eBypass =
        (typeof window !== 'undefined' && (window as any).__E2E_AUTH__ === true) ||
        process.env.NEXT_PUBLIC_E2E_AUTH === '1'
      if (e2eBypass) {
        const raw = typeof window !== 'undefined' ? window.localStorage.getItem('studyapp-auth') : null
        if (raw) {
          try {
            const obj = JSON.parse(raw)
            const st = (obj && (obj.state || obj)) || {}
            const t = (st && (st.token || obj?.token)) as string | undefined
            const u = (st && st.user) as { id: string; email: string; hasConsentedToAi: boolean } | undefined
            if (t) {
              const user = u ?? { id: 'mock-user', email: 'mock@test.local', hasConsentedToAi: false }
              actions.login(t, user)
              return
            }
          } catch {}
        }
      }
    } catch {}
    // Attempt silent refresh using httpOnly cookie
    void (async () => {
      try {
        const res = await api.post<{ accessToken: string; user: { id: string; email: string; hasConsentedToAi: boolean } }>(
          "/auth/refresh-token",
          {},
        )
        const { accessToken, user } = res.data || ({} as any)
        if (accessToken && user) {
          // seed in-memory token for this session
          actions.login(accessToken, user)
          return
        }
      } catch (err) {
        // Transitional bridge for MOCK/E2E only: seed in-memory auth from localStorage if token exists.
        if (process.env.NODE_ENV !== 'production') {
          try {
            const raw = typeof window !== 'undefined' ? window.localStorage.getItem('studyapp-auth') : null
            if (raw) {
              const obj = JSON.parse(raw)
              const st = (obj && (obj.state || obj)) || {}
              const t = (st && st.token) || obj?.token
              const u = (st?.user || obj?.user) as { id: string; email: string; hasConsentedToAi: boolean } | undefined
              if (t) {
                const user = u ?? { id: 'mock-user', email: 'mock@test.local', hasConsentedToAi: false }
                actions.login(t as string, user)
                return
              }
            }
          } catch {}
          // Dev auto-login: use env-provided credentials to log in (and optionally sign up) automatically
          try {
            const email = process.env.NEXT_PUBLIC_DEV_AUTO_LOGIN_EMAIL
            const password = process.env.NEXT_PUBLIC_DEV_AUTO_LOGIN_PASSWORD
            const autoSignup = process.env.NEXT_PUBLIC_DEV_AUTO_SIGNUP === '1' || process.env.NEXT_PUBLIC_DEV_AUTO_SIGNUP === 'true'
            if (email && password) {
              try {
                const res = await api.post<{ accessToken: string; user: { id: string; email: string; hasConsentedToAi: boolean } }>(
                  '/auth/login',
                  { email, password },
                )
                const { accessToken, user } = res.data || ({} as any)
                if (accessToken && user) {
                  actions.login(accessToken, user)
                  return
                }
              } catch (e) {
                if (autoSignup) {
                  try {
                    const res = await api.post<{ accessToken: string; user: { id: string; email: string; hasConsentedToAi: boolean } }>(
                      '/auth/signup',
                      { email, password },
                    )
                    const { accessToken, user } = res.data || ({} as any)
                    if (accessToken && user) {
                      actions.login(accessToken, user)
                      return
                    }
                  } catch {}
                }
              }
            }
          } catch {}
        }
      }
      const to = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : ""
      // Use both Next router and hard navigation to guarantee redirect under all runtimes
      try { router.replace(`/login${to}`) } catch {}
      try { if (typeof window !== 'undefined') window.location.replace(`/login${to}`) } catch {}
    })()
  }, [clientReady, token, router, pathname])

  // Sidebar persistence handled by SidebarProvider

  if (!clientReady) {
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

  if (!hydrated) return null
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
          <AiConsentModal />
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
