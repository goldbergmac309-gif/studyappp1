"use client"

import axios, { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from "axios"
import { useAuthStore } from "@/lib/store"

// Create a singleton Axios instance configured for the client app.
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
})

// Attach Authorization header from the Zustand store for all requests
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token
  if (!token) return config
  const headers = AxiosHeaders.from(config.headers)
  headers.set("Authorization", `Bearer ${token}`)
  config.headers = headers
  return config
})

// On 401 responses, automatically clear the user's session
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error?.response?.status
    if (status === 401) {
      // Best-effort logout; ignore errors
      try { useAuthStore.getState().actions.logout() } catch {}
    }
    return Promise.reject(error)
  }
)

export default api
