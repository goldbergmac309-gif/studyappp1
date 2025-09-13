import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { StatusBadge } from "./status-badge"
import type { DocumentStatus } from "../lib/types"

const meta: Meta<typeof StatusBadge> = {
  title: "Components/StatusBadge",
  component: StatusBadge,
  tags: ["autodocs"],
  args: {
    status: "UPLOADED" satisfies DocumentStatus,
  },
  parameters: {
    layout: "centered",
  },
}

export default meta

type Story = StoryObj<typeof StatusBadge>

export const Uploaded: Story = {
  args: { status: "UPLOADED" },
}

export const Queued: Story = {
  args: { status: "QUEUED" },
}

export const Processing: Story = {
  args: { status: "PROCESSING" },
}

export const Completed: Story = {
  args: { status: "COMPLETED" },
}

export const Failed: Story = {
  args: { status: "FAILED" },
}
