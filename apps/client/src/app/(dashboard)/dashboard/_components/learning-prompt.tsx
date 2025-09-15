"use client"

import { MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function LearningPrompt() {
  return (
    <div className="mb-16 text-center py-8">
      <h2 className="font-serif text-2xl md:text-3xl mb-8">What do you want to learn today?</h2>
      <div className="max-w-3xl mx-auto relative">
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              <MessageSquare size={18} />
            </div>
            <Input
              className="pl-12 py-6 bg-gray-50 border-0 focus-visible:ring-1 focus-visible:ring-gray-900/30 text-base shadow-sm rounded-lg"
              placeholder="Ask anything about your studies..."
            />
          </div>
          <Button variant="default" size="lg" className="bg-gray-800 text-white hover:bg-gray-700 px-6">
            Ask
          </Button>
        </div>
      </div>
    </div>
  )
}
