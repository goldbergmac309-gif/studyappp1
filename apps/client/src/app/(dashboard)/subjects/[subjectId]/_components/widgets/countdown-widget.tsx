"use client"

import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { updateWidget } from "@/lib/api"
import { WidgetChrome } from "./widget-chrome"

export function CountdownWidget({ widgetId, subjectId, targetDate, title }: { widgetId: string; subjectId: string; targetDate?: string; title?: string }) {
  const [date, setDate] = useState<string>(targetDate ?? "")
  const [heading, setHeading] = useState<string>(title ?? "Exam")

  const daysRemaining = useMemo(() => {
    if (!date) return null
    const t = new Date(date)
    if (isNaN(t.getTime())) return null
    const now = new Date()
    const diff = t.getTime() - now.getTime()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }, [date])

  useEffect(() => {
    const handle = setTimeout(() => {
      updateWidget(subjectId, widgetId, { content: { targetDate: date, title: heading } }).catch(() => {})
    }, 400)
    return () => clearTimeout(handle)
  }, [date, heading, subjectId, widgetId])

  return (
    <WidgetChrome title="Exam Countdown" className="shadow-lift">
      <div className="space-y-4">
        <div className="flex items-center gap-2 no-drag">
          <Input value={heading} onChange={(e) => setHeading(e.target.value)} placeholder="Title" />
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex items-baseline gap-3">
          <div className="text-5xl font-semibold tracking-tight">
            {daysRemaining === null ? "—" : daysRemaining}
          </div>
          <div className="text-sm text-muted-foreground">days remaining</div>
        </div>
      </div>
    </WidgetChrome>
  )
}
