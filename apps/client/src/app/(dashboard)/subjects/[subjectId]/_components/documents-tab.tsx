"use client"

import React, { forwardRef, useCallback, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { UploadCloud } from "lucide-react"
import DocumentsList from "./documents-list"
import { useSubjectStore } from "@/lib/subject-store"

type DocumentsTabProps = {
  uploading: boolean
  uploadProgress: number
  onSelectFiles: (files: FileList | File[]) => void
  onRetry?: () => void
}

const DocumentsTab = forwardRef<HTMLInputElement, DocumentsTabProps>(function DocumentsTab(
  { uploading, uploadProgress, onSelectFiles, onRetry },
  ref
) {
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Upload</CardTitle>
          <CardDescription>Upload past exams, lecture notes, and PDFs.</CardDescription>
        </CardHeader>
        <CardContent>
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
            className="group relative grid place-items-center rounded-md border border-dashed p-6 text-center hover:bg-muted/50"
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

      <DocumentsList
        documents={documents}
        selectedId={selectedId}
        onSelect={handleSelect}
        isLoading={loading}
        error={error ?? undefined}
        onRetry={onRetry}
      />
    </div>
  )
})

export default DocumentsTab
