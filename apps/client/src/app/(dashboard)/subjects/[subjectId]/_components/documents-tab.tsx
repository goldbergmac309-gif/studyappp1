"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DocumentViewer } from "./document-viewer"
import React, { forwardRef, useCallback, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { UploadCloud } from "lucide-react"
import DocumentsList from "./documents-list"
import { useSubjectStore } from "@/lib/subject-store"
import { reprocessDocument } from "@/lib/api"
import { toast } from "sonner"
import type { ResourceType } from "@/lib/types"

type DocumentsTabProps = {
  uploading: boolean
  uploadProgress: number
  onSelectFiles: (files: FileList | File[]) => void
  onRetry?: () => void
  selectedResourceType: ResourceType
  onChangeResourceType: (rt: ResourceType) => void
}

const DocumentsTab = forwardRef<HTMLInputElement, DocumentsTabProps>(function DocumentsTab(
  { uploading, uploadProgress, onSelectFiles, onRetry, selectedResourceType, onChangeResourceType },
  ref
) {
  const { subjectId } = useParams<{ subjectId: string }>()
  const router = useRouter()
  const search = useSearchParams()
  const selectedParam = search.get("doc") ?? undefined

  const documents = useSubjectStore((s) => s.documents)
  const loading = useSubjectStore((s) => s.loading)
  const error = useSubjectStore((s) => s.error)
  const selectedId = useSubjectStore((s) => s.selectedDocId || undefined)
  const setSelectedDoc = useSubjectStore((s) => s.setSelectedDoc)

  // URL -> store selection sync
  useEffect(() => {
    if (selectedParam && documents.some((d) => d.id === selectedParam)) {
      if (selectedId !== selectedParam) setSelectedDoc(selectedParam)
    } else if (!selectedId && documents.length > 0) {
      // default to most recent document if none selected
      setSelectedDoc(documents[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedParam, documents])

  const pollError = null

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) onSelectFiles(e.target.files)
  }

  const handleSelect = useCallback(
    (id: string) => {
      const params = new URLSearchParams(search.toString())
      params.set("doc", id)
      params.set("tab", "insights")
      router.push(`?${params.toString()}`)
    },
    [router, search]
  )

  // Minimal Resource Viewer dialog state
  const [viewerId, setViewerId] = React.useState<string | null>(null)
  const activeDoc = React.useMemo(() => documents.find(d => d.id === viewerId), [documents, viewerId])

  const [filterType, setFilterType] = React.useState<"ALL" | ResourceType>("ALL")
  const filteredDocuments = React.useMemo(() => {
    if (filterType === "ALL") return documents
    return documents.filter((d) => ((d as any).resourceType as string | undefined) === filterType)
  }, [documents, filterType])

  const handleReprocess = useCallback(
    async (docId: string) => {
      if (!subjectId) return
      try {
        await reprocessDocument(subjectId, docId)
        toast.success("Reprocessing queued")
        onRetry?.()
      } catch (e: unknown) {
        toast.error("Reprocess failed", { description: String((e as Error)?.message ?? e) })
      }
    },
    [subjectId, onRetry]
  )

  return (
    <div className="space-y-4">
      <Card className="rounded-xl shadow-subtle">
        <CardHeader>
          <CardTitle>Upload</CardTitle>
          <CardDescription>Upload past exams, lecture notes, and PDFs.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-3">
            <label htmlFor="resourceType" className="text-sm text-muted-foreground">
              Resource type
            </label>
            <select
              id="resourceType"
              value={selectedResourceType}
              onChange={(e) => onChangeResourceType(e.target.value as ResourceType)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              {[
                "EXAM",
                "SYLLABUS",
                "LECTURE_NOTES",
                "TEXTBOOK",
                "PRACTICE_SET",
                "NOTES",
                "OTHER",
              ].map((v) => (
                <option key={v} value={v}>
                  {v.replace("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
          <div
            onDragOver={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onSelectFiles(e.dataTransfer.files)
            }}
            className="group relative grid place-items-center rounded-xl border border-dashed p-6 text-center hover:bg-muted/50"
          >
            <div className="pointer-events-none flex flex-col items-center gap-2">
              <UploadCloud className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Drag & drop file here, or click to choose</p>
              {uploading && (
                <p className="text-xs text-muted-foreground">Uploading… {uploadProgress}%</p>
              )}
            </div>
            <input
              type="file"
              onChange={onFileInputChange}
              ref={ref}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Upload document"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Allowed types: PDF, TXT, MD, DOCX, DOC. All uploads are scanned for malware.
          </p>
        </CardContent>
      </Card>

      {(error || pollError) && (
        <Alert variant="destructive">
          <AlertTitle>Could not load documents</AlertTitle>
          <AlertDescription>
            {(error ?? pollError) || "An unexpected error occurred."}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Documents</div>
        <div className="flex items-center gap-2">
          <label htmlFor="filterType" className="text-xs text-muted-foreground">Filter</label>
          <select
            id="filterType"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="h-8 rounded-md border bg-background px-2 text-xs"
          >
            <option value="ALL">All</option>
            {[
              "EXAM",
              "SYLLABUS",
              "LECTURE_NOTES",
              "TEXTBOOK",
              "PRACTICE_SET",
              "NOTES",
              "OTHER",
            ].map((v) => (
              <option key={v} value={v}>{v.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}</option>
            ))}
          </select>
        </div>
      </div>

      <DocumentsList
        documents={filteredDocuments}
        selectedId={selectedId}
        onSelect={handleSelect}
        isLoading={loading}
        error={error ?? undefined}
        onRetry={onRetry}
        onReprocess={handleReprocess}
        onView={(id) => setViewerId(id)}
      />
      <Dialog open={!!viewerId} onOpenChange={(open) => setViewerId(open ? viewerId : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resource</DialogTitle>
          </DialogHeader>
          {activeDoc ? <DocumentViewer doc={activeDoc} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  )
})

export default DocumentsTab
