"use client"

import axios, { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from "axios"
import { useAuthStore } from "@/lib/store"
import type {
  Document as ClientDocument,
  AnalysisResult,
  Subject,
  CreateSubjectPayload,
  UpdateSubjectPayload,
} from "@/lib/types"
import type {
  SubjectInsights,
  WidgetInstanceDto,
  UpdateWorkspaceLayoutDto,
  CreateWidgetInstanceDto,
  UpdateWidgetInstanceDto,
  BoardConfigDto,
} from "@studyapp/shared-types"

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

// Widget CRUD (Epoch IV)
export async function addWidget(
  subjectId: string,
  payload: CreateWidgetInstanceDto,
  options: { signal?: AbortSignal } = {}
): Promise<WidgetInstanceDto> {
  try {
    const res = await api.post<WidgetInstanceDto>(
      `/subjects/${encodeURIComponent(subjectId)}/widgets`,
      payload,
      { signal: options.signal },
    )
    return res.data
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if ((err as AxiosError).code === "ERR_CANCELED") throw err
      throw new Error(extractErrorMessage(err))
    }
    throw err
  }
}

export async function updateWidget(
  subjectId: string,
  widgetId: string,
  payload: UpdateWidgetInstanceDto,
  options: { signal?: AbortSignal } = {}
): Promise<WidgetInstanceDto> {
  try {
    const res = await api.patch<WidgetInstanceDto>(
      `/subjects/${encodeURIComponent(subjectId)}/widgets/${encodeURIComponent(widgetId)}`,
      payload,
      { signal: options.signal },
    )
    return res.data
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if ((err as AxiosError).code === "ERR_CANCELED") throw err
      throw new Error(extractErrorMessage(err))
    }
    throw err
  }
}

export async function deleteWidget(
  subjectId: string,
  widgetId: string,
  options: { signal?: AbortSignal } = {}
): Promise<{ id: string; deleted: true }> {
  try {
    const res = await api.delete<{ id: string; deleted: true }>(
      `/subjects/${encodeURIComponent(subjectId)}/widgets/${encodeURIComponent(widgetId)}`,
      { signal: options.signal },
    )
    return res.data
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if ((err as AxiosError).code === "ERR_CANCELED") throw err
      throw new Error(extractErrorMessage(err))
    }
    throw err
  }
}

export async function getBoardConfig(
  subjectId: string,
  options: { signal?: AbortSignal } = {}
): Promise<BoardConfigDto> {
  try {
    const res = await api.get<BoardConfigDto>(
      `/subjects/${encodeURIComponent(subjectId)}/board-config`,
      { signal: options.signal },
    )
    return res.data || {}
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if ((err as AxiosError).code === "ERR_CANCELED") throw err
      throw new Error(extractErrorMessage(err))
    }
    throw err
  }
}

export async function patchBoardConfig(
  subjectId: string,
  payload: BoardConfigDto,
  options: { signal?: AbortSignal } = {}
): Promise<BoardConfigDto> {
  try {
    const res = await api.patch<BoardConfigDto>(
      `/subjects/${encodeURIComponent(subjectId)}/board-config`,
      payload,
      { signal: options.signal },
    )
    return res.data || {}
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if ((err as AxiosError).code === "ERR_CANCELED") throw err
      throw new Error(extractErrorMessage(err))
    }
    throw err
  }
}
// Workspace API (Epoch III)

export async function getSubjectWorkspace(
  subjectId: string,
  options: { signal?: AbortSignal } = {}
): Promise<WidgetInstanceDto[]> {
  try {
    const res = await api.get<WidgetInstanceDto[]>(
      `/subjects/${encodeURIComponent(subjectId)}/workspace`,
      { signal: options.signal },
    )
    return Array.isArray(res.data) ? res.data : []
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 404) return []
      if ((err as AxiosError).code === "ERR_CANCELED") throw err
      throw new Error(extractErrorMessage(err))
    }
    throw err
  }
}

