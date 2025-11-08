// Shared client-side types
// Use canonical contracts from @studyapp/shared-types to avoid drift
export type { DocumentDto as Document, DocumentStatus, ResourceType } from '@studyapp/shared-types'

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
