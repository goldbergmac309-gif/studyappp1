"use client"

import Link from "next/link"
import { Separator } from "@/components/ui/separator"
import { LayoutDashboard, BookText } from "lucide-react"

export default function Sidebar() {
  return (
    <nav className="space-y-4 text-sm">
      <div>
        <h2 className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Navigation</h2>
        <ul className="mt-2 space-y-1">
          <li>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
            >
              <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
              <span>Dashboard</span>
            </Link>
          </li>
        </ul>
      </div>
      <Separator />
      <div>
        <h2 className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subjects</h2>
        <ul className="mt-2 space-y-1">
          <li>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
            >
              <BookText className="h-4 w-4 text-muted-foreground" />
              <span>All subjects</span>
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  )
}
