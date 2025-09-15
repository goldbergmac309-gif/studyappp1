"use client"

import { WidgetChrome } from "./widget-chrome"

export function MindMapWidget({ nodesCount }: { nodesCount?: number }) {
  return (
    <WidgetChrome title="Mind Map" className="shadow-lift">
      <div className="text-sm text-muted-foreground">
        Mind Map placeholder{typeof nodesCount === 'number' ? ` • ${nodesCount} nodes` : ''}
      </div>
    </WidgetChrome>
  )
}
