"use client"

import { TriangleAlert } from "lucide-react"
import { useServiceHealth } from "@/hooks/use-service-health"
import clsx from "clsx"

export default function HealthBanner() {
  const health = useServiceHealth()

  if (health.status === "loading" || health.status === "ok") return null

  return (
    <div
      className={clsx(
        "w-full border-b",
        "bg-amber-50 text-amber-900 border-amber-200",
      )}
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 text-sm md:px-6">
        <TriangleAlert className="h-4 w-4" aria-hidden />
        <span className="font-medium">Service health: Degraded</span>
        <span className="text-amber-800/80">Some dependencies are unavailable. Functionality may be limited.</span>
      </div>
    </div>
  )
}
