"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { performGlobalSearch } from "@/lib/api"
import type { GlobalSearchResponse } from "@studyapp/shared-types"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export default function GlobalSearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const q = useMemo(() => String(searchParams.get("q") || "").trim(), [searchParams])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<GlobalSearchResponse | null>(null)
  const [query, setQuery] = useState(q)

  useEffect(() => { setQuery(q) }, [q])

  useEffect(() => {
    let aborted = false
    async function run() {
      setError(null)
      setData(null)
      if (q.length < 2) return
      setLoading(true)
      try {
        const res = await performGlobalSearch(q)
        if (!aborted) setData(res)
      } catch (e) {
        if (!aborted) setError(e instanceof Error ? e.message : "Search failed")
      } finally {
        if (!aborted) setLoading(false)
      }
    }
    void run()
    return () => { aborted = true }
  }, [q])

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const next = (query || "").trim()
    if (next.length < 2) return
    router.push(`/search?q=${encodeURIComponent(next)}`)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Search</h1>
      <form className="flex items-center gap-2" onSubmit={onSubmit}>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your notes and documents"
          className="w-full"
        />
        <Button type="submit">Search</Button>
      </form>
      <Separator />

      {q.length < 2 && (
        <div className="text-sm text-muted-foreground">Type at least 2 characters to search.</div>
      )}
      {loading && <div className="text-sm text-muted-foreground">Searching…</div>}
      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}
      {!loading && !error && q.length >= 2 && data && (
        <div className="space-y-8">
          <section>
            <h2 className="text-sm font-medium mb-2">Notes</h2>
            {data.notes.length === 0 ? (
              <div className="text-sm text-muted-foreground">No notes matched.</div>
            ) : (
              <ul className="divide-y rounded-md border">
                {data.notes.map((n) => (
                  <li key={`n-${n.id}`} className="p-3">
                    <div className="text-sm font-medium">{n.title}</div>
                    <div className="text-xs text-muted-foreground">Updated {new Date(n.updatedAt).toLocaleString()}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-sm font-medium mb-2">Documents</h2>
            {data.documents.length === 0 ? (
              <div className="text-sm text-muted-foreground">No documents matched.</div>
            ) : (
              <ul className="divide-y rounded-md border">
                {data.documents.map((d) => (
                  <li key={`d-${d.id}`} className="p-3">
                    <div className="text-sm font-medium">{d.filename}</div>
                    <div className="text-xs text-muted-foreground">Created {new Date(d.createdAt).toLocaleString()}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
