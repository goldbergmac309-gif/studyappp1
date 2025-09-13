"use client"

import * as React from "react"
import type { AnalysisKeyword } from "@/lib/types"
import { cn } from "@/lib/utils"

export type CssWordCloudProps = {
  keywords: AnalysisKeyword[]
  className?: string
}

function normalizeScores(keywords: AnalysisKeyword[]) {
  if (!keywords || keywords.length === 0) return [] as (AnalysisKeyword & { norm: number })[]
  const scores = keywords.map((k) => k.score)
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const span = max - min || 1
  return keywords.map((k) => ({ ...k, norm: (k.score - min) / span }))
}

export default function CssWordCloud({ keywords, className }: CssWordCloudProps) {
  const items = React.useMemo(() => normalizeScores(keywords), [keywords])

  if (!items.length) {
    return <div className={cn("text-sm text-muted-foreground", className)}>No keywords available.</div>
  }

  return (
    <div
      role="list"
      aria-label="Topic heat map"
      className={cn(
        "flex flex-wrap items-start gap-x-3 gap-y-2 whitespace-pre-wrap",
        className
      )}
    >
      {items.map(({ term, score, norm }) => {
        const fontRem = 0.85 + norm * 1.15 // 0.85rem to 2.0rem
        const opacity = 0.7 + norm * 0.3 // 0.7 to 1.0
        return (
          <span
            key={term}
            role="listitem"
            title={`${term} – score ${score.toFixed(3)}`}
            aria-label={`${term}, score ${score.toFixed(2)}`}
            className={cn(
              "select-none rounded px-1 py-0.5",
              "text-indigo-700 dark:text-indigo-300"
            )}
            style={{ fontSize: `${fontRem}rem`, opacity }}
          >
            {term}
          </span>
        )
      })}
    </div>
  )
}
