"use client"

import { TOPICS } from "@/app/(dashboard)/dashboard/_components/topics.config"
import Image from "next/image"

export default function TopicsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Topics</h1>
        <p className="text-sm text-muted-foreground">Browse recommended topics to jumpstart your learning.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {TOPICS.map((t) => (
          <div key={t.id} className="bg-white border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer">
            <div className="aspect-video bg-muted overflow-hidden">
              <div className="relative w-full h-full">
                <Image src={t.imageSrc || "/placeholder.svg"} alt={t.title} fill sizes="(max-width: 768px) 100vw, 25vw" style={{ objectFit: 'cover' }} unoptimized />
              </div>
            </div>
            <div className="p-3">
              <h4 className="font-medium text-sm line-clamp-1">{t.title}</h4>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
