"use client"

import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { BookText, FileUp, AlertCircle } from "lucide-react"

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import DocumentsTab, { type DocumentItem } from "@/app/(dashboard)/subjects/[subjectId]/_components/documents-tab"
import InsightsTab from "@/app/(dashboard)/subjects/[subjectId]/_components/insights-tab"

interface Subject {
  id: string
  name: string
}

// Using DocStatus from DocumentsTab types; no local alias needed

export default function SubjectWorkspacePage() {
  const { subjectId } = useParams<{ subjectId: string }>()
  const [subject, setSubject] = useState<Subject | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [docs, setDocs] = useState<DocumentItem[] | null>(null)
  const [docsLoading, setDocsLoading] = useState(true)
  const [docsError, setDocsError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const title = useMemo(() => subject?.name ?? "Subject", [subject])

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

  const fetchDocuments = useCallback(async () => {
    try {
      setDocsError(null)
      setDocsLoading(true)
      const res = await api.get<DocumentItem[]>(`/subjects/${subjectId}/documents`)
      setDocs((prev) => {
        const prevList = prev ?? []
        const temp = prevList.filter((d) => d.id.startsWith("temp-"))
        if (temp.length === 0) return res.data
        // Drop temp entries that the server already returned (by filename match)
        const serverNames = new Set(res.data.map((d) => d.filename))
        const remainingTemp = temp.filter((t) => !serverNames.has(t.filename))
        return [...remainingTemp, ...res.data]
      })
    } catch (e: unknown) {
      const message = isAxiosError(e) ? (e.response?.data as { message?: string })?.message : "Failed to load documents"
      setDocsError(String(message))
    } finally {
      setDocsLoading(false)
    }
  }, [subjectId])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // Polling: while there are documents and any is not COMPLETED, refresh list every 2s
  useEffect(() => {
    if (!docs || docs.length === 0) return
    const hasPending = docs.some((d) => d.status !== "COMPLETED")
    if (!hasPending) return
    const id = setInterval(() => {
      fetchDocuments()
    }, 2000)
    return () => clearInterval(id)
  }, [docs, subjectId, fetchDocuments])

  const onDrop = useCallback(
    async (files: FileList | File[]) => {
      const file = Array.isArray(files) ? files[0] : files?.[0]
      if (!file) return
      try {
        setUploading(true)
        setUploadProgress(0)
        // Ensure list is visible
        setDocsLoading(false)
        // Optimistic UI: show the file immediately
        const tempId = `temp-${Date.now()}`
        setDocs((prev) => [
          { id: tempId, filename: file.name, status: "UPLOADED", createdAt: new Date().toISOString() },
          ...((prev ?? [])),
        ])
        const form = new FormData()
        form.append("file", file)
        await api.post(`/subjects/${subjectId}/documents`, form, {
          onUploadProgress: (evt) => {
            if (!evt.total) return
            const pct = Math.round((evt.loaded / evt.total) * 100)
            setUploadProgress(pct)
          },
        })
        toast.success("Upload queued", { description: file.name })
        await fetchDocuments()
      } catch (e: unknown) {
        const message = isAxiosError(e) ? (e.response?.data as { message?: string })?.message : "Upload failed"
        toast.error("Upload failed", { description: String(message) })
        // Remove optimistic row on failure
        setDocs((prev) => (prev ? prev.filter((d) => !d.id.startsWith("temp-")) : prev))
      } finally {
        setUploading(false)
        setUploadProgress(0)
      }
    },
    [subjectId, fetchDocuments]
  )

  return (
    <div className="space-y-6 md:space-y-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="ml-2">Could not load subject</AlertTitle>
          <AlertDescription className="ml-6">{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-md border bg-background p-2 text-foreground/80">
            <BookText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {loading ? <Skeleton className="h-7 w-48" /> : title}
            </h1>
            <p className="text-muted-foreground text-sm">Your subject workspace</p>
          </div>
        </div>
        <div>
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <FileUp className="mr-2 h-4 w-4" /> Upload document
          </Button>
        </div>
      </div>

      <Separator />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Progress</CardTitle>
                <CardDescription>Key metrics for this subject</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">Coming soon</div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="documents" className="space-y-4">
            <DocumentsTab
              docs={docs}
              docsLoading={docsLoading}
              docsError={docsError}
              uploading={uploading}
              uploadProgress={uploadProgress}
              onSelectFiles={(files) => onDrop(files)}
              ref={fileInputRef}
            />
          </TabsContent>
          <TabsContent value="insights" className="space-y-4">
            <InsightsTab />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
