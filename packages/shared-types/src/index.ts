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

export type WidgetType = 'NOTES' | 'MIND_MAP' | 'FLASHCARDS'

export interface WidgetInstanceDto {
  id: string
  type: WidgetType
  position: WidgetPosition
  size: WidgetSize
  content: WidgetContent
}

export interface UpdateWorkspaceLayoutDto {
  widgets: Array<Pick<WidgetInstanceDto, 'id' | 'position' | 'size'>>
}

export interface PersonaListItem {
  id: string
  name: string
}
