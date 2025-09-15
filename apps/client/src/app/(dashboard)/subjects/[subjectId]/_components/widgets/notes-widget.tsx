"use client"

import { useState } from "react"
import { WidgetChrome } from "./widget-chrome"

export function NotesWidget({ initialText }: { initialText?: string }) {
  const [text, setText] = useState(initialText ?? "")
  return (
    <WidgetChrome title="Notes" className="shadow-lift">
      <textarea
        className="no-drag h-[160px] w-full resize-none rounded-md border bg-background p-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        placeholder="Write notes..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </WidgetChrome>
  )
}
