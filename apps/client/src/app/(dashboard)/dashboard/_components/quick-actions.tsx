"use client"

import { useState } from "react"
import { BarChart2, BookOpen, CalendarDays, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

type QuickActionProps = {
  icon: React.ReactNode
  title: string
  isHighlighted?: boolean
  details?: React.ReactNode
}

function QuickAction({ icon, title, isHighlighted, details }: QuickActionProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [hoverTimeout, setHoverTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = () => {
    const timeout = setTimeout(() => setIsHovered(true), 1500)
    setHoverTimeout(timeout)
  }
  const handleMouseLeave = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout)
    setIsHovered(false)
  }

  return (
    <div className="relative">
      <div
        className={cn(
          "flex items-center gap-3 py-3 px-4 bg-white rounded-lg border border-border transition-all cursor-pointer",
          "hover:border-gray-900/30",
          isHighlighted && "border-gray-900/30"
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="text-gray-900">{icon}</div>
        <span className="text-sm font-medium">{title}</span>
        {isHighlighted && (
          <span className="ml-auto text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full">Ad</span>
        )}
      </div>
      {isHovered && details && (
        <div
          className="absolute left-0 top-full mt-2 bg-white border border-border p-3 rounded-lg shadow-md z-10 w-64"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {details}
        </div>
      )}
    </div>
  )
}

function LearningInsightsDetails() {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Recent Progress</h4>
      <ul className="text-xs space-y-1.5 text-muted-foreground">
        <li className="flex justify-between">
          <span>Physics concepts</span>
          <span className="font-medium text-green-600">+12%</span>
        </li>
        <li className="flex justify-between">
          <span>Math practice</span>
          <span className="font-medium text-green-600">+8%</span>
        </li>
        <li className="flex justify-between">
          <span>Biology quiz scores</span>
          <span className="font-medium text-amber-600">-3%</span>
        </li>
      </ul>
    </div>
  )
}

function BiologyMidtermDetails() {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Biology Midterm</h4>
      <ul className="text-xs space-y-1.5 text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <CalendarDays className="h-3 w-3" />
          <span>April 22, 2025</span>
        </li>
        <li className="flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          <span>9:00 AM - 11:00 AM</span>
        </li>
        <li>Room B201</li>
        <li className="text-primary font-medium mt-1">3 days left to prepare</li>
      </ul>
    </div>
  )
}

function TodayClassesDetails() {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Today&apos;s Schedule</h4>
      <ul className="text-xs space-y-1.5 text-muted-foreground">
        <li className="flex justify-between">
          <span>Physics Lab</span>
          <span>9:00 AM</span>
        </li>
        <li className="flex justify-between">
          <span>Calculus</span>
          <span>11:30 AM</span>
        </li>
        <li className="flex justify-between">
          <span>English Literature</span>
          <span>2:15 PM</span>
        </li>
        <li className="flex justify-between">
          <span>Study Group</span>
          <span>4:00 PM</span>
        </li>
      </ul>
    </div>
  )
}

export default function QuickActions() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
      <QuickAction icon={<BarChart2 className="h-5 w-5" />} title="Learning Insights" details={<LearningInsightsDetails />} />
      <QuickAction icon={<BookOpen className="h-5 w-5" />} title="Next: Biology Midterm" isHighlighted details={<BiologyMidtermDetails />} />
      <QuickAction icon={<CalendarDays className="h-5 w-5" />} title={"Today\'s Classes"} details={<TodayClassesDetails />} />
    </div>
  )
}
