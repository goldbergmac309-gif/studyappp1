"use client"

import * as React from "react"
import { semanticSearch } from "@/lib/api"
import type { SemanticSearchHit } from "@studyapp/shared-types"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function SemanticSearch({ subjectId }: { subjectId: string }) {
  const [q, setQ] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [results, setResults] = React.useState<SemanticSearchHit[]>([])
  const acRef = React.useRef<AbortController | null>(null)

  const onSearch = React.useCallback(async () => {
    const query = q.trim()
    if (query.length < 2) {
      setResults([])
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
  }, [q, subjectId])

  React.useEffect(() => {
    if (q.trim().length >= 2) {
      const t = setTimeout(onSearch, 400)
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
          placeholder="Search your subject semantically…"
          className="max-w-xl"
        />
        <Button onClick={onSearch} disabled={loading || q.trim().length < 2} variant="secondary">
          {loading ? "Searching…" : "Search"}
        </Button>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      {results.length > 0 && (
        <ul className="divide-y rounded-md border bg-card">
          {results.map((r, i) => (
            <li key={`${r.documentId}:${r.chunkIndex}:${i}`} className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">{r.documentFilename}</div>
                <div className="text-xs text-muted-foreground">Score: {r.score.toFixed(3)}</div>
              </div>
              <div className="mt-1 text-sm text-muted-foreground line-clamp-3">{r.snippet}</div>
            </li>
          ))}
        </ul>
      )}
      {q.trim().length >= 2 && !loading && results.length === 0 && !error && (
        <div className="text-sm text-muted-foreground">No results.</div>
      )}
    </div>
  )
}
