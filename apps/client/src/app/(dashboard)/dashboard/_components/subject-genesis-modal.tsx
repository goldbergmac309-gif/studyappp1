"use client"

import { useEffect, useState } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createSubject, listPersonas, applyPersona } from "@/lib/api"
import type { PersonaListItem } from "@studyapp/shared-types"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const step1Schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Max 100 characters"),
  courseCode: z.string().max(100, "Max 100 characters").optional(),
  color: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Use a valid hex color like #4F46E5")
    .optional(),
})

const step2Schema = z.object({
  professorName: z.string().max(100, "Max 100 characters").optional(),
  ambition: z.string().max(200, "Keep it concise").optional(),
  personaId: z.string().optional(),
})

type Step1Values = z.infer<typeof step1Schema>
interface Step2Values {
  professorName?: string
  ambition?: string
  personaId?: string
}
type AllValues = Step1Values & Step2Values

export default function SubjectGenesisModal({ onCreated }: { onCreated?: () => Promise<void> | void }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [personas, setPersonas] = useState<PersonaListItem[]>([])
  const [loadingPersonas, setLoadingPersonas] = useState(false)
  const router = useRouter()

  const form1 = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: { name: "", courseCode: "", color: "" },
    mode: "onChange",
  })
  const form2 = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues: { professorName: "", ambition: "", personaId: "" },
    mode: "onChange",
  })

  const resetAll = () => {
    form1.reset({ name: "", courseCode: "", color: "" })
    form2.reset({ professorName: "", ambition: "", personaId: "" })
    setStep(1)
  }

  useEffect(() => {
    if (open && step === 2 && personas.length === 0 && !loadingPersonas) {
      setLoadingPersonas(true)
      listPersonas()
        .then((items: PersonaListItem[]) => setPersonas(items))
        .finally(() => setLoadingPersonas(false))
        .catch(() => {})
    }
  }, [open, step, personas.length, loadingPersonas])

  const handleCreate = async () => {
    const s1 = form1.getValues()
    const s2 = form2.getValues()
    const payload: AllValues = {
      name: s1.name,
      courseCode: s1.courseCode || undefined,
      color: s1.color || undefined,
      professorName: s2.professorName || undefined,
      ambition: s2.ambition || undefined,
    }
    const created = await createSubject(payload)
    // Apply persona if selected
    if (created?.id && s2.personaId) {
      try {
        await applyPersona(created.id, s2.personaId)
      } catch (e) {
        // non-fatal; user can still proceed
      }
    }
    await onCreated?.()
    // Navigate to canvas for immediate aha moment
    if (created?.id) {
      router.push(`/subjects/${encodeURIComponent(created.id)}/canvas`)
    }
    resetAll()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetAll() }}>
      <DialogTrigger asChild>
        <Button>+ Create Subject</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{step === 1 ? "Create Subject" : "Add Context (Optional)"}</DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <Form {...form1}>
            <form className="space-y-4">
              <FormField
                control={form1.control}
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
                control={form1.control}
                name="courseCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Code (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. MATH 221" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form1.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color (optional, hex)</FormLabel>
                    <FormControl>
                      <Input placeholder="#4F46E5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        ) : (
          <Form {...form2}>
            <form className="space-y-4">
              <FormField
                control={form2.control}
                name="professorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Professor Name (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Dr. Reid" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form2.control}
                name="ambition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ambition (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Ace the final" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form2.control}
                name="personaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Persona (optional)</FormLabel>
                    <FormControl>
                      <select
                        className="w-full border rounded-md px-3 py-2 bg-background"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value)}
                      >
                        <option value="">No persona</option>
                        {personas.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="text-xs text-muted-foreground">Step {step} of 2</div>
          <div className="space-x-2">
            {step === 2 && (
              <Button variant="outline" onClick={() => setStep(1)} disabled={form1.formState.isSubmitting || form2.formState.isSubmitting}>
                Back
              </Button>
            )}
            {step === 1 ? (
              <Button onClick={() => form1.handleSubmit(() => setStep(2))()} disabled={!form1.formState.isValid}>
                Continue
              </Button>
            ) : (
              <Button onClick={handleCreate} disabled={form1.formState.isSubmitting || form2.formState.isSubmitting}>
                Create Subject
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
