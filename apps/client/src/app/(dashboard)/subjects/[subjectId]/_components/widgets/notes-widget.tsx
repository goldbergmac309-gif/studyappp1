"use client"

import { useState } from "react"

export function NotesWidget({ initialText }: { initialText?: string }) {
  const [text, setText] = useState(initialText ?? "")
  return (
    <div className="p-3 h-full w-full bg-background">
      <textarea
        className="h-full w-full resize-none outline-none bg-transparent"
        placeholder="Write notes..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </div>
  )
}
