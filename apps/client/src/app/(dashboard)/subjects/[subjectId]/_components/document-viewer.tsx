"use client"

import * as React from "react"
import type { Document } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getDocumentUrl } from "@/lib/api"
import { useSubjectStore } from "@/lib/subject-store"

export function DocumentViewer({ doc }: { doc: Document }) {
  const meta = (doc as any).meta as Record<string, unknown> | undefined
  const resourceType = (doc as any).resourceType as string | undefined
  const insights = useSubjectStore((s) => s.insights)
  const entry = insights[doc.id]
  const [opening, setOpening] = React.useState(false)
  const onOpenOriginal = React.useCallback(async () => {
    try {
      setOpening(true)
      const url = await getDocumentUrl(doc.id)
      if (typeof window !== 'undefined') {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    } catch (e) {
      console.error('Failed to open original document', e)
    } finally {
      setOpening(false)
    }
  }, [doc.id])
  const keywords: Array<{ term: string; score?: number }> = React.useMemo(() => {
    const raw = (entry as any)?.resultPayload?.keywords
    if (Array.isArray(raw)) {
      return raw.map((k: any) => ({ term: String(k?.term ?? ''), score: typeof k?.score === 'number' ? k.score : undefined }))
    }
    return []
  }, [entry])

  const items: Array<{ label: string; value: string }> = []
  if (resourceType) items.push({ label: "Resource type", value: prettify(resourceType) })
  if (meta && typeof meta === 'object') {
    const lang = String((meta as any).lang ?? "—")
    const headingCount = Number((meta as any).headingCount ?? 0)
    const detectedResourceType = (meta as any).detectedResourceType ? prettify(String((meta as any).detectedResourceType)) : undefined
    const detectedQuestions = String((meta as any).detectedQuestions === true ? 'Yes' : 'No')
    items.push({ label: "Language", value: lang })
    items.push({ label: "Estimated headings", value: String(headingCount) })
    if (detectedResourceType) items.push({ label: "Detected type", value: detectedResourceType })
    items.push({ label: "Detected questions", value: detectedQuestions })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="truncate" title={doc.filename}>{doc.filename}</CardTitle>
              <CardDescription>Automatic structure and metadata</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={onOpenOriginal} disabled={opening}>
              {opening ? 'Opening…' : 'Open Original'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {items.length ? (
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {items.map((it, idx) => (
                <div key={idx} className="rounded-md border bg-muted/30 p-3">
                  <dt className="text-xs text-muted-foreground">{it.label}</dt>
                  <dd className="text-sm font-medium">{it.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="text-sm text-muted-foreground">No metadata available yet for this document.</div>
          )}
        </CardContent>
      </Card>

      {/* Outline / Headings */}
      <Card>
        <CardHeader>
          <CardTitle>Outline</CardTitle>
          <CardDescription>Detected headings and structure</CardDescription>
        </CardHeader>
        <CardContent>
          {Array.isArray((meta as any)?.headings) && (meta as any)!.headings.length > 0 ? (
            <ol className="list-decimal pl-5 space-y-1">
              {((meta as any)!.headings as Array<{ title: string; level?: number }>).slice(0, 50).map((h, i) => (
                <li key={i} className="text-sm">
                  <span className="font-medium">{h.title}</span>
                  {typeof h.level === 'number' ? <span className="text-muted-foreground"> (h{h.level})</span> : null}
                </li>
              ))}
            </ol>
          ) : (
            <div className="text-sm text-muted-foreground">
              Outline not available yet. {typeof (meta as any)?.headingCount === 'number' ? `Estimated headings: ${(meta as any)?.headingCount}` : ''}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Topic Highlights from per-document insights */}
      <Card>
        <CardHeader>
          <CardTitle>Topic Highlights</CardTitle>
          <CardDescription>Top keywords extracted from this document</CardDescription>
        </CardHeader>
        <CardContent>
          {keywords.length ? (
            <div className="flex flex-wrap gap-2">
              {keywords.slice(0, 25).map((k, i) => (
                <span key={i} className="inline-flex items-center rounded-full border px-2 py-1 text-xs">
                  {k.term}
                  {typeof k.score === 'number' ? (
                    <span className="ml-1 text-muted-foreground">{k.score.toFixed(2)}</span>
                  ) : null}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No highlights available yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function prettify(rt: string): string {
  return rt.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}
