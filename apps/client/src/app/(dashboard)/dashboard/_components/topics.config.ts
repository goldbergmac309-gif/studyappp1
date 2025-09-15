export type Topic = {
  id: string
  title: string
  imageSrc?: string
}

export const TOPICS: Topic[] = [
  { id: 'cog-psych', title: 'Cognitive Psychology: An Introduction' },
  { id: 'nn-fundamentals', title: 'Neural Networks Fundamentals' },
  { id: 'adv-stats', title: 'Advanced Statistics' },
  { id: 'cell-bio', title: 'Cell Biology' },
]
