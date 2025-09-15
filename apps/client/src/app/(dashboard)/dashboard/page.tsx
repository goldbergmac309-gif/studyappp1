"use client"

import { useEffect, useMemo, useState } from "react"
import { RotateCw, AlertCircle, Clock, Star, Grid, Archive } from "lucide-react"
import { isAxiosError } from "axios"

import { listSubjects } from "@/lib/api"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import SubjectGenesisModal from "@/app/(dashboard)/dashboard/_components/subject-genesis-modal"
import CreateSubjectForm from "@/app/(dashboard)/dashboard/_components/create-subject-form"
import SubjectCard from "@/app/(dashboard)/dashboard/_components/subject-card"
import QuickActions from "@/app/(dashboard)/dashboard/_components/quick-actions"
import LearningPrompt from "@/app/(dashboard)/dashboard/_components/learning-prompt"
import TopicsExplorer from "@/app/(dashboard)/dashboard/_components/topics-explorer"
import Link from "next/link"

type Subject = { id: string; name: string }
type ApiError = { message?: string }

export default function DashboardPage() {
  const [subjects, setSubjects] = useState<Subject[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<"recent" | "starred" | "all" | "archived">("recent")

  const hasSubjects = useMemo(() => (subjects?.length ?? 0) > 0, [subjects])

  async function fetchSubjects() {
    try {
      setError(null)
      setRefreshing(true)
      const data = await listSubjects(activeTab)
      setSubjects(data)
    } catch (e: unknown) {
      const err = e as ApiError & { message?: string }
      setError(err?.message || (isAxiosError(err) ? (err.response?.data as any)?.message || err.message : 'Failed to load'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchSubjects()
  }, [activeTab])

  return (
    <div className="space-y-8">
      {/* Quick actions */}
      <QuickActions />

      {/* Learning prompt */}
      <LearningPrompt />

      {/* My spaces */}
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-medium text-lg">My spaces</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-md bg-secondary p-0.5">
              <TabButton active={activeTab === "recent"} onClick={() => setActiveTab("recent")} icon={<Clock className="h-3.5 w-3.5" />} label="Recent" />
              <TabButton active={activeTab === "starred"} onClick={() => setActiveTab("starred")} icon={<Star className="h-3.5 w-3.5" />} label="Starred" />
              <TabButton active={activeTab === "all"} onClick={() => setActiveTab("all")} icon={<Grid className="h-3.5 w-3.5" />} label="All" />
              <TabButton active={activeTab === "archived"} onClick={() => setActiveTab("archived")} icon={<Archive className="h-3.5 w-3.5" />} label="Archived" />
            </div>
            <Button variant="ghost" size="sm" className="text-xs h-8 gap-1" onClick={() => setActiveTab('all')}>
              View all
            </Button>
          </div>
        </div>

        {/* Create subject inline form */}
        <div className="mb-4">
          <CreateSubjectForm onCreated={fetchSubjects} />
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : (subjects && subjects.length > 0) ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((s) => (
              <SubjectCard key={s.id} subject={s} onChanged={fetchSubjects} isArchivedView={activeTab === 'archived'} />
            ))}
            {/* Add space tile (not visible in archived tab) */}
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

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="ml-2">Something went wrong</AlertTitle>
          <AlertDescription className="ml-6">{error}</AlertDescription>
        </Alert>
      )}

      {/* Explore topics */}
      <TopicsExplorer />

      <Separator />
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