export async function patchWorkspaceLayout(
  subjectId: string,
  payload: UpdateWorkspaceLayoutDto,
  options: { signal?: AbortSignal } = {}
): Promise<WidgetInstanceDto[]> {
  try {
    const res = await api.patch<WidgetInstanceDto[]>(
      `/subjects/${encodeURIComponent(subjectId)}/workspace/layout`,
      payload,
      { signal: options.signal },
    )
    return Array.isArray(res.data) ? res.data : []
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if ((err as AxiosError).code === "ERR_CANCELED") throw err
      throw new Error(extractErrorMessage(err))
    }
    throw err
  }
}

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

// Subjects API (Epoch II)

export async function listSubjects(
  filter: 'recent' | 'all' | 'starred' | 'archived' = 'recent',
  options: { signal?: AbortSignal } = {},
): Promise<Subject[]> {
  try {
    const res = await api.get<Subject[]>(`/subjects`, { params: { filter }, signal: options.signal })
    return Array.isArray(res.data) ? res.data : []
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if ((err as AxiosError).code === "ERR_CANCELED") throw err
      throw new Error(extractErrorMessage(err))
    }
    throw err
  }
}

export async function createSubject(payload: CreateSubjectPayload): Promise<Subject> {
  // Backend currently accepts only { name } on create, so we follow with a PATCH for metadata.
  const { name, ...rest } = payload
  const createRes = await api.post<Subject>(`/subjects`, { name })
  const created = createRes.data
  const hasExtras = Object.keys(rest).length > 0
  if (created?.id && hasExtras) {
    try {
      const patchRes = await api.patch<Subject>(`/subjects/${encodeURIComponent(created.id)}`, rest as UpdateSubjectPayload)
      return patchRes.data
    } catch {
      // If patch fails, still return created subject so UI can continue
    }
  }
  return created
}

export async function updateSubject(
  subjectId: string,
  payload: UpdateSubjectPayload,
): Promise<Subject> {
  try {
    const res = await api.patch<Subject>(`/subjects/${encodeURIComponent(subjectId)}`, payload)
    return res.data
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if ((err as AxiosError).code === "ERR_CANCELED") throw err
      throw new Error(extractErrorMessage(err))
    }
    throw err
  }
}

export async function archiveSubject(subjectId: string): Promise<void> {
  try {
    await api.delete(`/subjects/${encodeURIComponent(subjectId)}`)
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if ((err as AxiosError).code === "ERR_CANCELED") throw err
      throw new Error(extractErrorMessage(err))
    }
    throw err
  }
}

export async function unarchiveSubject(subjectId: string): Promise<void> {
  try {
    await api.post(`/subjects/${encodeURIComponent(subjectId)}/unarchive`)
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if ((err as AxiosError).code === "ERR_CANCELED") throw err
      throw new Error(extractErrorMessage(err))
    }
    throw err
  }
}

export async function setSubjectStarred(subjectId: string, starred: boolean): Promise<Subject> {
  try {
    const res = await api.patch<Subject>(`/subjects/${encodeURIComponent(subjectId)}`, { starred })
    return res.data
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if ((err as AxiosError).code === "ERR_CANCELED") throw err
      throw new Error(extractErrorMessage(err))
    }
    throw err
  }
}

// API: POST /subjects/:subjectId/documents/:id/reprocess
// Returns { id, status: 'QUEUED' } on success
export async function reprocessDocument(
  subjectId: string,
  documentId: string,
): Promise<{ id: string; status: 'QUEUED' }>
{
  try {
    const res = await api.post<{ id: string; status: 'QUEUED' }>(
      `/subjects/${encodeURIComponent(subjectId)}/documents/${encodeURIComponent(documentId)}/reprocess`,
    )
    return res.data
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if ((err as AxiosError).code === "ERR_CANCELED") throw err
      throw new Error(extractErrorMessage(err))
    }
    throw err
  }
}
