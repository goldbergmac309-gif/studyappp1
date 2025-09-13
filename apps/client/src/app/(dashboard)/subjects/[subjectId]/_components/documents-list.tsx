"use client"

import * as React from "react"
import type { Document } from "@/lib/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import DocumentListItem from "./document-list-item"

export type DocumentsListProps = {
  documents: Document[]
  selectedId?: string
  onSelect: (id: string) => void
  isLoading?: boolean
  error?: string
  onRetry?: () => void
  onReprocess?: (id: string) => void
}

export default function DocumentsList({
  documents,
  selectedId,
  onSelect,
  isLoading = false,
  error,
  onRetry,
  onReprocess,
}: DocumentsListProps) {
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load documents</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>{error}</span>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="ml-2">
              Retry
            </Button>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  if (isLoading) {
    return (
      <div className="grid gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    )
  }

  const list = [...(documents ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  if (list.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>No documents yet</CardTitle>
          <CardDescription>
            Upload past exams, lecture notes, and PDFs to power your analysis.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="grid gap-3">
      {list.map((doc) => (
        <DocumentListItem
          key={doc.id}
          doc={doc}
          isActive={doc.id === selectedId}
          onClick={() => onSelect(doc.id)}
          onReprocess={onReprocess}
        />
      ))}
    </div>
  )
}
