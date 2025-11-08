"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import api from "@/lib/api"
import type { LoginResponse } from "@studyapp/shared-types"
import { useAuth } from "@/hooks/use-auth"

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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { isAxiosError } from "axios"

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

type FormValues = z.infer<typeof schema>

export function LoginForm() {
  const router = useRouter()
  const search = useSearchParams()
  const { actions } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
  })

  const onSubmit = async (values: FormValues) => {
    setError(null)
    try {
      const res = await api.post<LoginResponse>("/auth/login", values)
      const { accessToken, user } = res.data
      const resolvedToken = accessToken
      if (!resolvedToken) {
        throw new Error("Login response missing access token")
      }
      actions.login(resolvedToken, {
        id: user.id,
        email: user.email,
        hasConsentedToAi: !!user.hasConsentedToAi,
      })
      toast.success("Welcome back!", { description: user.email })
      const next = search?.get("next")
      router.replace(next && next.startsWith("/") ? next : "/dashboard")
    } catch (e: unknown) {
      const message = isAxiosError(e) ? (e.response?.data as { message?: string })?.message : "Invalid email or password"
      setError(String(message))
      toast.error("Login failed", { description: String(message) })
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Login failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="you@example.com" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Your password"
                      autoComplete="current-password"
                      {...field}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
              </span>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
      </Form>
    </div>
  )
}
