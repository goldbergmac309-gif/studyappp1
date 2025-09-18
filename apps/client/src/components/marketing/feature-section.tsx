"use client"

import { Brain, UploadCloud, Shield } from "lucide-react"

const features = [
  {
    icon: Brain,
    title: "Topic Heat Maps",
    desc: "See what's most important at a glance so you can study with intent.",
  },
  {
    icon: UploadCloud,
    title: "Smart Ingestion",
    desc: "Upload notes and past exams. We analyze and organize them for you.",
  },
  {
    icon: Shield,
    title: "Private by Default",
    desc: "Your data is yours. We secure it with modern best practices.",
  },
]

export default function FeatureSection() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-xl border p-6 bg-card">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div className="font-medium">{title}</div>
            <div className="mt-1 text-sm text-muted-foreground">{desc}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
