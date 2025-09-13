"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import type { Layout, Layouts } from "react-grid-layout"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"
import { WidgetWrapper } from "../_components/canvas/widget-wrapper"
import { NotesWidget } from "../_components/widgets/notes-widget"
import { MindMapWidget } from "../_components/widgets/mind-map-widget"
import { getSubjectWorkspace, patchWorkspaceLayout } from "@/lib/api"
import type { WidgetInstanceDto, UpdateWorkspaceLayoutDto } from "@studyapp/shared-types"
import { useRouter } from "next/navigation"

// react-grid-layout has SSR issues; load it dynamically on client
const ResponsiveGridLayout = dynamic<any>(
  () => import("react-grid-layout").then((m: any) => m.WidthProvider(m.Responsive)),
  { ssr: false },
)

function WidgetView({ w }: { w: WidgetInstanceDto }) {
  switch (w.type) {
    case "NOTES":
      return (
        <WidgetWrapper>
          <NotesWidget initialText={typeof w.content?.text === "string" ? String(w.content.text) : ""} />
        </WidgetWrapper>
      )
    case "MIND_MAP":
      return (
        <WidgetWrapper>
          <MindMapWidget nodesCount={Array.isArray(w.content?.nodes) ? w.content.nodes.length : undefined} />
        </WidgetWrapper>
      )
    default:
      return (
        <WidgetWrapper>
          <div className="p-3 text-sm text-muted-foreground">Unsupported widget type: {w.type}</div>
        </WidgetWrapper>
      )
  }
}

export default function CanvasPage({ params }: { params: { subjectId: string } }) {
  const { subjectId } = params
  const router = useRouter()
  const [widgets, setWidgets] = useState<WidgetInstanceDto[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let aborted = false
    const ac = new AbortController()
    getSubjectWorkspace(subjectId, { signal: ac.signal })
      .then((data) => {
        if (aborted) return
        setWidgets(data)
      })
      .catch((e) => {
        if (aborted) return
        setError(e?.message || "Failed to load workspace")
        if (String(e?.message || "").includes("401")) {
          router.push("/login")
        }
      })
    return () => {
      aborted = true
      ac.abort()
    }
  }, [subjectId, router])

  const layout: Layout[] = useMemo(() => {
    if (!Array.isArray(widgets)) return []
    return widgets.map((w) => ({ i: w.id, x: w.position.x, y: w.position.y, w: w.size.width, h: w.size.height }))
  }, [widgets])

  const onDragStop = async (_layout: Layout[], _old: any, item: Layout) => {
    // Persist only the moved item
    const payload: UpdateWorkspaceLayoutDto = {
      widgets: [
        {
          id: String(item.i),
          position: { x: item.x, y: item.y },
          size: { width: item.w, height: item.h },
        },
      ],
    }
    // Update local state optimistically
    setWidgets((prev) =>
      Array.isArray(prev)
        ? prev.map((w) => (w.id === item.i ? { ...w, position: payload.widgets[0].position, size: payload.widgets[0].size } : w))
        : prev,
    )
    try {
      await patchWorkspaceLayout(subjectId, payload)
    } catch {
      // ignore; could show a toast
    }
  }

  const onResizeStop = onDragStop

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Canvas</h1>
      {error && (
        <div className="mb-3 text-sm text-red-600">{error}</div>
      )}
      {widgets === null ? (
        <div className="text-sm text-muted-foreground">Loading workspace…</div>
      ) : widgets.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No widgets yet. You can apply a Persona from the Subject Genesis modal when creating a subject.
        </div>
      ) : (
        <ResponsiveGridLayout
          className="layout"
          layouts={{ lg: layout } as Layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={32}
          isResizable
          isDraggable
          onDragStop={onDragStop}
          onResizeStop={onResizeStop}
          measureBeforeMount={false}
          compactType={null}
          preventCollision={false}
        >
          {widgets.map((w) => (
            <div key={w.id} data-grid={{ i: w.id, x: w.position.x, y: w.position.y, w: w.size.width, h: w.size.height }}>
              <WidgetView w={w} />
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  )
}
