"use client"

import * as React from "react"
import type { AnalysisMetrics } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Hash } from "lucide-react"

export type DocumentMetricsProps = {
  metrics: AnalysisMetrics
  engineVersion: string
}

export default function DocumentMetrics({ metrics, engineVersion }: DocumentMetricsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Metrics</CardTitle>
        <CardDescription>Summary of the analyzed document</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-md border p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" /> Pages
            </div>
            <div className="mt-1 text-lg font-semibold">{metrics.pages}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Hash className="h-4 w-4" /> Text length
            </div>
            <div className="mt-1 text-lg font-semibold">{metrics.textLength.toLocaleString()}</div>
          </div>
          <div className="rounded-md border p-3 sm:col-span-1 col-span-2">
            <div className="text-sm text-muted-foreground">Engine</div>
            <div className="mt-1 text-lg font-semibold break-words">{engineVersion}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
