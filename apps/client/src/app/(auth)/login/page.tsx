import Link from "next/link"
import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { LoginForm } from "@/components/auth/LoginForm"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[hsl(210_40%_96%)]/40">
      <Card className="w-full max-w-md rounded-xl shadow-lift">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Welcome back. Enter your credentials to access your workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="text-sm text-muted-foreground">Loading...</div>}>
            <LoginForm />
          </Suspense>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="underline underline-offset-4 hover:text-foreground">
              Create one
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
