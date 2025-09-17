"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function TutorPage() {
  const [tab, setTab] = useState("chat")
  const [message, setMessage] = useState("")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Tutor</h1>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="whiteboard">Whiteboard</TabsTrigger>
          <TabsTrigger value="whitespace">WhiteSpace</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Session</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 space-y-2">
                <div className="inline-flex max-w-[80%] rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
                  Hello! I&apos;m your AI study partner. How can I help today?
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Ask anything about your subject…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <Button onClick={() => setMessage("")}>Send</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whiteboard">
          <Card>
            <CardHeader>
              <CardTitle>Whiteboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 rounded-md border bg-card" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whitespace">
          <Card>
            <CardHeader>
              <CardTitle>WhiteSpace</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">A calm space for brainstorming. Coming soon.</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
