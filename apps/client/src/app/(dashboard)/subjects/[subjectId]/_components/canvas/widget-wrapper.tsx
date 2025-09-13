"use client"

import { PropsWithChildren } from "react"

export function WidgetWrapper({ children }: PropsWithChildren) {
  return (
    <div className="h-full w-full rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden">
      {children}
    </div>
  )
}
