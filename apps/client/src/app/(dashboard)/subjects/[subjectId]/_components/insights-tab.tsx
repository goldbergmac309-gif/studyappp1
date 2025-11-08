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
import { getSubjectTopics, createInsightSession, getInsightSession, streamInsightSession } from "@/lib/api"
import type { InsightSessionDto } from "@/lib/api"
import type { SubjectTopic } from "@studyapp/shared-types"
import { reprocessDocument } from "@/lib/api"
import { useAiConsent } from "@/hooks/useAiConsent"
import { toast } from "sonner"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { HelpCircle } from "lucide-react"

type SessionResult = InsightSessionDto['result']

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
  const setInsights = useSubjectStore((s) => s.setInsights)
  const setDocuments = useSubjectStore((s) => s.setDocuments)

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
  // Multi-document aggregation (beta)
  const [multiIds, setMultiIds] = React.useState<string[]>([])
  // Insight Session state (Phase C)
  const [sessionId, setSessionId] = React.useState<string | null>(null)
  const [sessionStatus, setSessionStatus] = React.useState<'PENDING' | 'READY' | 'FAILED' | null>(null)
  const [sessionResult, setSessionResult] = React.useState<SessionResult | null>(null)
  const [creatingSession, setCreatingSession] = React.useState(false)
  const [sessionError, setSessionError] = React.useState<string | null>(null)
  const pollTimerRef = React.useRef<number | null>(null)
  const sseUnsubRef = React.useRef<(() => void) | null>(null)
  const { hasConsented, requestConsent } = useAiConsent()
  const sessionProgress = sessionResult?.progress
  const sessionInsight = sessionResult?.insight
  const sessionForecast = sessionResult?.forecast
  const topicHighlights = Array.isArray(sessionInsight?.topicHighlights) ? sessionInsight.topicHighlights : undefined
  const fallbackTopics = Array.isArray(sessionResult?.topics) ? sessionResult.topics : undefined
  const topicShowcase = topicHighlights ?? fallbackTopics ?? []
  const riskConcepts = Array.isArray(sessionInsight?.riskConcepts) ? sessionInsight.riskConcepts : []
  const conceptOverview = Array.isArray(sessionInsight?.conceptOverview) ? sessionInsight.conceptOverview : []
  const questionFamilies = Array.isArray(sessionInsight?.questionFamilies) ? sessionInsight.questionFamilies : []
  const studyPlanItems = Array.isArray(sessionInsight?.studyPlan) ? sessionInsight.studyPlan : []
  const studyPlanNarrative = typeof sessionResult?.studyPlanNarrative === 'string' ? sessionResult.studyPlanNarrative : null
  const sessionSummary = sessionResult?.summary
  const aggregated = React.useMemo(() => {
    if (!multiIds.length) return null
    const chosen = multiIds.filter((id) => !!insights[id])
    if (!chosen.length) return null
    // Merge keywords by summing scores
    const aggMap = new Map<string, number>()
    let pages = 0
    let textLength = 0
    for (const id of chosen) {
      const entry = insights[id]
      const kws = entry?.resultPayload?.keywords || []
      for (const k of kws) {
        aggMap.set(k.term, (aggMap.get(k.term) || 0) + (k.score || 0))
      }
      const m = entry?.resultPayload?.metrics as any
      pages += Number(m?.pages || 0)
      textLength += Number(m?.textLength || 0)
    }
    const terms = Array.from(aggMap.entries())
      .map(([term, score]) => ({ term, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 40)
    const metrics = { pages, textLength }
    return { terms, metrics }
  }, [multiIds, insights])
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

  React.useEffect(() => {
    return () => {
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current)
      if (sseUnsubRef.current) { try { sseUnsubRef.current() } catch {} sseUnsubRef.current = null }
    }
  }, [])

  async function handleCreateInsightSession() {
    if (!subjectId) return
    if (!multiIds.length) return
    setSessionError(null)
    setCreatingSession(true)
    setSessionId(null)
    setSessionStatus(null)
    setSessionResult(null)
    try {
      const sess = await createInsightSession(String(subjectId), multiIds)
      setSessionId(sess.id)
      setSessionStatus(sess.status)
      // Prefer SSE; fallback to polling on error
      if (sseUnsubRef.current) { try { sseUnsubRef.current() } catch {} sseUnsubRef.current = null }
      sseUnsubRef.current = streamInsightSession(sess.id, {
        onEvent: (evt) => {
          setSessionStatus(evt.status)
          if (evt.status === 'READY' || evt.status === 'FAILED') {
            setSessionResult(evt.result ?? null)
          }
        },
        onError: async () => {
          // fallback: simple polling
          if (pollTimerRef.current) window.clearInterval(pollTimerRef.current)
          pollTimerRef.current = window.setInterval(async () => {
            try {
              const cur = await getInsightSession(sess.id)
              setSessionStatus(cur.status)
              if (cur.status === 'READY' || cur.status === 'FAILED') {
                if (pollTimerRef.current) window.clearInterval(pollTimerRef.current)
                setSessionResult(cur.result ?? null)
              }
            } catch (e) {
              if (pollTimerRef.current) window.clearInterval(pollTimerRef.current)
              setSessionError(String((e as Error)?.message ?? e))
            }
          }, 2000) as unknown as number
        },
        onDone: () => {
          if (sseUnsubRef.current) { try { sseUnsubRef.current() } catch {} sseUnsubRef.current = null }
        }
      })
    } catch (e) {
      setSessionError(String((e as Error)?.message ?? e))
    } finally {
      setCreatingSession(false)
    }
  }

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

  // Heuristic to suggest OCR reprocess when density is low and OCR was not used
  const pages = Number(resultPayload?.metrics?.pages || 0)
  const textLength = Number(resultPayload?.metrics?.textLength || 0)
  const ocrUsed = Boolean((resultPayload as any)?.metrics?.ocrUsed)
  const avgCharsPerPage = pages > 0 ? Math.floor(textLength / pages) : 0
  const LOW_DENSITY_THRESHOLD = 100
  const shouldOfferOcr = !ocrUsed && pages > 0 && avgCharsPerPage < LOW_DENSITY_THRESHOLD

  async function handleReprocessWithOcr() {
    try {
      if (!subjectId || !selectedDocId) return
      await reprocessDocument(String(subjectId), String(selectedDocId), { forceOcr: true })
      // Optimistically reflect status change and clear cached insight so polling restarts
      try {
        setDocuments(
          documents.map((d) => (d.id === selectedDocId ? { ...d, status: "QUEUED" as const } : d))
        )
      } catch {}
      try {
        const cloned = { ...insights }
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete (cloned as any)[selectedDocId]
        setInsights(cloned)
      } catch {}
      toast.success("Reprocessing queued with OCR fallback")
    } catch (e: unknown) {
      toast.error("Failed to reprocess", { description: String((e as Error)?.message ?? e) })
    }
  }

  return (
    <div className="space-y-4">
      {header}

      {/* Aggregated Insights (beta): select multiple documents to merge signals */}
      <Card>
        <CardHeader>
          <CardTitle>Aggregate Insights (beta)</CardTitle>
          <CardDescription>
            Select multiple processed documents to combine their keywords and metrics for a broader picture.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-6">
            <div className="min-w-64">
              <label htmlFor="multi-docs" className="text-sm text-muted-foreground">Choose documents</label>
              <select
                multiple
                id="multi-docs"
                className="mt-1 h-28 w-full rounded-md border bg-background px-2 py-1 text-sm"
                value={multiIds}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions).map((o) => o.value)
                  setMultiIds(values)
                }}
              >
                {documents
                  .filter((d) => d.status === 'COMPLETED')
                  .map((d) => (
                    <option key={d.id} value={d.id}>{d.filename}</option>
                  ))}
              </select>
            </div>
            <div className="flex-1">
              {aggregated ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Aggregated Metrics</CardTitle>
                      <CardDescription>Sum across selected documents</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm">Pages: <span className="font-medium">{aggregated.metrics.pages}</span></div>
                      <div className="text-sm">Text length: <span className="font-medium">{aggregated.metrics.textLength.toLocaleString()}</span></div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Aggregated Topic Heat Map</CardTitle>
                      <CardDescription>Merged keywords across selected docs</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <TopicHeatMap terms={aggregated.terms} />
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Select two or more completed documents to see aggregated insights.</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insight Sessions (beta) */}
      <Card>
        <CardHeader>
          <CardTitle>Insight Session (beta)</CardTitle>
          <CardDescription>
            Create a focused session from your selected documents. This may generate a brief study plan if AI consent is enabled.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">
              Selected docs: <span className="font-medium">{multiIds.length}</span>
            </div>
            <div className="flex items-center gap-2">
              {!hasConsented && (
                <Button variant="outline" size="sm" onClick={() => requestConsent()}>Enable AI</Button>
              )}
              <Button size="sm" onClick={handleCreateInsightSession} disabled={!multiIds.length || creatingSession}>
                {creatingSession ? 'Creating…' : 'Create Insight Session'}
              </Button>
            </div>
          </div>

          {sessionError && (
            <Alert variant="destructive" className="mt-3">
              <AlertTitle>Session error</AlertTitle>
              <AlertDescription>{sessionError}</AlertDescription>
            </Alert>
          )}

          {sessionId && (
            <div className="mt-4 space-y-3 text-sm">
              <div>Session ID: <span className="font-mono">{sessionId}</span></div>
              <div>Status: <span className="font-medium">{sessionStatus ?? '—'}</span></div>
              {sessionStatus === 'FAILED' && (
                <Alert variant="destructive">
                  <AlertTitle>Generation failed</AlertTitle>
                  <AlertDescription>Retry the session once the documents finish processing.</AlertDescription>
                </Alert>
              )}
              {sessionProgress && sessionStatus !== 'READY' && sessionStatus !== 'FAILED' && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{(sessionProgress.stage || 'Processing').replace(/-/g, ' ')}</span>
                    <span>{Math.round(Math.min(1, Math.max(0, sessionProgress.ratio ?? 0)) * 100)}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.round(Math.min(1, Math.max(0, sessionProgress.ratio ?? 0)) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {sessionStatus === 'READY' && sessionResult && (
                <div className="mt-2 grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Session Summary</CardTitle>
                      <CardDescription>Documents analysed: {sessionSummary?.docCount ?? multiIds.length}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>Chunks processed: <span className="font-medium">{sessionSummary?.chunkCount ?? '—'}</span></div>
                      <div>Questions detected: <span className="font-medium">{sessionSummary?.questionCount ?? '—'}</span></div>
                      <div className="pt-2">
                        <div className="font-medium text-xs uppercase text-muted-foreground">Top Topics</div>
                        <ul className="mt-1 space-y-1">
                          {topicShowcase.slice(0, 5).map((topic: any, idx: number) => (
                            <li key={`${topic?.label || topic?.term || idx}`} className="flex items-center justify-between text-sm">
                              <span className="font-medium">{topic?.label || topic?.term || `Topic ${idx + 1}`}</span>
                              <span className="text-muted-foreground text-xs">{(topic?.weight ?? topic?.score ?? 0).toFixed(1)}</span>
                            </li>
                          ))}
                          {!topicShowcase.length && <li className="text-muted-foreground text-xs">No topics yet.</li>}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Concept Pressure</CardTitle>
                      <CardDescription>Lowest mastery areas first</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {riskConcepts.length ? (
                        riskConcepts.slice(0, 4).map((concept, idx) => (
                          <div key={`${concept.label}-${idx}`} className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
                            <span className="font-medium">{concept.label}</span>
                            <span className="text-xs text-muted-foreground">{Math.round((concept.mastery ?? 0) * 100)}%</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-muted-foreground">No risk concepts detected.</div>
                      )}
                      {conceptOverview.length ? (
                        <div className="text-xs text-muted-foreground">
                          Tracking {conceptOverview.length} concepts across this session.
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Forecast</CardTitle>
                      <CardDescription>{sessionForecast?.archetype ?? 'Awaiting archetype'}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>Next exam confidence: <span className="font-medium">{Math.round((sessionForecast?.nextExamConfidence ?? 0) * 100)}%</span></div>
                      <div className="space-y-1">
                        {(sessionForecast?.probabilities ?? []).slice(0, 4).map((p) => (
                          <div key={p.label} className="flex items-center justify-between text-xs">
                            <span>{p.label}</span>
                            <span className="font-medium">{Math.round((p.value ?? 0) * 100)}%</span>
                          </div>
                        ))}
                        {!(sessionForecast?.probabilities?.length) && (
                          <div className="text-xs text-muted-foreground">Probability breakdown unavailable.</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Question Families</CardTitle>
                      <CardDescription>Archetypes spotted across documents</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {questionFamilies.length ? (
                        questionFamilies.slice(0, 4).map((fam, idx) => (
                          <div key={`${fam.label}-${idx}`} className="rounded-md border bg-muted/40 p-2">
                            <div className="font-medium">{fam.label}</div>
                            <div className="text-xs text-muted-foreground">{fam.synopsis || 'Recurring pattern detected.'}</div>
                            <div className="text-xs mt-1 text-muted-foreground">Frequency: {fam.frequency ?? '—'}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-muted-foreground">No families detected yet.</div>
                      )}
                    </CardContent>
                  </Card>
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Focus Plan</CardTitle>
                      <CardDescription>Actions generated by the insight engine</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      {studyPlanNarrative ? (
                        <pre className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">{studyPlanNarrative}</pre>
                      ) : null}
                      {studyPlanItems.length ? (
                        studyPlanItems.map((item, idx) => (
                          <div key={`${item.title ?? idx}`} className="rounded-md border bg-muted/20 p-3">
                            <div className="font-medium">{item.title || `Focus ${idx + 1}`}</div>
                            {item.focus && <div className="text-xs text-muted-foreground mb-1">{item.focus}</div>}
                            {Array.isArray(item.recommendedActions) && (
                              <ul className="list-disc pl-4 text-xs text-muted-foreground">
                                {item.recommendedActions.map((action, actionIdx) => (
                                  <li key={actionIdx}>{action}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-muted-foreground">Study plan will appear when enough concept data accumulates.</div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          {shouldOfferOcr && (
            <div className="flex items-center justify-end gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={handleReprocessWithOcr}>
                      Reprocess with OCR
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    OCR extracts text from scanned/image-based PDFs when built-in text is sparse.
                    Use this if the Text Length per page looks unusually low.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <HelpCircle className="h-4 w-4 text-muted-foreground" aria-hidden />
            </div>
          )}
          <DocumentMetrics metrics={resultPayload.metrics} engineVersion={engineVersion} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Topic Heat Map</CardTitle>
            <CardDescription>Key conceptual topics across this subject.</CardDescription>
          </CardHeader>
          <CardContent>
            <TopicHeatMap terms={topicTerms.length ? topicTerms : undefined} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
