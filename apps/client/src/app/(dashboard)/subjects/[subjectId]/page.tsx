"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, History } from "lucide-react"

import api from "@/lib/api"
import { isAxiosError } from "axios"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { CanvasGrid } from "@/app/(dashboard)/subjects/[subjectId]/_components/canvas/canvas-grid"
import DocumentsTab from "@/app/(dashboard)/subjects/[subjectId]/_components/documents-tab"
import { useDocumentPolling } from "@/lib/hooks/useDocumentPolling"

interface Subject { id: string; name: string }

export default function SubjectWorkspacePage() {
  const { subjectId } = useParams<{ subjectId: string }>()
  const router = useRouter()
  const search = useSearchParams()
  const [subject, setSubject] = useState<Subject | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Own the unified polling lifecycle for this subject (for resources/documents)
  const { start, stop } = useDocumentPolling(subjectId, { autoStart: false })

  const title = useMemo(() => subject?.name ?? "Subject", [subject])
  const subtitle = useMemo(() => "Calculus and advanced algebra", [])

  useEffect(() => {
    async function fetchSubject() {
      try {
        setError(null)
        const res = await api.get<Subject>(`/subjects/${subjectId}`)
        setSubject(res.data)
      } catch (e: unknown) {
        const message = isAxiosError(e) ? (e.response?.data as { message?: string })?.message : "Failed to load subject"
        setError(String(message))
      } finally {
        setLoading(false)
      }
    }
    fetchSubject()
  }, [subjectId])

  // Keyboard shortcuts: E toggles edit mode
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === 'e' || e.key === 'E') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        setEditMode((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Start polling after subject is fetched (not loading)
  useEffect(() => {
    if (!loading && subjectId) start()
    return () => { stop() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, subjectId])

  const onDrop = useCallback(
    async (files: FileList | File[]) => {
      const file = Array.isArray(files) ? files[0] : files?.[0]
      if (!file) return
      try {
        setUploading(true)
        setUploadProgress(0)
        const form = new FormData()
        form.append("file", file)
        await api.post(`/subjects/${subjectId}/documents`, form, {
          onUploadProgress: (evt) => {
            if (!evt.total) return
            const pct = Math.round((evt.loaded / evt.total) * 100)
            setUploadProgress(pct)
          },
        })
      } catch {
        // handled inside DocumentsTab via toast on retry, keep page quiet
      } finally {
        setUploading(false)
        setUploadProgress(0)
      }
    },
    [subjectId]
  )

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header: Breadcrumbs + Title + Actions */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{loading ? <Skeleton className="h-5 w-40" /> : title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{loading ? '—' : title}</h1>
            <p className="text-sm text-muted-foreground -mt-0.5">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setEditMode(false)} aria-pressed={!editMode} aria-label="View mode (E to toggle)">View Mode</Button>
          <Button onClick={() => setEditMode((v) => !v)} aria-pressed={editMode} aria-label="Edit board (E to toggle)">Edit Board</Button>
          <Button variant="secondary" onClick={() => router.push(`/subjects/${subjectId}/tutor`)} aria-label="Study History" className="hidden md:inline-flex">
            <History className="h-4 w-4 mr-2" /> Study History
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="ml-2">Could not load subject</AlertTitle>
          <AlertDescription className="ml-6">{error}</AlertDescription>
        </Alert>
      )}

      <Separator />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <Tabs
          value={search.get("tab") ?? "overview"}
          onValueChange={(v) => {
            const params = new URLSearchParams(search.toString())
            params.set("tab", v)
            router.push(`?${params.toString()}`)
          }}
          className="w-full"
        >
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="practice">Practice</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <CanvasGrid subjectId={String(subjectId)} editMode={editMode} />
          </TabsContent>
          <TabsContent value="notes" className="space-y-4">
            <div className="text-sm text-muted-foreground">Notes view — coming soon.</div>
          </TabsContent>
          <TabsContent value="resources" className="space-y-4">
            <DocumentsTab
              uploading={uploading}
              uploadProgress={uploadProgress}
              onSelectFiles={(files) => onDrop(files)}
              onRetry={() => start()}
              ref={fileInputRef}
            />
          </TabsContent>
          <TabsContent value="practice" className="space-y-4">
            <div className="text-sm text-muted-foreground">Practice view — coming soon.</div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
