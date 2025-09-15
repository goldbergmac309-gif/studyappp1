"use client"

import Link from "next/link"
import { useState } from "react"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BookText, MoreVertical, PencilLine, Settings as SettingsIcon, Archive, Loader2, Star, Undo2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updateSubject, archiveSubject, unarchiveSubject, setSubjectStarred } from "@/lib/api"
import type { Subject } from "@/lib/types"

export interface SubjectCardProps {
  subject: Subject
  onChanged?: () => Promise<void> | void
  isArchivedView?: boolean
}

export default function SubjectCard({ subject, onChanged, isArchivedView = false }: SubjectCardProps) {
  const [renameOpen, setRenameOpen] = useState(false)
  const [newName, setNewName] = useState(subject.name)
  const [busy, setBusy] = useState(false)

  async function handleRename() {
    try {
      setBusy(true)
      await updateSubject(subject.id, { name: newName })
      await onChanged?.()
      setRenameOpen(false)
    } finally {
      setBusy(false)
    }
  }

  async function handleArchive() {
    const ok = typeof window !== "undefined" ? window.confirm("Archive this subject?") : true
    if (!ok) return
    try {
      setBusy(true)
      await archiveSubject(subject.id)
      await onChanged?.()
    } finally {
      setBusy(false)
    }
  }

  async function handleUnarchive() {
    try {
      setBusy(true)
      await unarchiveSubject(subject.id)
      await onChanged?.()
    } finally {
      setBusy(false)
    }
  }

  async function handleToggleStar() {
    try {
      setBusy(true)
      await setSubjectStarred(subject.id, !subject.starred)
      await onChanged?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="group relative">
      <Link href={`/subjects/${subject.id}`} className="block">
        <Card className="rounded-xl shadow-subtle transition-all hover:shadow-lift hover:border-foreground/30">
          <CardHeader className="flex flex-row items-center gap-3 justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-md border bg-background p-2 text-foreground/80 group-hover:text-foreground">
                <BookText className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="leading-tight">{subject.name}</CardTitle>
                <CardDescription className="flex items-center gap-1">
                  Open workspace
                  {subject.starred ? <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" /> : null}
                </CardDescription>
              </div>
            </div>
            <div onClick={(e) => e.preventDefault()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Subject actions">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleToggleStar}>
                    <Star className="mr-2 h-4 w-4" /> {subject.starred ? "Unstar" : "Star"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRenameOpen(true)}>
                    <PencilLine className="mr-2 h-4 w-4" /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/subjects/${subject.id}?tab=settings`}>
                      <SettingsIcon className="mr-2 h-4 w-4" /> Settings
                    </Link>
                  </DropdownMenuItem>
                  {isArchivedView ? (
                    <DropdownMenuItem onClick={handleUnarchive}>
                      <Undo2 className="mr-2 h-4 w-4" /> Unarchive
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={handleArchive} className="text-red-600 focus:text-red-600">
                      <Archive className="mr-2 h-4 w-4" /> Archive
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
        </Card>
      </Link>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename subject</DialogTitle>
          </DialogHeader>
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New name" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={busy || !newName.trim()}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
