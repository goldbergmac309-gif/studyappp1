"use client"

import * as React from "react"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/status-badge"
import { useSubjectStore } from "@/lib/subject-store"
import TopicHeatMap from "./topic-heat-map"
import DocumentMetrics from "./document-metrics"
import { useAnalysisPolling } from "@/lib/hooks/useAnalysisPolling"
import { Button } from "@/components/ui/button"
import { useDebouncedBool } from "@/lib/hooks/useDebouncedBool"
import { useRelativeTime } from "@/lib/hooks/useRelativeTime"
import { getSubjectTopics } from "@/lib/api"
import type { SubjectTopic } from "@studyapp/shared-types"

export default function InsightsTab() {
  const router = useRouter()
  const search = useSearchParams()
  const { subjectId } = useParams<{ subjectId: string }>()

  const documents = useSubjectStore((s) => s.documents)
  const loading = useSubjectStore((s) => s.loading)
  const error = useSubjectStore((s) => s.error)
  const insights = useSubjectStore((s) => s.insights)
  const statusSummary = useSubjectStore((s) => s.statusSummary)
  const selectedDocId = useSubjectStore((s) => s.selectedDocId)
  const setSelectedDoc = useSubjectStore((s) => s.setSelectedDoc)
  const mergeInsight = useSubjectStore((s) => s.mergeInsight)

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

  // Progressive analysis polling for the selected document
  const hasEntry = React.useMemo(() => !!(selectedDocId && insights[selectedDocId]), [insights, selectedDocId])
  const shouldPoll = !!selectedDocId && !hasEntry && selectedDoc?.status !== "FAILED"
  const { analysis, error: pollError, start: startAnalysis, stop: stopAnalysis, retry: retryAnalysis, lastUpdatedAt } = useAnalysisPolling(selectedDocId ?? undefined, {
    autoStart: false,
    enabled: shouldPoll,
  })
  React.useEffect(() => {
    if (shouldPoll) startAnalysis()
    else stopAnalysis()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPoll])
  React.useEffect(() => {
    if (analysis && selectedDocId) {
      mergeInsight(selectedDocId, analysis)
    }
  }, [analysis, selectedDocId, mergeInsight])

  const onSelectChange = React.useCallback(
    (id: string) => {
      const params = new URLSearchParams(search.toString())
      params.set("doc", id)
      router.push(`?${params.toString()}`)
      setSelectedDoc(id)
    },
    [router, search, setSelectedDoc]
  )

  const loadingDebounced = useDebouncedBool(loading, 250)

  const pollLastUpdatedText = useRelativeTime(lastUpdatedAt)

  // Fetch V2 topics at subject-level and pass as envelope to TopicHeatMap
  const [topicTerms, setTopicTerms] = React.useState<Array<{ term: string; score: number }>>([]) // legacy fallback
  const [topics, setTopics] = React.useState<SubjectTopic[]>([])
  React.useEffect(() => {
    const id = String(subjectId || "")
    if (!id) return
    const ac = new AbortController()
    getSubjectTopics(id, { signal: ac.signal })
      .then((data) => {
        const list: SubjectTopic[] = Array.isArray(data.topics) ? data.topics : []
        setTopics(list)
        // Populate legacy fallback list for CssWordCloud when needed
        const terms = list.map((t) => ({ term: t.label, score: t.weight }))
        setTopicTerms(terms)
      })
      .catch(() => setTopicTerms([]))
    return () => ac.abort()
  }, [subjectId])

  if (!documents.length) {
    return (
      <div className="space-y-4">
        {/* Header space kept consistent even when no docs */}
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

  // Header with selection, status and last-updated indicator
  const header = (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="text-sm text-muted-foreground">Selected document</div>
        <div className="mt-1 flex items-center gap-3">
          <div className="font-medium leading-none">{selectedDoc.filename}</div>
          <StatusBadge status={selectedDoc.status} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-xs text-muted-foreground">Last updated: {pollLastUpdatedText}</div>
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

  // Progressive rendering: if not all terminal and no entry yet, show skeleton; otherwise, render insights below

  const entry = insights[selectedDocId!]
  if (!statusSummary.allTerminal && !entry) {
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
            {loadingDebounced ? (
              <>
                <Skeleton className="h-5 w-56" />
                <Skeleton className="mt-4 h-24 w-full" />
                <Skeleton className="mt-4 h-40 w-full" />
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Preparing your insights…</div>
            )}
          </CardContent>
        </Card>
        {(error || pollError) && (
          <Alert variant="destructive">
            <AlertTitle>{error ? "Could not load insights" : "Analysis polling error"}</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{error ?? pollError}</span>
              <Button size="sm" variant="outline" onClick={() => retryAnalysis()}>Retry</Button>
            </AlertDescription>
          </Alert>
        )}
      </div>
    )
  }

  // If still no entry but all terminal or selected failed, show the appropriate empty/failed state
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
        {(error || pollError) && (
          <Alert variant="destructive">
            <AlertTitle>{error ? "Could not load insights" : "Analysis polling error"}</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{error ?? pollError}</span>
              <Button size="sm" variant="outline" onClick={() => retryAnalysis()}>Retry</Button>
            </AlertDescription>
          </Alert>
        )}
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
            <CardDescription>Key conceptual topics across this subject.</CardDescription>
          </CardHeader>
          <CardContent>
            <TopicHeatMap topics={topics.length ? topics : undefined} terms={topicTerms.length ? topicTerms : undefined} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
