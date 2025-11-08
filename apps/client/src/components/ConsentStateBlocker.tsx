"use client"

import React from "react"
import { useConsentStore } from "@/lib/consent-store"

export function ConsentStateBlocker() {
  const isConsenting = useConsentStore((s) => s.isConsenting)
  if (!isConsenting) return null
  return (
    <div
      data-testid="consent-blocker"
      aria-hidden="true"
      className="fixed inset-0 z-40 bg-black/30 pointer-events-auto"
      // Capture any click/wheel to block underlying UI during consent
      onClick={(e) => e.preventDefault()}
      onMouseDown={(e) => e.preventDefault()}
      onMouseUp={(e) => e.preventDefault()}
      onWheel={(e) => e.preventDefault()}
    />
  )
}
