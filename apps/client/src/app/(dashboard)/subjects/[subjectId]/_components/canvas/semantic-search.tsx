"use client"

import * as React from "react"
import { semanticSearch } from "@/lib/api"
import { useAuthStore } from "@/lib/store"
import { getAiConsentNow } from "@/lib/ai-consent"
import type { SemanticSearchHit } from "@studyapp/shared-types"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { useAiConsent } from "@/hooks/useAiConsent"

export function SemanticSearch({ subjectId }: { subjectId: string }) {
  const [q, setQ] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [results, setResults] = React.useState<SemanticSearchHit[]>([])
  const acRef = React.useRef<AbortController | null>(null)
  const [activeIdx, setActiveIdx] = React.useState<number>(-1)
  const { hasConsented, requestConsent } = useAiConsent()

  const onSearch = React.useCallback(async (mode: 'auto' | 'explicit' = 'explicit') => {
    const query = q.trim()
    if (query.length < 2) {
      setResults([])
      return
    }
    // Authoritative, centralized consent check (SSOT)
    const consentNow = getAiConsentNow(useAuthStore.getState().user)
    if (!consentNow) {
      // In auto mode (debounced typing), do not open the modal. Only open on explicit action.
      if (mode === 'explicit') {
        // Defer to next tick so the originating click can complete before the dialog overlay mounts
        setTimeout(() => { try { requestConsent() } catch {} }, 0)
      }
      return
    }
    if (acRef.current) acRef.current.abort()
    const ac = new AbortController()
    acRef.current = ac
    setLoading(true)
    setError(null)
    try {
      const data = await semanticSearch(subjectId, { query, k: 20, threshold: 0.25, signal: ac.signal })
      setResults(data)
      setActiveIdx(data.length ? 0 : -1)
    } catch (e) {
      // Re-throw cancellations
      const err = e as unknown
      if (typeof err === 'object' && err && 'code' in err && (err as { code?: string }).code === 'ERR_CANCELED') {
        return
      }
      const msg = err instanceof Error ? err.message : 'Search failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [q, subjectId, hasConsented, requestConsent])

  React.useEffect(() => {
    if (q.trim().length >= 2) {
      const t = setTimeout(() => { void onSearch('auto') }, 400)
      return () => clearTimeout(t)
    } else {
      setResults([])
    }
  }, [q, onSearch])

  return (
    <div className="mb-4 space-y-2">
      <div className="flex items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActiveIdx((i) => (results.length ? (i + 1) % results.length : -1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActiveIdx((i) => (results.length ? (i - 1 + results.length) % results.length : -1))
            } else if (e.key === 'Enter') {
              if (activeIdx >= 0 && activeIdx < results.length) {
                // Navigate to Resources tab as a source context
                const href = `/subjects/${subjectId}?tab=resources`
                // client-side open
                window.location.assign(href)
              } else {
                void onSearch()
              }
            }
          }}
          placeholder="Search your subject semantically…"
          className="max-w-xl"
        />
        <Button onClick={() => void onSearch('explicit')} disabled={q.trim().length < 2} variant="secondary">
          {loading ? "Searching…" : "Search"}
        </Button>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      {loading && (
        <div className="rounded-md border bg-card p-3">
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ))}
          </div>
        </div>
      )}
      {!loading && results.length > 0 && (
        <ul role="list" aria-label="Semantic search results" className="divide-y rounded-md border bg-card">
          {results.map((r, i) => {
            const pct = Math.max(0, Math.min(1, r.score)) * 100
            const isActive = i === activeIdx
            return (
              <li
                key={`${r.documentId}:${r.chunkIndex}:${i}`}
                role="listitem"
                className={`p-3 transition-colors ${isActive ? 'bg-muted/50' : ''}`}
                onMouseEnter={() => setActiveIdx(i)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">{r.documentFilename}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="h-1.5 w-20 rounded bg-secondary">
                      <div className="h-1.5 rounded bg-emerald-500" style={{ width: `${pct.toFixed(0)}%` }} />
                    </div>
                    <span>{r.score.toFixed(2)}</span>
                  </div>
                </div>
                <div className="mt-1 text-sm text-muted-foreground line-clamp-3">{r.snippet}</div>
                <div className="mt-2 text-xs">
                  <Link href={`/subjects/${subjectId}?tab=resources`} className="text-indigo-600 hover:underline">
                    View source
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {q.trim().length >= 2 && !loading && results.length === 0 && !error && (
        <div className="text-sm text-muted-foreground">No results.</div>
      )}
    </div>
  )
}
