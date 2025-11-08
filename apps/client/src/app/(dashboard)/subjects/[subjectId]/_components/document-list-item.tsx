"use client"

import * as React from "react"
import type { Document } from "@/lib/types"
import { StatusBadge } from "@/components/status-badge"
import { FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export type DocumentListItemProps = {
  doc: Document
  isActive: boolean
  onClick: () => void
  onReprocess?: (id: string) => void
  onView?: (id: string) => void
}

function formatRelative(iso: string): string {
  try {
    const date = new Date(iso)
    const delta = Math.round((Date.now() - date.getTime()) / 1000)
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })
    const divisions: [number, Intl.RelativeTimeFormatUnit][] = [
      [60, "second"],
      [60, "minute"],
      [24, "hour"],
      [7, "day"],
      [4.34524, "week"],
      [12, "month"],
      [Number.POSITIVE_INFINITY, "year"],
    ]
    let duration = delta
    for (const [amount, unit] of divisions) {
      if (Math.abs(duration) < amount)
        return rtf.format(-Math.round(duration), unit as Intl.RelativeTimeFormatUnit)
      duration /= amount
    }
    return date.toLocaleString()
  } catch {
    return iso
  }
}

export function DocumentListItem({ doc, isActive, onClick, onReprocess, onView }: DocumentListItemProps) {
  const prettyType = React.useMemo(() => {
    const rt = (doc as any).resourceType as string | undefined
    if (!rt) return null
    const label = rt.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
    return label
  }, [doc])
  const badgeVariant = React.useMemo<"default"|"secondary"|"destructive"|"outline">(() => {
    const rt = ((doc as any).resourceType as string | undefined) || 'OTHER'
    switch (rt) {
      case 'EXAM':
        return 'default'
      case 'SYLLABUS':
      case 'PRACTICE_SET':
        return 'secondary'
      case 'NOTES':
      case 'LECTURE_NOTES':
      case 'TEXTBOOK':
        return 'outline'
      default:
        return 'outline'
    }
  }, [doc])
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        "flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all bg-card",
        isActive ? "border-ring ring-2 ring-ring/30 shadow-subtle" : "hover:bg-muted/40 hover:shadow-subtle"
      )}
      aria-pressed={isActive}
    >
      <div className="flex items-center gap-3">
        <div className="rounded-md border bg-background p-2 text-foreground/80">
          <FileText className="h-4 w-4" />
        </div>
        <div>
          <div className="font-medium leading-none line-clamp-1" title={doc.filename}>
            {doc.filename}
          </div>
          <div className="text-xs text-muted-foreground">
            {doc.createdAt ? formatRelative(doc.createdAt) : ""}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {prettyType && (
          <Badge variant={badgeVariant} aria-label={`Resource type: ${prettyType}`}>{prettyType}</Badge>
        )}
        <StatusBadge status={doc.status} />
        {onView && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              onView(doc.id)
            }}
          >
            View
          </Button>
        )}
        {doc.status === "FAILED" && onReprocess && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              onReprocess(doc.id)
            }}
          >
            Reprocess
          </Button>
        )}
      </div>
    </div>
  )
}

export default DocumentListItem
