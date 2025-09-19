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

// Epoch II/V2: Semantic Search contracts
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

export type SubjectTopicsResponse = SubjectTopic[]

// Epoch I, Sprint 2: Notes contracts
export interface NoteDto {
  id: string
  subjectId: string
  title: string
  content: any
  createdAt: string
  updatedAt: string
}
