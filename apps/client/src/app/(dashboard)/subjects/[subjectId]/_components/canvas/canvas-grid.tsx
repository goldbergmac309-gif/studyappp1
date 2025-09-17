"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import dynamic from "next/dynamic"
import type { Layout, Layouts, ResponsiveProps } from "react-grid-layout"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"
import { NotesWidget } from "../widgets/notes-widget"
import { MindMapWidget } from "../widgets/mind-map-widget"
import { StickyNoteWidget } from "../widgets/sticky-note"
import { TasksWidget } from "../widgets/tasks-widget"
import { CountdownWidget } from "../widgets/countdown-widget"
import { PomodoroWidget } from "../widgets/pomodoro-widget"
import { CalendarMonthWidget } from "../widgets/calendar-month-widget"
import { MusicPlayerWidget } from "../widgets/music-player-widget"
import { LinkTileWidget } from "../widgets/link-tile-widget"
import { ProgressWidget } from "../widgets/progress-widget"
import { getSubjectWorkspace, patchWorkspaceLayout, addWidget, deleteWidget, getBoardConfig, patchBoardConfig, updateWidget } from "@/lib/api"
import type { WidgetInstanceDto, UpdateWorkspaceLayoutDto, BoardConfigDto } from "@studyapp/shared-types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Trash2, Copy } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"

// react-grid-layout has SSR issues; load it dynamically on client
const ResponsiveGridLayout = dynamic<ResponsiveProps>(
  async () => {
    const m = await import("react-grid-layout")
    return m.WidthProvider(m.Responsive) as unknown as React.ComponentType<ResponsiveProps>
  },
  { ssr: false },
)

function readContentString(content: unknown, key: string, fallback = ""): string {
  if (content && typeof content === "object") {
    const v = (content as Record<string, unknown>)[key]
    if (typeof v === "string") return v
  }
  return fallback
}

function readContentNumber(content: unknown, key: string, fallback = 0): number {
  if (content && typeof content === "object") {
    const v = (content as Record<string, unknown>)[key]
    if (typeof v === "number" && Number.isFinite(v)) return v
  }
  return fallback
}

function readContentArray<T = unknown>(content: unknown, key: string): T[] {
  if (content && typeof content === "object") {
    const v = (content as Record<string, unknown>)[key]
    if (Array.isArray(v)) return v as T[]
  }
  return []
}

function WidgetView({ w, subjectId, autoFocusId }: { w: WidgetInstanceDto; subjectId: string; autoFocusId?: string | null }) {
  switch (w.type) {
    case "NOTES":
      return (
        <NotesWidget initialText={readContentString(w.content as unknown, "text", "")} />
      )
    case "MIND_MAP":
      return (
        <MindMapWidget nodesCount={readContentArray(w.content as unknown, "nodes").length || undefined} />
      )
    case "STICKY_NOTE":
      return (
        <StickyNoteWidget
          widgetId={w.id}
          subjectId={subjectId}
          color={typeof w.style?.bg === 'string' ? w.style.bg : undefined}
          initialText={readContentString(w.content as unknown, 'text', '')}
          autoFocus={autoFocusId === w.id}
        />
      )
    case "TASKS":
      return (
        <TasksWidget
          widgetId={w.id}
          subjectId={subjectId}
          initialItems={readContentArray(w.content as unknown, 'items') as { id: string; text: string; done: boolean }[]}
        />
      )
    case "COUNTDOWN":
      return (
        <CountdownWidget
          widgetId={w.id}
          subjectId={subjectId}
          targetDate={readContentString(w.content as unknown, 'targetDate', '')}
          title={readContentString(w.content as unknown, 'title', 'Exam')}
        />
      )
    case "POMODORO":
      return (
        <PomodoroWidget
          widgetId={w.id}
          subjectId={subjectId}
          initialMinutes={readContentNumber(w.content as unknown, 'minutes', 25)}
        />
      )
    case "CALENDAR_MONTH":
      return (<CalendarMonthWidget />)
    case "MUSIC_PLAYER":
      return (
        <MusicPlayerWidget
          widgetId={w.id}
          subjectId={subjectId}
          playlistUrl={readContentString(w.content as unknown, 'playlistUrl', '')}
        />
      )
    case "LINK_TILE":
      return (
        <LinkTileWidget
          widgetId={w.id}
          subjectId={subjectId}
          url={readContentString(w.content as unknown, 'url', '')}
          title={readContentString(w.content as unknown, 'title', '')}
        />
      )
    case "PROGRESS":
      return (
        <ProgressWidget
          widgetId={w.id}
          subjectId={subjectId}
          label={readContentString(w.content as unknown, 'label', 'Progress')}
          value={readContentNumber(w.content as unknown, 'value', 40)}
        />
      )
    default:
      return (
        <div className="p-3 text-sm text-muted-foreground">Unsupported widget type: {w.type}</div>
      )
  }
}

