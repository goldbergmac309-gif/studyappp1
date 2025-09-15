"use client"

import { useAuth } from "@/hooks/use-auth"

export default function SettingsPage() {
  const { user } = useAuth()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and application preferences.</p>
      </div>
      <div className="rounded-lg border p-6 bg-card">
        <div className="text-sm text-muted-foreground">This is a placeholder page. We can add notification, theme, and account settings here.</div>
        <div className="mt-4 text-sm">Signed in as: <span className="font-medium">{user?.email}</span></div>
      </div>
    </div>
  )
}
