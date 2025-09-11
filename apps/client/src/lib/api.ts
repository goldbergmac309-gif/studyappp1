"use client"

import axios, { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from "axios"
import { useAuthStore } from "@/lib/store"
import type { Document as ClientDocument, AnalysisResult } from "@/lib/types"
import type { SubjectInsights } from "@studyapp/shared-types"

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

// API: GET /subjects/:subjectId/insights (bulk analysis for a subject)
// Returns {} on 404; throws on other failures. This is used by the unified polling final step.
export async function listSubjectInsights(
  subjectId: string,
  options: { signal?: AbortSignal } = {}
): Promise<SubjectInsights> {
  try {
    const res = await api.get<SubjectInsights>(
      `/subjects/${encodeURIComponent(subjectId)}/insights`,
      { signal: options.signal }
    )
    const data = res.data && typeof res.data === "object" ? res.data : {}
    return data
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 404) {
        return {}
      }
      if ((err as AxiosError).code === "ERR_CANCELED") {
        throw err
      }
      throw new Error(extractErrorMessage(err))
    }
    throw err
  }
}

// Helper: extract a predictable error message from AxiosError
function extractErrorMessage(error: AxiosError): string {
  const data: unknown = error.response?.data
  if (typeof data === "string" && data.trim().length > 0) return data
  if (data && typeof data === "object") {
    const maybeMsg = (data as Record<string, unknown>)["message"]
    if (typeof maybeMsg === "string" && maybeMsg.trim().length > 0) return maybeMsg
    const maybeError = (data as Record<string, unknown>)["error"]
    if (typeof maybeError === "string" && maybeError.trim().length > 0) return maybeError
  }
  return error.message || "Request failed"
}

// API: GET /subjects/:subjectId/documents
// Returns [] on 200 empty or 404; throws for other non-2xx with a user-friendly message
export async function listSubjectDocuments(
  subjectId: string,
  options: { signal?: AbortSignal } = {}
): Promise<ClientDocument[]> {
  try {
    const res = await api.get<ClientDocument[]>(
      `/subjects/${encodeURIComponent(subjectId)}/documents`,
      { signal: options.signal }
    )

    const docs = Array.isArray(res.data) ? res.data : []
    // Normalize timestamps and sort desc by createdAt (defensive, even if API is sorted)
    const normalized = docs.map((d) => ({
      ...d,
      createdAt: new Date(d.createdAt).toISOString(),
    }))
    normalized.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    return normalized
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 404) {
        return []
      }
      // Allow callers to handle cancellations distinctly if desired
      if ((err as AxiosError).code === "ERR_CANCELED") {
        throw err
      }
      throw new Error(extractErrorMessage(err))
    }
    throw err
  }
}

// API: GET /documents/:id/analysis
// 200 -> AnalysisResult; 404 -> null (not ready); otherwise throw
export async function getDocumentAnalysis(
  documentId: string,
  options: { signal?: AbortSignal } = {}
): Promise<AnalysisResult | null> {
  try {
    const res = await api.get<AnalysisResult>(
      `/documents/${encodeURIComponent(documentId)}/analysis`,
      { signal: options.signal }
    )
    return res.data
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 404) {
        return null
      }
      if ((err as AxiosError).code === "ERR_CANCELED") {
        throw err
      }
      throw new Error(extractErrorMessage(err))
    }
    throw err
  }
}

export default api
