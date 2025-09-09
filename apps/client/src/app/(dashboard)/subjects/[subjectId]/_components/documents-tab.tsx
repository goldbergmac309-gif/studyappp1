"use client"

import React, { forwardRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { UploadCloud, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export type DocStatus = "UPLOADED" | "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED"
export interface DocumentItem {
  id: string
  filename: string
  status: DocStatus
  createdAt?: string
}

function statusVariant(s: DocStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (s) {
    case "COMPLETED":
      return "default"
    case "PROCESSING":
    case "QUEUED":
      return "secondary"
    case "FAILED":
      return "destructive"
    default:
      return "outline"
  }
}

type DocumentsTabProps = {
  docs: DocumentItem[] | null
  docsLoading: boolean
  docsError: string | null
  uploading: boolean
  uploadProgress: number
  onSelectFiles: (files: FileList | File[]) => void
}

const DocumentsTab = forwardRef<HTMLInputElement, DocumentsTabProps>(function DocumentsTab({
  docs,
  docsLoading,
  docsError,
  uploading,
  uploadProgress,
  onSelectFiles,
}, ref) {
  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) onSelectFiles(e.target.files)
  }

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

      {docsError && (
        <Alert variant="destructive">
          <AlertTitle>Could not load documents</AlertTitle>
          <AlertDescription>{docsError}</AlertDescription>
        </Alert>
      )}

      {docsLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : docs && docs.length > 0 ? (
        <div className="grid gap-3">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-3">
                <div className="rounded-md border bg-background p-2 text-foreground/80">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-medium leading-none">{d.filename}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.createdAt ? new Date(d.createdAt).toLocaleString() : ""}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={statusVariant(d.status)}>{d.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No documents yet</CardTitle>
            <CardDescription>
              Upload past exams, lecture notes, and PDFs to power your analysis.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
})

export default DocumentsTab
