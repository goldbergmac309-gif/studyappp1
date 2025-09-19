"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

export interface AuthUser {
  id: string
  email: string
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

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      hydrated: true,
      actions: {
        login: (token, user) => set(() => ({ token, user })),
        logout: () => set(() => ({ token: null, user: null })),
      },
    }),
    {
      name: "studyapp-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token, user: state.user }),
      version: 1,
      onRehydrateStorage: () => (state, error) => {
        // mark hydrated whether success or failure to avoid blocking
        try { /* noop */ } finally { (useAuthStore as any).setState({ hydrated: true }) }
      },
    }
  )
)
