"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { updateWidget } from "@/lib/api"
import { WidgetChrome } from "./widget-chrome"

interface TaskItem { id: string; text: string; done: boolean }

export function TasksWidget({ widgetId, subjectId, initialItems }: { widgetId: string; subjectId: string; initialItems: TaskItem[] }) {
  const [items, setItems] = useState<TaskItem[]>(Array.isArray(initialItems) ? initialItems : [])
  const [draft, setDraft] = useState("")

  // Persist on items change (debounced)
  useEffect(() => {
    const handle = setTimeout(() => {
      updateWidget(subjectId, widgetId, { content: { items } }).catch(() => {})
    }, 500)
    return () => clearTimeout(handle)
  }, [items, subjectId, widgetId])

  function addItem() {
    if (!draft.trim()) return
    setItems((prev) => [...prev, { id: crypto.randomUUID(), text: draft.trim(), done: false }])
    setDraft("")
  }

  function toggle(id: string) {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <WidgetChrome title="Tasks" className="shadow-lift">
      <div className="space-y-3">
        <div className="flex items-center gap-2 no-drag">
          <Input placeholder="Add task…" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addItem() }} />
          <Button onClick={addItem}>Add</Button>
        </div>
        <ul className="space-y-1.5">
          {items.map((t) => (
            <li key={t.id} className="flex items-center justify-between rounded-md border bg-card/60 px-3 py-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} className="accent-[var(--accent)] h-4 w-4" />
                <span className={t.done ? "line-through text-muted-foreground" : ""}>{t.text}</span>
              </label>
              <button className="text-xs text-muted-foreground hover:underline no-drag" onClick={() => remove(t.id)}>Remove</button>
            </li>
          ))}
        </ul>
      </div>
    </WidgetChrome>
  )
}
