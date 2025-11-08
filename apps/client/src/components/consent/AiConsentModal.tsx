"use client"

import { useEffect, useState } from "react"
import { useConsentStore } from "@/lib/consent-store"
import { useAuthStore } from "@/lib/store"
import api from "@/lib/api"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export function AiConsentModal() {
  const open = useConsentStore((s) => s.open)
  const isConsenting = useConsentStore((s) => s.isConsenting)
  const { dismiss, request, setConsenting, setCooldown } = useConsentStore((s) => s.actions)
  const actions = useAuthStore((s) => s.actions)
  const user = useAuthStore((s) => s.user)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Safety: if user is already consented but modal is open (race), close it.
  useEffect(() => {
    if (open && user?.hasConsentedToAi) {
      dismiss()
    }
  }, [open, user?.hasConsentedToAi, dismiss])

  const onAgree = async () => {
    setError(null)
    setLoading(true)
    // Begin authoritative consent flow: do not set blocker until after click processing
    const t0 = Date.now()
    // Schedule blocker turn-on after current click resolves to avoid intercepting the click
    setTimeout(() => { try { setConsenting(true) } catch {} }, 0)
    try {
      // Hit consent endpoint
      const res = await api.post<{ id: string; email: string; hasConsentedToAi: boolean }>("/users/@me/consent-ai")
      const updated = res.data
      // Update user state in store
      let tokenNow = useAuthStore.getState().token as string | null
      if (!tokenNow && process.env.NODE_ENV !== 'production') {
        try {
          const raw = localStorage.getItem('studyapp-auth')
          if (raw) {
            const obj = JSON.parse(raw)
            tokenNow = (obj?.state && (obj.state as { token?: string }).token) || obj?.token || null
          }
        } catch {}
      }
      if (!tokenNow) {
        // As a last resort, keep token as empty string to avoid undefined writes
        tokenNow = ''
      }
      // Force immediate persistence BEFORE store login to guarantee persisted state is present even if
      // other app effects run on login; then perform store login with the same user.
      if (process.env.NODE_ENV !== 'production') {
        try {
          const key = 'studyapp-auth'
          const desired = {
            state: {
              token: tokenNow,
              user: { id: updated.id, email: updated.email, hasConsentedToAi: true },
            },
            version: 1,
          }
          // First attempt to write desired state
          localStorage.setItem(key, JSON.stringify(desired))
          // Verify synchronously
          try {
            const raw = localStorage.getItem(key)
            const obj = raw ? JSON.parse(raw) : null
            const st = obj?.state || obj
            const ok = !!(st?.user?.hasConsentedToAi === true)
            if (!ok) {
              // Correct the state if verification failed
              localStorage.setItem(key, JSON.stringify(desired))
            }
          } catch {
            // If parse failed, rewrite desired payload
            localStorage.setItem(key, JSON.stringify(desired))
          }
          // Yield once to allow any persist middleware to flush synchronously-written state
          await Promise.resolve()
        } catch {}
      }
      // Use server-returned identity authoritatively to ensure persistence regardless of prior user state
      actions.login(tokenNow, { id: updated.id, email: updated.email, hasConsentedToAi: !!updated.hasConsentedToAi })
      // Close modal after success
      dismiss()
      // Suppress any late-arriving 403-triggered consent requests for a brief window (15s)
      setCooldown(15000)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to record consent")
      // Keep modal open and allow user to retry; do NOT re-trigger request() which would re-enable blocker
    } finally {
      setLoading(false)
      const elapsed = Date.now() - t0
      if (elapsed < 200) {
        try { await new Promise((r) => setTimeout(r, 200 - elapsed)) } catch {}
      }
      setConsenting(false)
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-lg">
        {isConsenting && (
          <div
            data-testid="consent-blocker"
            aria-hidden="true"
            className="fixed inset-0 z-40 bg-black/30 pointer-events-auto"
            onClick={(e) => e.preventDefault()}
            onMouseDown={(e) => e.preventDefault()}
            onMouseUp={(e) => e.preventDefault()}
            onWheel={(e) => e.preventDefault()}
          />
        )}
        <DialogHeader>
          <DialogTitle>AI Features Consent</DialogTitle>
          <DialogDescription>
            To use AI-powered features, we need your explicit consent to process certain text you provide. We send only the minimum necessary text to our AI partner, OpenAI, strictly to power features like search and tutoring. No account details are shared. You can learn more in our Privacy Policy.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>
            • We apply automatic PII redaction for common identifiers (e.g., emails, phone numbers) before any data leaves our system.
          </p>
          <p>
            • You can withdraw consent at any time in future account settings (coming soon).
          </p>
          {error && <p className="text-red-600">{error}</p>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onAgree} disabled={loading}>
            {loading ? "Saving…" : "I Understand and Agree"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
