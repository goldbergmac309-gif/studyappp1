"use client"

import * as React from "react"
import type { Document } from "@/lib/types"
import { StatusBadge } from "@/components/status-badge"
import { FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export type DocumentListItemProps = {
  doc: Document
  isActive: boolean
  onClick: () => void
  onReprocess?: (id: string) => void
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

export function DocumentListItem({ doc, isActive, onClick, onReprocess }: DocumentListItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors",
        isActive ? "border-ring ring-2 ring-ring/30" : "hover:bg-muted/50"
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
        <StatusBadge status={doc.status} />
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
    </button>
  )
}

export default DocumentListItem
