import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Canonical Persona.widgets JSON schema
// widgets: Array<{
//   type: 'NOTES' | 'MIND_MAP' | 'FLASHCARDS'
//   position: { x: number; y: number }
//   size: { width: number; height: number }
//   content: any
// }>

const personas: Array<{ name: string; widgets: any }> = [
  {
    name: 'STEM Lab',
    widgets: [
      {
        type: 'NOTES',
        position: { x: 0, y: 0 },
        size: { width: 6, height: 6 },
        content: {
          text: 'Quick notes for problem-solving, formulas, and reminders.'
        }
      },
      {
        type: 'MIND_MAP',
        position: { x: 6, y: 0 },
        size: { width: 6, height: 8 },
        content: {
          nodes: [
            { id: 'root', label: 'Core Concept', x: 0, y: 0 },
            { id: 'n1', label: 'Definition', x: -50, y: -40 },
            { id: 'n2', label: 'Example', x: 50, y: -40 }
          ],
          edges: [
            { id: 'e1', from: 'root', to: 'n1' },
            { id: 'e2', from: 'root', to: 'n2' }
          ]
        }
      },
      {
        type: 'FLASHCARDS',
        position: { x: 0, y: 6 },
        size: { width: 6, height: 6 },
        content: {
          cards: [
            { front: 'Ohm\'s Law', back: 'V = I × R' },
            { front: 'Kinetic Energy', back: 'KE = 1/2 m v^2' }
          ]
        }
      }
    ]
  },
  {
    name: 'Humanities Hub',
    widgets: [
      {
        type: 'NOTES',
        position: { x: 0, y: 0 },
        size: { width: 8, height: 7 },
        content: {
          text: 'Close reading notes, citations, and themes.'
        }
      },
      {
        type: 'FLASHCARDS',
        position: { x: 8, y: 0 },
        size: { width: 4, height: 7 },
        content: {
          cards: [
            { front: 'Aristotle\'s Poetics', back: 'Tragedy: catharsis through pity and fear' },
            { front: 'Postmodernism', back: 'Skepticism toward grand narratives' }
          ]
        }
      }
    ]
  },
  {
    name: 'Exam Crunch',
    widgets: [
      {
        type: 'FLASHCARDS',
        position: { x: 0, y: 0 },
        size: { width: 6, height: 7 },
        content: {
          cards: [
            { front: 'Definition A', back: 'Meaning A' },
            { front: 'Definition B', back: 'Meaning B' }
          ]
        }
      },
      {
        type: 'NOTES',
        position: { x: 6, y: 0 },
        size: { width: 6, height: 7 },
        content: {
          text: 'High-yield points and last-minute reminders.'
        }
      }
    ]
  },
  {
    name: 'Research Garden',
    widgets: [
      {
        type: 'MIND_MAP',
        position: { x: 0, y: 0 },
        size: { width: 7, height: 8 },
        content: {
          nodes: [
            { id: 'root', label: 'Research Topic', x: 0, y: 0 },
            { id: 'n1', label: 'Sources', x: -60, y: -30 },
            { id: 'n2', label: 'Questions', x: 60, y: -30 }
          ],
          edges: [
            { id: 'e1', from: 'root', to: 'n1' },
            { id: 'e2', from: 'root', to: 'n2' }
          ]
        }
      },
      {
        type: 'NOTES',
        position: { x: 7, y: 0 },
        size: { width: 5, height: 8 },
        content: {
          text: 'Ideas, outlines, and action items.'
        }
      }
    ]
  }
]

async function main() {
  for (const persona of personas) {
    await prisma.persona.upsert({
      where: { name: persona.name },
      create: { name: persona.name, widgets: persona.widgets },
      update: { widgets: persona.widgets }
    })
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
