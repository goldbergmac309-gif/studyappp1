"use client"

import { CanvasGrid } from "../_components/canvas/canvas-grid"
import { useParams } from "next/navigation"

export default function CanvasPage() {
  const { subjectId } = useParams<{ subjectId: string }>()
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Canvas</h1>
      <CanvasGrid subjectId={String(subjectId)} editMode={false} />
    </div>
  )
}
