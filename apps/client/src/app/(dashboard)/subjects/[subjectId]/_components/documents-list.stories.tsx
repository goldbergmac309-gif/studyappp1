import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import DocumentsList from "./documents-list"
import type { Document } from "@/lib/types"
import * as React from "react"

const sampleDocs: Document[] = [
  { id: "1", filename: "Week1-Intro.pdf", status: "COMPLETED", createdAt: new Date(Date.now() - 3600_000).toISOString() },
  { id: "2", filename: "PastExam-2023.pdf", status: "PROCESSING", createdAt: new Date(Date.now() - 600_000).toISOString() },
  { id: "3", filename: "Lecture2-Notes.pdf", status: "QUEUED", createdAt: new Date(Date.now() - 300_000).toISOString() },
]

const meta: Meta<typeof DocumentsList> = {
  title: "Subjects/DocumentsList",
  component: DocumentsList,
  parameters: { layout: "centered" },
}

export default meta

type Story = StoryObj<typeof DocumentsList>

export const Default: Story = {
  render: () => {
    const [selectedId, setSelectedId] = React.useState<string | undefined>(sampleDocs[0].id)
    return (
      <div style={{ width: 640 }}>
        <DocumentsList
          documents={sampleDocs}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id)
            // Also reflect in URL for demo purposes
            const params = new URLSearchParams(window.location.search)
            params.set("doc", id)
            window.history.pushState(null, "", `?${params.toString()}`)
          }}
        />
        <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
          Selected ID: <code>{selectedId}</code>
        </div>
      </div>
    )
  },
}

export const Loading: Story = {
  args: {
    documents: [],
    isLoading: true,
    onSelect: () => {},
  },
}

export const Empty: Story = {
  args: {
    documents: [],
    onSelect: () => {},
  },
}

export const ErrorState: Story = {
  args: {
    documents: [],
    onSelect: () => {},
    error: "Failed to load documents",
  },
}
