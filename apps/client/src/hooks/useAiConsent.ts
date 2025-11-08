"use client"

import { useAuthStore } from "@/lib/store"
import { useConsentStore } from "@/lib/consent-store"
import { getAiConsentNow } from "@/lib/ai-consent"

export function useAiConsent() {
  const user = useAuthStore((s) => s.user)
  const hasConsented = getAiConsentNow(user || null)
  const requestConsent = useConsentStore((s) => s.actions.request)
  return { hasConsented, requestConsent }
}
