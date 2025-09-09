"use client"

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function InsightsTab() {
  return (
    <div className="space-y-4">
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Insights</CardTitle>
          <CardDescription>Topic heat maps and study guidance will appear here.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
