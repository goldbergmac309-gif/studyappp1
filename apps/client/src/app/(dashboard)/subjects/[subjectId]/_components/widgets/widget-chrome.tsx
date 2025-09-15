"use client"

import { CSSProperties, ReactNode } from "react"
import { EllipsisVertical, Settings } from "lucide-react"

interface WidgetChromeProps {
  title: string
  subtitle?: string
  icon?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  style?: CSSProperties
}

// A lightweight, reusable chrome that standardizes header spacing, title row, and body padding
// It intentionally avoids adding external borders/shadows because the outer CanvasGrid wrapper
// already provides those. Interactive controls are marked as no-drag.
export function WidgetChrome({ title, subtitle, icon, actions, children, className, style }: WidgetChromeProps) {
  return (
    <div className={"h-full w-full flex flex-col " + (className ?? "") } style={style}>
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          {icon ? <div className="text-foreground/70">{icon}</div> : null}
          <div className="leading-tight">
            <div className="text-sm font-semibold text-foreground">{title}</div>
            {subtitle ? <div className="text-xs text-foreground/60">{subtitle}</div> : null}
          </div>
        </div>
        <div className="flex items-center gap-1 no-drag">
          {actions}
          <button className="rounded-md p-1.5 hover:bg-black/5" aria-label="Settings">
            <Settings className="h-4 w-4 text-foreground/60" />
          </button>
          <button className="rounded-md p-1.5 hover:bg-black/5" aria-label="More">
            <EllipsisVertical className="h-4 w-4 text-foreground/60" />
          </button>
        </div>
      </div>
      <div className="px-4 pb-4 flex-1 min-h-0">
        {children}
      </div>
    </div>
  )
}
