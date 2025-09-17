"use client"

import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { updateWidget } from "@/lib/api"
import { WidgetChrome } from "./widget-chrome"
import Image from "next/image"

function getFavicon(u: string): string | null {
  try {
    const url = new URL(u)
    return `${url.origin}/favicon.ico`
  } catch {
    return null
  }
}

export function LinkTileWidget({ widgetId, subjectId, url: initialUrl, title: initialTitle }: { widgetId: string; subjectId: string; url?: string; title?: string }) {
  const [url, setUrl] = useState(initialUrl ?? "")
  const [title, setTitle] = useState(initialTitle ?? "")

  useEffect(() => {
    const t = setTimeout(() => {
      updateWidget(subjectId, widgetId, { content: { url, title } }).catch(() => {})
    }, 400)
    return () => clearTimeout(t)
  }, [url, title, subjectId, widgetId])

  const favicon = useMemo(() => getFavicon(url || ""), [url])

  return (
    <WidgetChrome title="Link" className="shadow-lift">
      <div className="space-y-3">
        <div className="no-drag space-y-2">
          <Input placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)} />
          <Input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="no-drag flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
            {favicon ? (
              <Image src={favicon} alt="" width={16} height={16} unoptimized />
            ) : null}
            <span className="truncate">{title || url}</span>
          </a>
        ) : (
          <div className="text-xs text-muted-foreground">Paste a URL to bookmark it.</div>
        )}
      </div>
    </WidgetChrome>
  )
}
