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
