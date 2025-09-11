"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import api from "@/lib/api"
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

const schema = z
  .object({
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type FormValues = z.infer<typeof schema>

export function SignupForm() {
  const router = useRouter()
  const search = useSearchParams()
  const { actions } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
    mode: "onSubmit",
  })

  const onSubmit = async (values: FormValues) => {
    setError(null)
    try {
      const { email, password } = values
      const res = await api.post("/auth/signup", { email, password })
      const { accessToken, token, user } = res.data as {
        accessToken?: string
        token?: string
        user: { id: string; email: string }
      }
      const resolvedToken = accessToken ?? token
      if (!resolvedToken) {
        throw new Error("Signup response missing access token")
      }
      actions.login(resolvedToken, user)
      toast.success("Account created", { description: user.email })
      const next = search?.get("next")
      router.replace(next && next.startsWith("/") ? next : "/dashboard")
    } catch (e: unknown) {
      let message = "Signup failed"
      if (isAxiosError(e)) {
        const data: unknown = e.response?.data
        if (typeof data === "string" && data.trim().length > 0) {
          message = data
        } else if (data && typeof data === "object" && "message" in data && typeof (data as { message: unknown }).message === "string") {
          message = String((data as { message: string }).message)
        } else if (e.message) {
          message = e.message
        } else {
          message = "Network error"
        }
      } else if (e instanceof Error) {
        message = e.message
      }
      setError(message)
      toast.error("Signup failed", { description: message })
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Signup failed</AlertTitle>
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
                  <Input type="email" placeholder="you@example.com" {...field} />
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
                      autoComplete="new-password"
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
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showConfirm ? "text" : "password"}
                      placeholder="Confirm password"
                      autoComplete="new-password"
                      {...field}
                    />
                    <button
                      type="button"
                      aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                      className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
                      onClick={() => setShowConfirm((v) => !v)}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                <Loader2 className="h-4 w-4 animate-spin" /> Creating account...
              </span>
            ) : (
              "Create account"
            )}
          </Button>
        </form>
      </Form>
    </div>
  )
}
