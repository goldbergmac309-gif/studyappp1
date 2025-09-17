"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { RotateCw, AlertCircle, Clock, Star, Grid, Archive } from "lucide-react"
import { isAxiosError } from "axios"

import { listSubjects } from "@/lib/api"
import type { Subject as ClientSubject } from "@/lib/types"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import SubjectGenesisModal from "@/app/(dashboard)/dashboard/_components/subject-genesis-modal"
import SubjectCard from "@/app/(dashboard)/dashboard/_components/subject-card"

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<ClientSubject[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<"recent" | "starred" | "all" | "archived">("all")

  const hasSubjects = useMemo(() => (subjects?.length ?? 0) > 0, [subjects])

  const fetchSubjects = useCallback(async () => {
    try {
      setError(null)
      setRefreshing(true)
      const data = await listSubjects(activeTab)
      setSubjects(data)
    } catch (e: unknown) {
      if (isAxiosError(e)) {
        const data = e.response?.data as unknown
        const msg = typeof data === 'object' && data && typeof (data as Record<string, unknown>).message === 'string'
          ? String((data as Record<string, unknown>).message)
          : e.message
        setError(msg)
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [activeTab])

  useEffect(() => { void fetchSubjects() }, [fetchSubjects])

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">All subjects</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md bg-secondary p-0.5">
            <TabButton active={activeTab === "recent"} onClick={() => setActiveTab("recent")} icon={<Clock className="h-3.5 w-3.5" />} label="Recent" />
            <TabButton active={activeTab === "starred"} onClick={() => setActiveTab("starred")} icon={<Star className="h-3.5 w-3.5" />} label="Starred" />
            <TabButton active={activeTab === "all"} onClick={() => setActiveTab("all")} icon={<Grid className="h-3.5 w-3.5" />} label="All" />
            <TabButton active={activeTab === "archived"} onClick={() => setActiveTab("archived")} icon={<Archive className="h-3.5 w-3.5" />} label="Archived" />
          </div>
          <Button variant="ghost" size="sm" className="text-xs h-8 gap-1" onClick={fetchSubjects} disabled={refreshing}>
            <RotateCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="ml-2">Something went wrong</AlertTitle>
          <AlertDescription className="ml-6">{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : hasSubjects ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(subjects ?? []).map((s) => (
            <SubjectCard key={s.id} subject={s} onChanged={fetchSubjects} isArchivedView={activeTab === 'archived'} />
          ))}
          {activeTab !== 'archived' && (
            <SubjectGenesisModal
              onCreated={fetchSubjects}
              trigger={
                <div className="border border-dashed border-border rounded-lg p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-gray-900/30 hover:text-gray-900 transition-colors cursor-pointer h-[88px] shadow-subtle hover:shadow-lift">
                  <span className="text-sm">+ Add space</span>
                </div>
              }
            />
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No subjects yet — create one to get started.
        </div>
      )}
    </div>
  )
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`${active ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"} flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
