"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import api from "@/lib/api"

export type HealthStatus = "loading" | "ok" | "degraded"

export interface HealthInfo {
  status: HealthStatus
  lastCheckedAt: number | null
  details?: unknown
}

export function useServiceHealth(pollMs = 15000) {
  const [info, setInfo] = useState<HealthInfo>({ status: "loading", lastCheckedAt: null })
  const timer = useRef<NodeJS.Timeout | null>(null)

  const fetchHealth = useMemo(
    () => async () => {
      try {
        const res = await api.get("/health/ready", { timeout: 8000 })
        const ok = res.status === 200 && (res.data?.status === "ok" || res.data?.status === "up")
        setInfo({ status: ok ? "ok" : "degraded", lastCheckedAt: Date.now(), details: res.data })
      } catch (e: unknown) {
        setInfo({ status: "degraded", lastCheckedAt: Date.now(), details: (e as Error).message })
      }
    },
    []
  )

  useEffect(() => {
    // initial fetch
    fetchHealth()
    // polling
    timer.current = setInterval(fetchHealth, Math.max(5000, pollMs))
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [fetchHealth, pollMs])

  return info
}
