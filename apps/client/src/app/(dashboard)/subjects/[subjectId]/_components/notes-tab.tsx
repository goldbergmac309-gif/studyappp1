"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { Plus, MoreHorizontal, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { TipTapEditor } from "@/components/editor/TipTapEditor"

import { createNote, deleteNote, listNotes, updateNote } from "@/lib/api"
import type { NoteDto } from "@studyapp/shared-types"

function useDebouncedCallback(fn: () => Promise<void> | void, delay: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const run = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { void fn() }, delay)
  }, [fn, delay])
  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
      await fn()
    }
  }, [fn])
  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }, [])
  return { run, flush, cancel }
}

export default function NotesTab() {
  const { subjectId } = useParams<{ subjectId: string }>()
  const [notes, setNotes] = useState<NoteDto[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadAbort = useRef<AbortController | null>(null)

  const selected = useMemo(() => notes.find((n) => n.id === selectedId) || null, [notes, selectedId])
  const [title, setTitle] = useState<string>(selected?.title ?? "")
  const [content, setContent] = useState<any>(selected?.content ?? { type: 'doc', content: [] })
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle")

  // Load notes
  useEffect(() => {
    let active = true
    async function load() {
      try {
        setError(null)
        const ctrl = new AbortController()
        loadAbort.current = ctrl
        const items = await listNotes(String(subjectId), { signal: ctrl.signal })
        if (!active) return
        setNotes(items)
        // Select first note if none selected
        if (items.length > 0 && !selectedId) {
          setSelectedId(items[0].id)
        }
      } catch (e: unknown) {
        if ((e as any)?.name === 'AbortError') return
        if (!active) return
        setError(String((e as Error)?.message ?? e))
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false; try { loadAbort.current?.abort() } catch {} }
  }, [subjectId])

  // When selected changes, sync local title/content
  useEffect(() => {
    setTitle(selected?.title ?? "")
    setContent(selected?.content ?? { type: 'doc', content: [] })
    setSaving("idle")
  }, [selected?.id])

  // Keep a valid selection when notes array changes
  useEffect(() => {
    if (notes.length === 0) {
      if (selectedId) setSelectedId(null)
      return
    }
    const exists = notes.some((n) => n.id === selectedId)
    if (!exists) setSelectedId(notes[0].id)
  }, [notes])

  // Title autosave (fast debounce)
  const saveTitle = useCallback(async () => {
    if (!selected) return
    try {
      setSaving("saving")
      const updated = await updateNote(String(subjectId), selected.id, { title })
      setNotes((arr) => arr.map((n) => (n.id === updated.id ? { ...n, title: updated.title, updatedAt: updated.updatedAt } : n)))
      setSaving("saved")
    } catch (e: unknown) {
      toast.error("Failed to save title", { description: String((e as Error)?.message ?? e) })
      setSaving("idle")
    }
  }, [selected, title, subjectId])
  const titleDebounced = useDebouncedCallback(saveTitle, 600)

  // Content autosave (2s debounce)
  const saveContent = useCallback(async () => {
    if (!selected) return
    try {
      setSaving("saving")
      const updated = await updateNote(String(subjectId), selected.id, { content })
      setNotes((arr) => arr.map((n) => (n.id === updated.id ? { ...n, content: updated.content, updatedAt: updated.updatedAt } : n)))
      setSaving("saved")
    } catch (e: unknown) {
      toast.error("Failed to save", { description: String((e as Error)?.message ?? e) })
      setSaving("idle")
    }
  }, [selected, content, subjectId])
  const contentDebounced = useDebouncedCallback(saveContent, 2000)

  // Handlers
  const handleCreate = useCallback(async () => {
    try {
      // Avoid race with initial load overriding freshly created note
      try { loadAbort.current?.abort() } catch {}
      const created = await createNote(String(subjectId), { title: "Untitled", content: { type: 'doc', content: [] } })
      setNotes((arr) => [created, ...arr])
      setSelectedId(created.id)
      toast.success("Note created")
    } catch (e: unknown) {
      toast.error("Failed to create note", { description: String((e as Error)?.message ?? e) })
    }
  }, [subjectId])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this note? This action cannot be undone.")) return
    try {
      await deleteNote(String(subjectId), id)
      setNotes((arr) => arr.filter((n) => n.id !== id))
      if (selectedId === id) setSelectedId(null)
      toast.success("Note deleted")
    } catch (e: unknown) {
      toast.error("Failed to delete note", { description: String((e as Error)?.message ?? e) })
    }
  }, [subjectId, selectedId])

  const onTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
    titleDebounced.run()
  }, [titleDebounced])

  const onEditorChange = useCallback((json: any) => {
    setContent(json)
    contentDebounced.run()
  }, [contentDebounced])

  // Flush pending saves when switching selection
  const switchSelection = useCallback(async (id: string) => {
    await titleDebounced.flush()
    await contentDebounced.flush()
    setSelectedId(id)
  }, [titleDebounced, contentDebounced])

  return (
    <div className="grid gap-6 md:grid-cols-[280px_1fr]">
      {/* Sidebar */}
      <Card className="rounded-xl shadow-subtle">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Notes</CardTitle>
          <Button size="sm" data-testid="notes-new" onClick={handleCreate}><Plus className="h-4 w-4 mr-1" /> New</Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : notes.length === 0 ? (
            <div className="text-sm text-muted-foreground">No notes yet — create your first note.</div>
          ) : (
            <ul className="space-y-1" data-testid="notes-list">
              {notes.map((n) => (
                <li key={n.id} className="flex items-center gap-1">
                  <button
                    onClick={() => switchSelection(n.id)}
                    data-testid="note-select"
                    className={`flex-1 text-left rounded-md px-2 py-1.5 hover:bg-muted transition ${selectedId === n.id ? 'bg-muted' : ''}`}
                  >
                    <span className="truncate text-sm block">{n.title || 'Untitled'}</span>
                  </button>
                  <button
                    className="text-muted-foreground hover:text-foreground px-2 py-1 rounded-md"
                    aria-label="More"
                    onClick={(e) => {
                      e.stopPropagation()
                      // Simple action: delete for now
                      void handleDelete(n.id)
                    }}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Editor Panel */}
      <div className="space-y-3">
        {selected ? (
          <>
            <div className="flex items-center gap-2">
              <Input data-testid="note-title" value={title} onChange={onTitleChange} placeholder="Untitled" className="h-9 text-base" />
              <span className="text-xs text-muted-foreground ml-auto" data-testid="saving-indicator">
                {saving === 'saving' ? 'Saving…' : saving === 'saved' ? 'Saved' : ''}
              </span>
              {selectedId && (
                <Button variant="ghost" size="sm" className="text-xs h-8 gap-1" onClick={() => handleDelete(selectedId)}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              )}
            </div>
            <Separator />
            <TipTapEditor value={content} onChange={onEditorChange} className="min-h-[380px]" />
          </>
        ) : (
          <Card className="rounded-xl shadow-subtle">
            <CardContent className="py-10 text-center">
              <div className="text-sm text-muted-foreground">Select a note from the sidebar or create a new one.</div>
              <div className="mt-4">
                <Button onClick={handleCreate}><Plus className="h-4 w-4 mr-1" /> New note</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
