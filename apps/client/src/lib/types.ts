// Shared client-side types mirrored from backend contracts
// These types enforce compile-time safety across API usage, components, and state.

export type DocumentStatus =
  | 'UPLOADED'
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'

export interface Document {
  id: string
  filename: string
  status: DocumentStatus
  createdAt: string // ISO timestamp string
}

export interface AnalysisKeyword {
  term: string
  score: number
}

export interface AnalysisMetrics {
  pages: number
  textLength: number
}

export interface AnalysisResult {
  id: string
  engineVersion: string
  resultPayload: {
    keywords: AnalysisKeyword[]
    metrics: AnalysisMetrics
  }
}

// Epoch II: Subject metadata model (mirrors backend Prisma model shape)
export interface Subject {
  id: string
  name: string
  courseCode?: string | null
  professorName?: string | null
  ambition?: string | null
  color?: string | null
  starred?: boolean | null
  archivedAt?: string | null
  createdAt?: string
  updatedAt?: string
  lastAccessedAt?: string | null
}

// Payloads
export type CreateSubjectPayload = {
  name: string
  courseCode?: string
  professorName?: string
  ambition?: string
  color?: string
}

export type UpdateSubjectPayload = Partial<CreateSubjectPayload> & {
  starred?: boolean
}
