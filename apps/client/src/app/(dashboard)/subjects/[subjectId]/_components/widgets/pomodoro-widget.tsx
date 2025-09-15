"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { updateWidget } from "@/lib/api"
import { WidgetChrome } from "./widget-chrome"

export function PomodoroWidget({ widgetId, subjectId, initialMinutes = 25 }: { widgetId: string; subjectId: string; initialMinutes?: number }) {
  const [minutes, setMinutes] = useState(initialMinutes)
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (running) {
      timerRef.current = window.setInterval(() => {
        setSeconds((s) => {
          if (s > 0) return s - 1
          if (minutes > 0) {
            setMinutes((m) => m - 1)
            return 59
          }
          // finished
          setRunning(false)
          return 0
        })
      }, 1000)
    }
    return () => { if (timerRef.current) window.clearInterval(timerRef.current) }
  }, [running, minutes])

  // Persist configured minutes
  useEffect(() => {
    const handle = setTimeout(() => { updateWidget(subjectId, widgetId, { content: { minutes } }).catch(() => {}) }, 400)
    return () => clearTimeout(handle)
  }, [minutes, subjectId, widgetId])

  function toggle() { setRunning((r) => !r) }
  function reset() { setRunning(false); setMinutes(initialMinutes); setSeconds(0) }

  const mm = String(minutes).padStart(2, "0")
  const ss = String(seconds).padStart(2, "0")

  return (
    <WidgetChrome title="Pomodoro" className="shadow-lift">
      <div className="space-y-3">
        <div className="text-4xl font-semibold tracking-tight">{mm}:{ss}</div>
        <div className="flex items-center gap-2 no-drag">
          <Button onClick={toggle}>{running ? "Pause" : "Start"}</Button>
          <Button variant="outline" onClick={reset}>Reset</Button>
        </div>
      </div>
    </WidgetChrome>
  )
}
