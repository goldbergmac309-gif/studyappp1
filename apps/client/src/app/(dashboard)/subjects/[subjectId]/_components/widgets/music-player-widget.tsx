"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { updateWidget } from "@/lib/api"
import { WidgetChrome } from "./widget-chrome"

function toSpotifyEmbed(url: string): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.hostname.includes("open.spotify.com")) {
      const parts = u.pathname.split("/").filter(Boolean)
      // e.g. /playlist/<id>
      if (parts.length >= 2) {
        const kind = parts[0]
        const id = parts[1]
        return `https://open.spotify.com/embed/${kind}/${id}`
      }
    }
  } catch {}
  return null
}

export function MusicPlayerWidget({ widgetId, subjectId, playlistUrl }: { widgetId: string; subjectId: string; playlistUrl?: string }) {
  const [url, setUrl] = useState(playlistUrl ?? "")

  useEffect(() => {
    const t = setTimeout(() => {
      updateWidget(subjectId, widgetId, { content: { playlistUrl: url } }).catch(() => {})
    }, 500)
    return () => clearTimeout(t)
  }, [url, subjectId, widgetId])

  const embed = toSpotifyEmbed(url)

  return (
    <WidgetChrome title="Music Player" className="shadow-lift">
      <div className="space-y-3">
        <div className="no-drag">
          <Input placeholder="Paste a Spotify playlist/album link" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        {embed ? (
          <div className="aspect-video w-full overflow-hidden rounded-md border">
            <iframe
              src={embed}
              width="100%"
              height="100%"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">Enter a Spotify link to play your focus playlist.</div>
        )}
      </div>
    </WidgetChrome>
  )
}
