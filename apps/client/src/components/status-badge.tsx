"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { DocumentStatus } from "@/lib/types"
import { Check, XCircle, LoaderCircle, Dot } from "lucide-react"

export type StatusBadgeProps = {
  status: DocumentStatus
  className?: string
  "aria-label"?: string
}

const STATUS_STYLES: Record<
  DocumentStatus,
  { label: string; classes: string; Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>; pulse?: boolean }
> = {
  UPLOADED: {
    label: "Uploaded",
    classes:
      "bg-neutral-100 text-neutral-800 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700",
  },
  QUEUED: {
    label: "Queued",
    classes:
      "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
    Icon: Dot,
  },
  PROCESSING: {
    label: "Processing…",
    classes:
      "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800",
    Icon: LoaderCircle,
    pulse: true,
  },
  COMPLETED: {
    label: "Completed",
    classes:
      "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
    Icon: Check,
  },
  FAILED: {
    label: "Failed",
    classes:
      "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
    Icon: XCircle,
  },
}

export function StatusBadge({ status, className, ...rest }: StatusBadgeProps) {
  const conf = STATUS_STYLES[status]
  const ariaLabel = rest["aria-label"] ?? `Status: ${conf.label}`
  const Icon = conf.Icon

  return (
    <Badge
      variant="outline"
      aria-label={ariaLabel}
      className={cn(conf.classes, conf.pulse && "[&>svg]:animate-spin", className)}
      {...rest}
    >
      {Icon ? <Icon aria-hidden className={cn(status === "PROCESSING" && "opacity-90")} /> : null}
      <span>{conf.label}</span>
    </Badge>
  )
}

export default StatusBadge
