"use client"

import * as React from "react"
import { useSubjectStore } from "@/lib/subject-store"
import CssWordCloud from "@/components/viz/CssWordCloud"
import { cn } from "@/lib/utils"

export default function TopicHeatMap({ className, terms }: { className?: string; terms?: { term: string; score: number }[] }) {
  const selectedDocId = useSubjectStore((s) => s.selectedDocId)
  const insights = useSubjectStore((s) => s.insights)

  const keywords = React.useMemo(() => {
    if (Array.isArray(terms)) return terms
    if (!selectedDocId) return [] as { term: string; score: number }[]
    const entry = insights[selectedDocId]
    return entry?.resultPayload?.keywords ?? []
  }, [terms, insights, selectedDocId])

  if (!keywords.length) {
    return <div className={cn("text-sm text-muted-foreground", className)}>No keywords available.</div>
  }

  return <CssWordCloud className={className} keywords={keywords} />
}
