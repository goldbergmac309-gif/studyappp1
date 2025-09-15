"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { updateWidget } from "@/lib/api"
import { WidgetChrome } from "./widget-chrome"

export function ProgressWidget({ widgetId, subjectId, label: initialLabel = "Progress", value: initialValue = 40 }: { widgetId: string; subjectId: string; label?: string; value?: number }) {
  const [label, setLabel] = useState(initialLabel)
  const [value, setValue] = useState<number>(initialValue)

  // Persist changes (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      updateWidget(subjectId, widgetId, { content: { label, value } }).catch(() => {})
    }, 400)
    return () => clearTimeout(t)
  }, [label, value, subjectId, widgetId])

  return (
    <WidgetChrome title={label} className="shadow-lift">
      <div className="space-y-3">
        <div className="no-drag">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div className="flex items-center gap-3 no-drag">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={value}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(Number(e.target.value))}
            className="w-full"
          />
          <div className="w-10 text-right text-xs text-muted-foreground">{value}%</div>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${value}%` }} />
        </div>
      </div>
    </WidgetChrome>
  )
}
