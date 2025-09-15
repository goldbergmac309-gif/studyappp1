"use client"

import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { TOPICS } from "@/app/(dashboard)/dashboard/_components/topics.config"

function Topic({ title, imageSrc }: { title: string; imageSrc?: string }) {
  const src = imageSrc || "/placeholder.svg"
  return (
    <div className="bg-white border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer">
      <div className="aspect-video bg-muted overflow-hidden">
        <img src={src} alt={title} className="w-full h-full object-cover" />
      </div>
      <div className="p-3">
        <h4 className="font-medium text-sm line-clamp-1">{title}</h4>
      </div>
    </div>
  )
}

export default function TopicsExplorer() {
  const topics = TOPICS
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-lg">Explore topics</h3>
        <Button asChild variant="ghost" size="sm" className="text-xs h-8 gap-1">
          <Link href="/topics">
            <span>Browse all</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {topics.map((t) => (
          <Topic key={t.id} title={t.title} imageSrc={t.imageSrc} />
        ))}
      </div>
    </div>
  )
}
