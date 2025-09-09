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
  actions: {
    login: (token: string, user: AuthUser) => void
    logout: () => void
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
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
    }
  )
)
