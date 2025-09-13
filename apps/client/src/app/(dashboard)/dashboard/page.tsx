"use client"

import { useEffect, useMemo, useState } from "react"
import { RotateCw, AlertCircle } from "lucide-react"
import { isAxiosError } from "axios"

import api from "@/lib/api"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import SubjectGenesisModal from "@/app/(dashboard)/dashboard/_components/subject-genesis-modal"
import SubjectCard from "@/app/(dashboard)/dashboard/_components/subject-card"

type Subject = { id: string; name: string }
type ApiError = { message?: string }

export default function DashboardPage() {
  const [subjects, setSubjects] = useState<Subject[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const hasSubjects = useMemo(() => (subjects?.length ?? 0) > 0, [subjects])

  async function fetchSubjects() {
    try {
      setError(null)
      setRefreshing(true)
      const res = await api.get<Subject[]>("/subjects")
      setSubjects(res.data)
    } catch (e: unknown) {
      const message = isAxiosError(e) ? (e.response?.data as ApiError)?.message : "Failed to load subjects"
      setError(String(message))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    // initial load
    fetchSubjects()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your Subjects</h1>
          <p className="text-muted-foreground text-sm">Create and manage the subjects you study.</p>
        </div>
        <Button variant="outline" onClick={fetchSubjects} disabled={refreshing}>
          <RotateCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create a new subject</CardTitle>
          <CardDescription>Add a subject with rich metadata to power your insights.</CardDescription>
        </CardHeader>
        <CardContent>
          <SubjectGenesisModal onCreated={fetchSubjects} />
        </CardContent>
      </Card>

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
          {subjects!.map((s) => (
            <SubjectCard key={s.id} subject={s} onChanged={fetchSubjects} />
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No subjects yet</CardTitle>
            <CardDescription>
              Create your first subject above to start organizing notes, documents, and insights.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Separator />
    </div>
  )
}
