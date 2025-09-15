import Link from "next/link"
import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { SignupForm } from "@/components/auth/SignupForm"

export default function SignupPage() {
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