export function CanvasGrid({ subjectId, editMode }: { subjectId: string; editMode: boolean }) {
  const [widgets, setWidgets] = useState<WidgetInstanceDto[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [boardConfig, setBoardConfig] = useState<BoardConfigDto>({})
  const [autoFocusId, setAutoFocusId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [settling, setSettling] = useState<Set<string>>(new Set())
  const settleTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const prefersReduced = useReducedMotion()
  const [containerPulse, setContainerPulse] = useState(false)
  const prevPaletteOpenRef = useRef<boolean>(false)

  const scheduleLayoutSave = useCallback((payload: UpdateWorkspaceLayoutDto) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        await patchWorkspaceLayout(String(subjectId), payload)
        setSavedFlash(true)
        setTimeout(() => setSavedFlash(false), 900)
      } catch {
        /* ignore for now */
      }
    }, 250)
  }, [subjectId])

  useEffect(() => {
    let aborted = false
    const ac = new AbortController()
    Promise.all([
      getSubjectWorkspace(String(subjectId), { signal: ac.signal }),
      getBoardConfig(String(subjectId), { signal: ac.signal }).catch(() => ({} as BoardConfigDto)),
    ])
      .then((data) => {
        if (aborted) return
        const [ws, cfg] = data as [WidgetInstanceDto[], BoardConfigDto]
        setWidgets(ws)
        setBoardConfig(cfg)
      })
      .catch((e: unknown) => {
        // Swallow cancellations from AbortController (common during rapid navigation/mount-unmount)
        const errObj = (e ?? {}) as Record<string, unknown>
        const code = typeof errObj.code === 'string' ? errObj.code : (typeof errObj.name === 'string' ? (errObj.name as string) : '')
        const msg = typeof errObj.message === 'string' ? errObj.message.toLowerCase() : ''
        if (code === 'ERR_CANCELED' || msg === 'canceled' || msg === 'cancelled') {
          return
        }
        setError(e instanceof Error ? e.message : 'Failed to load workspace')
      })
    return () => {
      aborted = true
      ac.abort()
    }
  }, [subjectId])

  // Pulse the board container when the palette closes
  useEffect(() => {
    if (prevPaletteOpenRef.current && !paletteOpen) {
      setContainerPulse(true)
      const t = setTimeout(() => setContainerPulse(false), 220)
      return () => clearTimeout(t)
    }
    prevPaletteOpenRef.current = paletteOpen
  }, [paletteOpen])

  // Palette, keyboard nudge/dup/delete in edit mode
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Open palette
      if ((e.key === 'a' || e.key === 'A') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        setPaletteOpen(true)
        return
      }
      if (e.key === 'Escape') { setPaletteOpen(false); return }

      if (!editMode || !selectedId) return

      // Duplicate (Cmd/Ctrl + D)
      if ((e.key === 'd' || e.key === 'D') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        const src = Array.isArray(widgets) ? widgets.find(w => w.id === selectedId) : null
        if (!src) return
        ;(async () => {
          try {
            const created = await addWidget(String(subjectId), {
              type: src.type,
              position: { x: src.position.x, y: src.position.y + src.size.height + 1 },
              size: { ...src.size },
              content: src.content,
              style: src.style,
            })
            setWidgets(prev => Array.isArray(prev) ? [...prev, created] : [created])
            setSelectedId(created.id)
            setSavedFlash(true); setTimeout(() => setSavedFlash(false), 900)
          } catch {}
        })()
        return
      }

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        const targetId = selectedId
        ;(async () => {
          try {
            await deleteWidget(String(subjectId), targetId)
            setWidgets(prev => Array.isArray(prev) ? prev.filter(x => x.id !== targetId) : prev)
            setSelectedId(null)
            setSavedFlash(true); setTimeout(() => setSavedFlash(false), 900)
          } catch {}
        })()
        return
      }

      // Arrow nudge by 1 grid unit
      const idx = Array.isArray(widgets) ? widgets.findIndex(w => w.id === selectedId) : -1
      if (idx === -1) return
      const w = (widgets as WidgetInstanceDto[])[idx]
      let dx = 0, dy = 0
      if (e.key === 'ArrowLeft') dx = -1
      else if (e.key === 'ArrowRight') dx = 1
      else if (e.key === 'ArrowUp') dy = -1
      else if (e.key === 'ArrowDown') dy = 1
      else return
      e.preventDefault()

      const cols = 12
      const nx = Math.max(0, Math.min(cols - w.size.width, w.position.x + dx))
      const ny = Math.max(0, w.position.y + dy)
      const next = { ...w, position: { x: nx, y: ny } }
      setWidgets(prev => Array.isArray(prev) ? prev.map((it, i) => i === idx ? next : it) : prev)
      scheduleLayoutSave({ widgets: [{ id: w.id, position: next.position, size: next.size }] })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editMode, selectedId, widgets, subjectId, scheduleLayoutSave])

  const layout: Layout[] = useMemo(() => {
    if (!Array.isArray(widgets)) return []
    return widgets.map((w) => ({ i: w.id, x: w.position.x, y: w.position.y, w: w.size.width, h: w.size.height }))
  }, [widgets])

  const onDragStart = useCallback((_layout: Layout[], _old: Layout, item: Layout) => {
    setSelectedId(String(item.i))
  }, [])

  const triggerSettle = (id: string) => {
    setSettling((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
    if (settleTimersRef.current[id]) clearTimeout(settleTimersRef.current[id])
    settleTimersRef.current[id] = setTimeout(() => {
      setSettling((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      delete settleTimersRef.current[id]
    }, 260)
  }

  const onDragStop = async (_layout: Layout[], _old: Layout, item: Layout) => {
    const payload: UpdateWorkspaceLayoutDto = {
      widgets: [
        { id: String(item.i), position: { x: item.x, y: item.y }, size: { width: item.w, height: item.h } },
      ],
    }
    setWidgets((prev) =>
      Array.isArray(prev)
        ? prev.map((w) => (w.id === item.i ? { ...w, position: payload.widgets[0].position, size: payload.widgets[0].size } : w))
        : prev,
    )
    triggerSettle(String(item.i))
    scheduleLayoutSave(payload)
  }

  const onResizeStop = async (_layout: Layout[], _old: Layout, item: Layout) => {
    await onDragStop(_layout, _old, item)
    triggerSettle(String(item.i))
  }

  if (error) {
    return <div className="mb-3 text-sm text-red-600">{error}</div>
  }

  if (widgets === null) {
    return <div className="text-sm text-muted-foreground">Loading workspace…</div>
  }

  // Empty state handled by FAB/Palette

  const bgStyle = boardConfig?.background?.value
    ? { background: boardConfig.background.value }
    : undefined

  return (
    <>
    {editMode && (
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">Edit mode — drag, resize, and add widgets</div>
          <AnimatePresence mode="wait">
            {savedFlash ? (
              <motion.div
                key="saved"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: prefersReduced ? 0 : 0.18, ease: "easeOut" }}
                className="text-xs text-foreground/60"
              >
                Saved ✓
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        <Button onClick={() => setPaletteOpen(true)} className="rounded-full px-4">
          Add Widget
        </Button>
      </div>
    )}
    <Dialog open={paletteOpen} onOpenChange={setPaletteOpen}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>Customize your board</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="widgets">
          <TabsList className="mb-3">
          <TabsTrigger value="widgets">Widgets</TabsTrigger>
          <TabsTrigger value="board">Board</TabsTrigger>
        </TabsList>
        <TabsContent value="widgets">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <motion.button
            className="rounded-lg border p-4 text-left hover:bg-muted transition-colors"
            disabled={adding}
            onClick={async () => {
              setAdding(true)
              try {
                // Place at next row start
                const nextY = Array.isArray(widgets) && widgets.length > 0
                  ? Math.max(...widgets.map(w => w.position.y + w.size.height)) + 1
                  : 0
                const created = await addWidget(String(subjectId), {
                  type: 'STICKY_NOTE',
                  position: { x: 0, y: nextY },
                  size: { width: 3, height: 4 },
                  content: { text: '' },
                  style: { bg: '#FEF08A' }, // soft yellow
                })
                setWidgets(prev => Array.isArray(prev) ? [...prev, created] : [created])
                setAutoFocusId(created.id)
                setPaletteOpen(false)
              } catch (e: unknown) {
                setError(e instanceof Error ? e.message : 'Failed to add widget')
              } finally {
                setAdding(false)
              }
            }}
            whileHover={prefersReduced ? undefined : { scale: 1.02 }}
            whileTap={prefersReduced ? undefined : { scale: 0.98 }}
          >
            <div className="text-sm font-medium">Sticky Note</div>
            <div className="text-xs text-muted-foreground">Quick notes in a colorful card</div>
          </motion.button>

          <motion.button
            className="rounded-lg border p-4 text-left hover:bg-muted transition-colors"
            disabled={adding}
            onClick={async () => {
              setAdding(true)
              try {
                const nextY = Array.isArray(widgets) && widgets.length > 0
                  ? Math.max(...widgets.map(w => w.position.y + w.size.height)) + 1
                  : 0
                const created = await addWidget(String(subjectId), {
                  type: 'TASKS',
                  position: { x: 3, y: nextY },
                  size: { width: 4, height: 6 },
                  content: { items: [] },
                })
                setWidgets(prev => Array.isArray(prev) ? [...prev, created] : [created])
                setPaletteOpen(false)
              } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to add widget') } finally { setAdding(false) }
            }}
            whileHover={prefersReduced ? undefined : { scale: 1.02 }}
            whileTap={prefersReduced ? undefined : { scale: 0.98 }}
          >
            <div className="text-sm font-medium">Tasks</div>
            <div className="text-xs text-muted-foreground">Checklist of your upcoming items</div>
          </motion.button>

          <motion.button
            className="rounded-lg border p-4 text-left hover:bg-muted transition-colors"
            disabled={adding}
            onClick={async () => {
              setAdding(true)
              try {
                const nextY = Array.isArray(widgets) && widgets.length > 0
                  ? Math.max(...widgets.map(w => w.position.y + w.size.height)) + 1
                  : 0
                const created = await addWidget(String(subjectId), {
                  type: 'COUNTDOWN',
                  position: { x: 7, y: nextY },
                  size: { width: 3, height: 4 },
                  content: { title: 'Final Exam', targetDate: '' },
                })
                setWidgets(prev => Array.isArray(prev) ? [...prev, created] : [created])
                setPaletteOpen(false)
              } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to add widget') } finally { setAdding(false) }
            }}
            whileHover={prefersReduced ? undefined : { scale: 1.02 }}
            whileTap={prefersReduced ? undefined : { scale: 0.98 }}
          >
            <div className="text-sm font-medium">Countdown</div>
            <div className="text-xs text-muted-foreground">Days remaining until a date</div>
          </motion.button>

          <motion.button
            className="rounded-lg border p-4 text-left hover:bg-muted transition-colors"
            disabled={adding}
            onClick={async () => {
              setAdding(true)
              try {
                const nextY = Array.isArray(widgets) && widgets.length > 0
                  ? Math.max(...widgets.map(w => w.position.y + w.size.height)) + 1
                  : 0
                const created = await addWidget(String(subjectId), {
                  type: 'POMODORO',
                  position: { x: 0, y: nextY },
                  size: { width: 3, height: 4 },
                  content: { minutes: 25 },
                })
                setWidgets(prev => Array.isArray(prev) ? [...prev, created] : [created])
                setPaletteOpen(false)
              } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to add widget') } finally { setAdding(false) }
            }}
            whileHover={prefersReduced ? undefined : { scale: 1.02 }}
            whileTap={prefersReduced ? undefined : { scale: 0.98 }}
          >
            <div className="text-sm font-medium">Pomodoro</div>
            <div className="text-xs text-muted-foreground">25-minute focus timer</div>
          </motion.button>

          <motion.button
            className="rounded-lg border p-4 text-left hover:bg-muted transition-colors"
            disabled={adding}
            onClick={async () => {
              setAdding(true)
              try {
                const nextY = Array.isArray(widgets) && widgets.length > 0
                  ? Math.max(...widgets.map(w => w.position.y + w.size.height)) + 1
                  : 0
                const created = await addWidget(String(subjectId), {
                  type: 'CALENDAR_MONTH',
                  position: { x: 3, y: nextY },
                  size: { width: 5, height: 6 },
                  content: {},
                })
                setWidgets(prev => Array.isArray(prev) ? [...prev, created] : [created])
                setPaletteOpen(false)
              } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to add widget') } finally { setAdding(false) }
            }}
            whileHover={prefersReduced ? undefined : { scale: 1.02 }}
            whileTap={prefersReduced ? undefined : { scale: 0.98 }}
          >
            <div className="text-sm font-medium">Calendar</div>
            <div className="text-xs text-muted-foreground">This month at a glance</div>
          </motion.button>

          <motion.button
            className="rounded-lg border p-4 text-left hover:bg-muted transition-colors"
            disabled={adding}
            onClick={async () => {
              setAdding(true)
              try {
                const nextY = Array.isArray(widgets) && widgets.length > 0
                  ? Math.max(...widgets.map(w => w.position.y + w.size.height)) + 1
                  : 0
                const created = await addWidget(String(subjectId), {
                  type: 'MUSIC_PLAYER',
                  position: { x: 8, y: nextY },
                  size: { width: 4, height: 6 },
                  content: { playlistUrl: '' },
                })
                setWidgets(prev => Array.isArray(prev) ? [...prev, created] : [created])
                setPaletteOpen(false)
              } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to add widget') } finally { setAdding(false) }
            }}
            whileHover={prefersReduced ? undefined : { scale: 1.02 }}
            whileTap={prefersReduced ? undefined : { scale: 0.98 }}
          >
            <div className="text-sm font-medium">Music Player</div>
            <div className="text-xs text-muted-foreground">Paste a Spotify playlist link</div>
          </motion.button>

          <motion.button
            className="rounded-lg border p-4 text-left hover:bg-muted transition-colors"
            disabled={adding}
            onClick={async () => {
              setAdding(true)
              try {
                const nextY = Array.isArray(widgets) && widgets.length > 0
                  ? Math.max(...widgets.map(w => w.position.y + w.size.height)) + 1
                  : 0
                const created = await addWidget(String(subjectId), {
                  type: 'LINK_TILE',
                  position: { x: 0, y: nextY },
                  size: { width: 3, height: 3 },
                  content: { url: '', title: '' },
                })
                setWidgets(prev => Array.isArray(prev) ? [...prev, created] : [created])
                setPaletteOpen(false)
              } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to add widget') } finally { setAdding(false) }
            }}
            whileHover={prefersReduced ? undefined : { scale: 1.02 }}
            whileTap={prefersReduced ? undefined : { scale: 0.98 }}
          >
            <div className="text-sm font-medium">Link Tile</div>
            <div className="text-xs text-muted-foreground">Bookmark a resource</div>
          </motion.button>

          <motion.button
            className="rounded-lg border p-4 text-left hover:bg-muted transition-colors"
            disabled={adding}
            onClick={async () => {
              setAdding(true)
              try {
                const nextY = Array.isArray(widgets) && widgets.length > 0
                  ? Math.max(...widgets.map(w => w.position.y + w.size.height)) + 1
                  : 0
                const created = await addWidget(String(subjectId), {
                  type: 'PROGRESS',
                  position: { x: 6, y: nextY },
                  size: { width: 3, height: 3 },
                  content: { label: 'Progress', value: 40 },
                })
                setWidgets(prev => Array.isArray(prev) ? [...prev, created] : [created])
                setPaletteOpen(false)
              } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to add widget') } finally { setAdding(false) }
            }}
            whileHover={prefersReduced ? undefined : { scale: 1.02 }}
            whileTap={prefersReduced ? undefined : { scale: 0.98 }}
          >
            <div className="text-sm font-medium">Progress</div>
            <div className="text-xs text-muted-foreground">Track a percentage</div>
          </motion.button>
        </div>
          </TabsContent>
          <TabsContent value="board">
            <div className="space-y-3">
              <div className="text-sm font-medium">Background</div>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'Default', value: '' },
                  { name: 'Snow', value: 'linear-gradient(180deg, #ffffff, #f7f7fb)' },
                  { name: 'Lavender', value: 'linear-gradient(180deg, #f5f3ff, #eef2ff)' },
                  { name: 'Mint', value: 'linear-gradient(180deg, #ecfeff, #f0fdf4)' },
                  { name: 'Noir', value: 'linear-gradient(180deg, #0f172a, #111827)' },
                  { name: 'Blush', value: 'linear-gradient(180deg, #fff1f2, #ffe4e6)' },
                  { name: 'Sky', value: 'linear-gradient(180deg, #e0f2fe, #e0e7ff)' },
                  { name: 'Sunset', value: 'linear-gradient(180deg, #fff7ed, #ffedd5)' },
                  { name: 'Steel', value: 'linear-gradient(180deg, #f8fafc, #eef2f7)' },
                  { name: 'Gridlines', value: 'linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0)), repeating-linear-gradient(0deg, rgba(2,6,23,0.06), rgba(2,6,23,0.06) 1px, transparent 1px, transparent 20px), repeating-linear-gradient(90deg, rgba(2,6,23,0.06), rgba(2,6,23,0.06) 1px, transparent 1px, transparent 20px)' },
                ].map((opt) => (
                  <motion.button
                    key={opt.name}
                    className="h-10 w-16 rounded-md border"
                    style={{ background: opt.value || undefined }}
                    onClick={async () => {
                      const next: BoardConfigDto = opt.value
                        ? { background: { type: 'gradient', value: opt.value } }
                        : {}
                      try {
                        const saved = await patchBoardConfig(String(subjectId), next)
                        setBoardConfig(saved)
                      } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to save board') }
                    }}
                    aria-label={opt.name}
                    whileHover={prefersReduced ? undefined : { scale: 1.03 }}
                    whileTap={prefersReduced ? undefined : { scale: 0.97 }}
                  />
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
    <motion.div
      className="rounded-2xl bg-card border shadow-subtle p-4 md:p-6"
      style={{ ...bgStyle, minHeight: '80vh' }}
      animate={containerPulse ? { scale: 1.005 } : { scale: 1 }}
      transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 24, mass: 0.6 }}
    >
    <ResponsiveGridLayout
      className="layout"
      layouts={{ lg: layout } as Layouts}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
      rowHeight={32}
      margin={[12, 12]}
      containerPadding={[0, 0]}
      isResizable={editMode}
      isDraggable={editMode}
      draggableCancel={".no-drag, textarea, input, button, a, [contenteditable=true]"}
      useCSSTransforms
      onDragStart={editMode ? onDragStart : undefined}
      onDragStop={editMode ? onDragStop : undefined}
      onResizeStop={editMode ? onResizeStop : undefined}
      compactType={null}
      preventCollision={false}
    >
      {widgets.map((w) => (
        <div key={w.id} data-grid={{ i: w.id, x: w.position.x, y: w.position.y, w: w.size.width, h: w.size.height }}>
          <div
            className={
              "group h-full w-full relative rounded-2xl ring-1 shadow-sm " +
              "transition-[transform,box-shadow] duration-300 ease-out will-change-transform " +
              (editMode ? "hover:shadow-md " : "") +
              (selectedId === w.id ? " ring-accent shadow-md scale-[1.005] " : " ring-black/5 ") +
              (settling.has(w.id) ? " animate-settle " : "")
            }
            onClick={() => { if (editMode) { setSelectedId(w.id); triggerSettle(w.id) } }}
          >
            {editMode && (
              <div className="absolute left-1.5 top-1.5 z-10 widget-drag-handle cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-0.5 p-1 rounded-md bg-black/5 ring-1 ring-black/10">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <span key={i} className="h-1 w-1 rounded-full bg-black/30 block" />
                  ))}
                </div>
              </div>
            )}
            {editMode && (
              <div className="absolute right-1 top-1 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  className="rounded-md bg-black/5 p-1 hover:bg-black/10"
                  aria-label="Duplicate"
                  onClick={async () => {
                    try {
                      const created = await addWidget(String(subjectId), {
                        type: w.type,
                        position: { x: w.position.x, y: w.position.y + w.size.height + 1 },
                        size: { ...w.size },
                        content: w.content,
                        style: w.style,
                      })
                      setWidgets(prev => Array.isArray(prev) ? [...prev, created] : [created])
                    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to duplicate') }
                  }}
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  className="rounded-md bg-black/5 p-1 hover:bg-black/10"
                  aria-label="Delete"
                  onClick={async () => {
                    try {
                      await deleteWidget(String(subjectId), w.id)
                      setWidgets(prev => Array.isArray(prev) ? prev.filter(x => x.id !== w.id) : prev)
                    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to delete') }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
            {editMode && w.type === 'STICKY_NOTE' && (
              <div className="absolute left-1 top-1 z-10 flex items-center gap-1">
                {['#FEF08A','#FDE68A','#FCA5A5','#A7F3D0','#BFDBFE','#E9D5FF'].map((c) => (
                  <button
                    key={c}
                    className="h-4 w-4 rounded-sm border"
                    style={{ backgroundColor: c }}
                    aria-label={`Set color ${c}`}
                    onClick={async () => {
                      try {
                        await updateWidget(String(subjectId), w.id, { style: { ...(w.style ?? {}), bg: c } })
                        setWidgets(prev => Array.isArray(prev) ? prev.map(x => x.id === w.id ? { ...x, style: { ...(x.style ?? {}), bg: c } } : x) : prev)
                      } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to update style') }
                    }}
                  />
                ))}
              </div>
            )}
            <AnimatePresence>
              {selectedId === w.id && (
                <motion.div
                  key="focus-ring"
                  className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-ring/40"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: prefersReduced ? 0 : 0.18, ease: "easeOut" }}
                />
              )}
            </AnimatePresence>
            <motion.div
              className="h-full w-full rounded-2xl overflow-hidden"
              initial={prefersReduced ? undefined : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, scale: settling.has(w.id) ? 1.01 : 1 }}
              transition={
                prefersReduced
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 260, damping: 24, mass: 0.6 }
              }
            >
              <WidgetView w={w} subjectId={String(subjectId)} autoFocusId={autoFocusId} />
            </motion.div>
          </div>
        </div>
      ))}
    </ResponsiveGridLayout>
    </motion.div>
    </>
  )
}
