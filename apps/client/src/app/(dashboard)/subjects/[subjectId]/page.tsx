"use client"

import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
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
import DocumentsTab from "@/app/(dashboard)/subjects/[subjectId]/_components/documents-tab"
import InsightsTab from "@/app/(dashboard)/subjects/[subjectId]/_components/insights-tab"
import SettingsTab from "@/app/(dashboard)/subjects/[subjectId]/_components/settings-tab"
import { useDocumentPolling } from "@/lib/hooks/useDocumentPolling"

interface Subject {
  id: string
  name: string
}

export default function SubjectWorkspacePage() {
  const { subjectId } = useParams<{ subjectId: string }>()
  const router = useRouter()
  const search = useSearchParams()
  const [subject, setSubject] = useState<Subject | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Own the unified polling lifecycle for this subject
  const { start, stop } = useDocumentPolling(subjectId, { autoStart: false })

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

  // Start polling after subject is fetched (not loading)
  useEffect(() => {
    if (!loading && subjectId) {
      start()
    }
    return () => {
      stop()
    }
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
        toast.success("Upload queued", { description: file.name })
      } catch (e: unknown) {
        const message = isAxiosError(e) ? (e.response?.data as { message?: string })?.message : "Upload failed"
        toast.error("Upload failed", { description: String(message) })
      } finally {
        setUploading(false)
        setUploadProgress(0)
      }
    },
    [subjectId]
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
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
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
              uploading={uploading}
              uploadProgress={uploadProgress}
              onSelectFiles={(files) => onDrop(files)}
              onRetry={() => start()}
              ref={fileInputRef}
            />
          </TabsContent>
          <TabsContent value="insights" className="space-y-4">
            <InsightsTab />
          </TabsContent>
          <TabsContent value="settings" className="space-y-4">
            <SettingsTab subjectId={subjectId} onSaved={() => router.refresh()} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
