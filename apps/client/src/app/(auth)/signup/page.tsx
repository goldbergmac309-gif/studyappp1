"use client"

import Link from "next/link"
import { Suspense, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { SignupForm } from "@/components/auth/SignupForm"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"

export default function SignupPage() {
  const { token } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (token) {
      router.replace("/dashboard")
    }
  }, [token, router])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[hsl(210_40%_96%)]/40">
      <Card className="w-full max-w-md rounded-xl shadow-lift">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>Join Synapse OS. Create your account to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="text-sm text-muted-foreground">Loading...</div>}>
            <SignupForm />
          </Suspense>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
