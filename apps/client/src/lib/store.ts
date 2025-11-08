"use client"

import { create } from "zustand"

export interface AuthUser {
  id: string
  email: string
  hasConsentedToAi: boolean
}

export interface AuthState {
  token: string | null
  user: AuthUser | null
  hydrated: boolean
  actions: {
    login: (token: string, user: AuthUser) => void
    logout: () => void
  }
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  token: null,
  user: null,
  hydrated: true,
  actions: {
    login: (token, user) => set(() => ({ token, user })),
    logout: () => set(() => ({ token: null, user: null })),
  },
}))
