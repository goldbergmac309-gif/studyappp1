"use client"

import { WidgetChrome } from "./widget-chrome"

export function CalendarMonthWidget() {
  // Placeholder minimalist calendar grid for current month
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const firstDay = new Date(year, month, 1)
  const startWeekday = firstDay.getDay() // 0-6
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: Array<{ label: string; muted?: boolean }> = []
  for (let i = 0; i < startWeekday; i++) cells.push({ label: "", muted: true })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ label: String(d) })
  while (cells.length % 7 !== 0) cells.push({ label: "", muted: true })

  return (
    <WidgetChrome title="This Month" className="shadow-lift">
      <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground">
        {["S","M","T","W","T","F","S"].map((d) => (
          <div key={d} className="px-2 py-1 text-center font-medium">{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((c, i) => (
          <div key={i} className={`h-8 rounded-md border text-center text-xs leading-8 ${c.muted ? 'text-muted-foreground' : ''}`}>{c.label}</div>
        ))}
      </div>
    </WidgetChrome>
  )
}
