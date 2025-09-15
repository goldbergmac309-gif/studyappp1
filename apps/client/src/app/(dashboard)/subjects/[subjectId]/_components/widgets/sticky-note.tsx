"use client"

import { useEffect, useRef, useState } from "react"
import { updateWidget } from "@/lib/api"
import { WidgetChrome } from "./widget-chrome"

interface StickyNoteWidgetProps {
  widgetId: string
  subjectId: string
  initialText?: string
  color?: string
  autoFocus?: boolean
}

export function StickyNoteWidget({ widgetId, subjectId, initialText, color, autoFocus }: StickyNoteWidgetProps) {
  const [text, setText] = useState(initialText ?? "")
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Debounced save
  useEffect(() => {
    const handle = setTimeout(async () => {
      setSaving(true)
      try {
        await updateWidget(subjectId, widgetId, { content: { text } })
      } catch {
        // swallow for now
      } finally {
        setSaving(false)
      }
    }, 500)
    return () => clearTimeout(handle)
  }, [text, subjectId, widgetId])

  return (
    <WidgetChrome
      title="Sticky Note"
      actions={<div className="text-xs text-foreground/60 pr-1">{saving ? "Saving…" : ""}</div>}
      style={{ backgroundColor: color ?? "#FEF08A" }}
      className="shadow-lift"
    >
      <textarea
        ref={textareaRef}
        className="no-drag h-[140px] w-full resize-none rounded-md bg-transparent p-2 text-sm outline-none placeholder:text-foreground/60"
        placeholder="Jot something down…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus={autoFocus}
      />
    </WidgetChrome>
  )
}
