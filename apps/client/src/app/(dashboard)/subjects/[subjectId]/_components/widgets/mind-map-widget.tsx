"use client"

export function MindMapWidget({ nodesCount }: { nodesCount?: number }) {
  return (
    <div className="p-3 h-full w-full flex items-center justify-center bg-background">
      <div className="text-sm text-muted-foreground">
        Mind Map placeholder{typeof nodesCount === 'number' ? ` • ${nodesCount} nodes` : ''}
      </div>
    </div>
  )
}
