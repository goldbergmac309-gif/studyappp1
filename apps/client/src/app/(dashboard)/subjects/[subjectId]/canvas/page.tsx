"use client"

import { CanvasGrid } from "../_components/canvas/canvas-grid"
import { SemanticSearch } from "../_components/canvas/semantic-search"
import { useParams } from "next/navigation"

export default function CanvasPage() {
  const { subjectId } = useParams<{ subjectId: string }>()
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Canvas</h1>
      <SemanticSearch subjectId={String(subjectId)} />
      <CanvasGrid subjectId={String(subjectId)} editMode={false} />
    </div>
  )
}
