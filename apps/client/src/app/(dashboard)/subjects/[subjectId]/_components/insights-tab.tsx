"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/status-badge"
import { useSubjectStore } from "@/lib/subject-store"
import TopicHeatMap from "./topic-heat-map"
import DocumentMetrics from "./document-metrics"

export default function InsightsTab() {
  const router = useRouter()
  const search = useSearchParams()

  const documents = useSubjectStore((s) => s.documents)
  const loading = useSubjectStore((s) => s.loading)
  const error = useSubjectStore((s) => s.error)
  const insights = useSubjectStore((s) => s.insights)
  const statusSummary = useSubjectStore((s) => s.statusSummary)
  const selectedDocId = useSubjectStore((s) => s.selectedDocId)
  const setSelectedDoc = useSubjectStore((s) => s.setSelectedDoc)

  // URL -> store selection sync
  React.useEffect(() => {
    const selectedParam = search.get("doc") ?? undefined
    if (selectedParam && documents.some((d) => d.id === selectedParam)) {
      if (selectedDocId !== selectedParam) setSelectedDoc(selectedParam)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, documents])

  const selectedDoc = React.useMemo(
    () => documents.find((d) => d.id === selectedDocId),
    [documents, selectedDocId]
  )

  const onSelectChange = React.useCallback(
    (id: string) => {
      const params = new URLSearchParams(search.toString())
      params.set("doc", id)
      router.push(`?${params.toString()}`)
      setSelectedDoc(id)
    },
    [router, search, setSelectedDoc]
  )

  // Loading/error states
  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Insights</CardTitle>
            <CardDescription>Loading analysis…</CardDescription>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-6 w-56" />
            <Skeleton className="mt-4 h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertTitle>Could not load insights</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!documents.length) {
    return (
      <div className="space-y-4">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No insights yet</CardTitle>
            <CardDescription>
              Upload documents in the Documents tab to generate insights.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!selectedDoc) {
    return (
      <div className="space-y-4">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No insights yet</CardTitle>
            <CardDescription>
              No document selected. Choose one from the selector.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Header with selection and status
  const header = (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="text-sm text-muted-foreground">Selected document</div>
        <div className="mt-1 flex items-center gap-3">
          <div className="font-medium leading-none">{selectedDoc.filename}</div>
          <StatusBadge status={selectedDoc.status} />
        </div>
      </div>
      <div>
        <label className="sr-only" htmlFor="doc-select">Select document</label>
        <select
          id="doc-select"
          className="min-w-56 rounded-md border bg-background px-3 py-2 text-sm"
          value={selectedDocId ?? undefined}
          onChange={(e) => onSelectChange(e.target.value)}
        >
          {documents.map((d) => (
            <option key={d.id} value={d.id}>
              {d.filename}
            </option>
          ))}
        </select>
      </div>
    </div>
  )

  // Intelligent empty states based on status summary
  if (!statusSummary.allTerminal) {
    return (
      <div className="space-y-4">
        {header}
        <Card>
          <CardHeader>
            <CardTitle>Insights</CardTitle>
            <CardDescription>
              Your insights are being generated. {statusSummary.processing + statusSummary.queued} document(s) in queue or processing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-5 w-56" />
            <Skeleton className="mt-4 h-24 w-full" />
            <Skeleton className="mt-4 h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // All terminal: show insights if available for selected doc; handle failures gracefully
  const entry = insights[selectedDocId!]
  if (!entry) {
    const isFailed = selectedDoc.status === "FAILED"
    return (
      <div className="space-y-4">
        {header}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>{isFailed ? "Analysis failed" : "No insights available"}</CardTitle>
            <CardDescription>
              {isFailed
                ? "This document failed to process. Try re-uploading or check another document."
                : "No insights were produced for this document. Try selecting another one."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const { engineVersion, resultPayload } = entry

  return (
    <div className="space-y-4">
      {header}

      <div className="grid gap-4 md:grid-cols-2">
        <DocumentMetrics metrics={resultPayload.metrics} engineVersion={engineVersion} />
        <Card>
          <CardHeader>
            <CardTitle>Topic Heat Map</CardTitle>
            <CardDescription>Top keywords extracted from your document.</CardDescription>
          </CardHeader>
          <CardContent>
            <TopicHeatMap />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
