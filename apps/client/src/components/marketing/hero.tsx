"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Hero() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:py-24 text-center">
      <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
        Calm • Focused • Fluid
      </div>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
        Study with clarity.
        <span className="block text-muted-foreground font-normal">Your cognitive co‑pilot for exams and beyond.</span>
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
        Synapse OS analyzes your notes and past exams to surface the most important topics, so you can focus on what matters.
      </p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <Button asChild>
          <Link href="/signup">Get Started</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Sign in</Link>
        </Button>
        <Button asChild variant="ghost" className="hidden sm:inline-flex">
          <Link href="/dashboard">Go to App</Link>
        </Button>
      </div>
    </section>
  )
}
