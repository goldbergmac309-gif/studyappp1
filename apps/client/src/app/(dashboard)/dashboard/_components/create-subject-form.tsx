"use client"

import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Plus } from "lucide-react"

const createSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(64, "Name must be at most 64 characters"),
})

type CreateValues = z.infer<typeof createSchema>

export default function CreateSubjectForm({ onCreated }: { onCreated?: () => Promise<void> | void }) {
  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "" },
  })

  const onSubmit = async (values: CreateValues) => {
    await api.post("/subjects", values)
    form.reset({ name: "" })
    await onCreated?.()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3 sm:flex-row">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel className="sr-only">Subject name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Linear Algebra" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          <Plus className="mr-2 h-4 w-4" />
          {form.formState.isSubmitting ? "Creating..." : "+ Create"}
        </Button>
      </form>
    </Form>
  )
}
