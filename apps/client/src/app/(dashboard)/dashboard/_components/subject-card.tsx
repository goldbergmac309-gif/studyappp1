"use client"

import Link from "next/link"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BookText } from "lucide-react"

export interface SubjectCardProps {
  subject: { id: string; name: string }
}

export default function SubjectCard({ subject }: SubjectCardProps) {
  return (
    <Link href={`/subjects/${subject.id}`} className="group">
      <Card className="transition-colors hover:border-foreground/30">
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="rounded-md border bg-background p-2 text-foreground/80 group-hover:text-foreground">
            <BookText className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="leading-tight">{subject.name}</CardTitle>
            <CardDescription>Open workspace</CardDescription>
          </div>
        </CardHeader>
      </Card>
    </Link>
  )
}
