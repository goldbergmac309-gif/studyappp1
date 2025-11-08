// Canonical shared types across client and server
// SubjectInsights: bulk analysis payload keyed by documentId

export type AnalysisKeyword = {
  term: string
  score: number
}

export type AnalysisMetrics = {
  pages: number
  textLength: number
}

export type SubjectInsights = Record<
  string,
  {
    id: string
    engineVersion: string
    resultPayload: {
      keywords: AnalysisKeyword[]
      metrics: AnalysisMetrics
    }
  }
>

// Canonical document contracts (Resources)
export type DocumentStatus =
  | 'UPLOADED'
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'

export type ResourceType =
  | 'EXAM'
  | 'SYLLABUS'
  | 'LECTURE_NOTES'
  | 'TEXTBOOK'
  | 'PRACTICE_SET'
  | 'NOTES'
  | 'OTHER'

export interface DocumentDto {
  id: string
  filename: string
  status: DocumentStatus
  createdAt: string
  resourceType?: ResourceType
  meta?: any
}

// Analysis contract for a single document (used by polling and insights views)
export interface AnalysisResult {
  id: string
  engineVersion: string
  resultPayload: {
    keywords: AnalysisKeyword[]
    metrics: AnalysisMetrics
  }
}

// Exams (Prophetic Exam Generator)
export type ExamStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED'
export interface ExamPaper {
  id: string
  subjectId: string
  status: ExamStatus
  params?: Record<string, unknown>
  result?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

// Epoch III: Workspace shared types

export interface WidgetPosition {
  x: number
  y: number
}

export interface WidgetSize {
  width: number
  height: number
}

// Flexible content container; concrete shape depends on widget type
export type WidgetContent = any

export type WidgetType =
  | 'NOTES'
  | 'MIND_MAP'
  | 'FLASHCARDS'
  | 'STICKY_NOTE'
  | 'TASKS'
  | 'COUNTDOWN'
  | 'POMODORO'
  | 'CALENDAR_MONTH'
  | 'MUSIC_PLAYER'
  | 'LINK_TILE'
  | 'PROGRESS'

export interface WidgetInstanceDto {
  id: string
  type: WidgetType
  position: WidgetPosition
  size: WidgetSize
  content: WidgetContent
  style?: WidgetStyle
}

export interface UpdateWorkspaceLayoutDto {
  widgets: Array<Pick<WidgetInstanceDto, 'id' | 'position' | 'size'>>
}

export interface PersonaListItem {
  id: string
  name: string
}

// New: Widget styling and creation/update contracts
export interface WidgetStyle {
  accent?: string
  bg?: string
  elevation?: number
  radius?: number
  opacity?: number
}

export interface CreateWidgetInstanceDto {
  type: WidgetType
  position: WidgetPosition
  size: WidgetSize
  content?: WidgetContent
  style?: WidgetStyle
}

export interface UpdateWidgetInstanceDto {
  position?: WidgetPosition
  size?: WidgetSize
  content?: WidgetContent
  style?: WidgetStyle
}

export interface BoardConfigDto {
  background?: { type: 'color' | 'gradient' | 'image'; value: string }
  grid?: { margin?: number; rowHeight?: number; snap?: boolean }
}

// Epoch II/V2: Semantic Search contracts (v2 envelope)
export interface SubjectSearchResult {
  id?: string // optional for now if chunk id not exposed
  documentId: string
  documentFilename: string
  chunkIndex: number
  snippet: string
  score: number // normalized [0..1]
  createdAt?: string
  updatedAt?: string
}

export interface SubjectSearchResponse {
  results: SubjectSearchResult[]
  nextCursor: string | null
  tookMs: number
}

// Legacy (kept for backward compatibility in older code paths)
export interface SemanticSearchHit {
  documentId: string
  documentFilename: string
  chunkIndex: number
  snippet: string
  score: number
}

export type SemanticSearchResponse = SemanticSearchHit[]

// Epoch II/V2: Conceptual Topics (Topic Heat Map V2)
export interface TopicTerm {
  term: string
  score: number
}

export interface SubjectTopic {
  label: string
  weight: number
  terms: TopicTerm[]
  documentIds?: string[]
}

export interface SubjectTopicsEnvelope {
  topics: SubjectTopic[]
  computedAt: string
  version: string
}

export type SubjectTopicsResponse = SubjectTopicsEnvelope

// Epoch I, Sprint 2: Notes contracts
export interface NoteDto {
  id: string
  subjectId: string
  title: string
  content: any
  createdAt: string
  updatedAt: string
}

// Notes graph contracts (Second Brain)
export interface NoteGraphNode {
  id: string
  subjectId: string
  title: string
}

export interface NoteGraphEdge {
  from: string
  to: string
}

export interface NoteGraphResponse {
  nodes: NoteGraphNode[]
  edges: NoteGraphEdge[]
}

// Backlinks response contract
export type NoteBacklink = Pick<NoteDto, 'id' | 'subjectId' | 'title' | 'updatedAt'>
export interface NoteBacklinksResponse {
  backlinks: NoteBacklink[]
}

// Global Aggregated Search contracts (Notes + Documents)
export interface GlobalSearchNoteHit {
  id: string
  subjectId: string
  title: string
  updatedAt: string
}

export interface GlobalSearchDocumentHit {
  id: string
  subjectId: string
  filename: string
  createdAt: string
}

export interface GlobalSearchResponse {
  notes: GlobalSearchNoteHit[]
  documents: GlobalSearchDocumentHit[]
}

// Auth contracts (used across client and server)
export interface LoginResponse {
  accessToken: string
  user: {
    id: string
    email: string
    hasConsentedToAi: boolean
  }
}
