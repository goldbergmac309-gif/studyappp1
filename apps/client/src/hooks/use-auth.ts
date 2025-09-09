"use client"

import { useAuthStore } from "@/lib/store"

export function useAuth() {
  // Use separate selectors to avoid returning a new object from a single selector.
  // This prevents unnecessary re-renders and avoids React's
  // "getServerSnapshot should be cached" warning in RSC environments.
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const actions = useAuthStore((s) => s.actions)
  return { token, user, actions }
}
