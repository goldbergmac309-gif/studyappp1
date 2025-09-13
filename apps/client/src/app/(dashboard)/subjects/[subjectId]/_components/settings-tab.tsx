"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { isAxiosError } from "axios"
import { updateSubject, archiveSubject } from "@/lib/api"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"

const schema = z.object({
  name: z.string().min(2, "At least 2 characters").max(100, "Max 100 characters"),
  courseCode: z.string().max(100, "Max 100 characters").optional().or(z.literal("")),
  professorName: z.string().max(100, "Max 100 characters").optional().or(z.literal("")),
  ambition: z.string().max(200, "Keep it concise").optional().or(z.literal("")),
  color: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Use a valid hex color like #4F46E5")
    .optional()
    .or(z.literal("")),
})

type Values = z.infer<typeof schema>

export default function SettingsTab({ subjectId, onSaved }: { subjectId: string; onSaved?: () => void }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [archiving, setArchiving] = useState(false)

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", courseCode: "", professorName: "", ambition: "", color: "" },
    mode: "onChange",
  })

  useEffect(() => {
    async function load() {
      try {
        setError(null)
        const res = await api.get<{ id: string; name: string; courseCode?: string | null; professorName?: string | null; ambition?: string | null; color?: string | null }>(
          `/subjects/${encodeURIComponent(subjectId)}`,
        )
        const s = res.data
        form.reset({
          name: s.name ?? "",
          courseCode: s.courseCode ?? "",
          professorName: s.professorName ?? "",
          ambition: s.ambition ?? "",
          color: s.color ?? "",
        })
      } catch (e: unknown) {
        const msg = isAxiosError(e) ? (e.response?.data as { message?: string })?.message : "Failed to load settings"
        setError(String(msg))
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId])

  async function onSubmit(values: Values) {
    const payload = {
      name: values.name,
      courseCode: values.courseCode || undefined,
      professorName: values.professorName || undefined,
      ambition: values.ambition || undefined,
      color: values.color || undefined,
    }
    try {
      await updateSubject(subjectId, payload)
      toast.success("Saved", { description: "Subject updated" })
      onSaved?.()
    } catch (e: unknown) {
      const msg = isAxiosError(e) ? (e.response?.data as { message?: string })?.message : "Update failed"
      toast.error("Update failed", { description: String(msg) })
    }
  }

  async function onArchive() {
    const ok = typeof window !== "undefined" ? window.confirm("Archive this subject? This can be undone later by backend admin only.") : true
    if (!ok) return
    try {
      setArchiving(true)
      await archiveSubject(subjectId)
      toast.success("Archived", { description: "Subject archived" })
      router.push("/dashboard")
    } catch (e: unknown) {
      const msg = isAxiosError(e) ? (e.response?.data as { message?: string })?.message : "Archive failed"
      toast.error("Archive failed", { description: String(msg) })
    } finally {
      setArchiving(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Subject details</CardTitle>
          <CardDescription>Update name and metadata to improve recommendations.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="ml-2">Could not load</AlertTitle>
              <AlertDescription className="ml-6">{error}</AlertDescription>
            </Alert>
          )}
          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Linear Algebra" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="courseCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. MATH 221" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="professorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Professor Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Dr. Reid" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ambition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ambition</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Ace the final" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color (hex)</FormLabel>
                    <FormControl>
                      <Input placeholder="#4F46E5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={!form.formState.isValid || loading}>
                  Save changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-1 border-red-300">
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>Archive this subject. It will be hidden from normal views.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Archiving sets <code>archivedAt</code> and removes the subject from normal lists. You can restore it later
            via database or future admin tools.
          </p>
        </CardContent>
        <CardFooter className="justify-end">
          <Button variant="destructive" onClick={onArchive} disabled={archiving}>
            {archiving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Archive subject
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
