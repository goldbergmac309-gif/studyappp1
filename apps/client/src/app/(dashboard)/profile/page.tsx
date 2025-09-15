"use client"

import { useAuth } from "@/hooks/use-auth"

export default function ProfilePage() {
  const { user } = useAuth()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Basic account information.</p>
      </div>
      <div className="rounded-lg border p-6 bg-card">
        <div className="text-sm">Email: <span className="font-medium">{user?.email}</span></div>
      </div>
    </div>
  )
}
