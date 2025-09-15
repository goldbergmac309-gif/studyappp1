
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Mic, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { Drawer, DrawerTrigger, DrawerContent } from "@/components/ui/drawer";
import { FileText } from "lucide-react";

export interface Message {
  id: string;
  sender: "user" | "ai";
  content: string;
  timestamp: Date;
  guidancePrompts?: string[];
}

const ChatView = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "ai",
      content: "Hello! I'm Spark.E, your AI study partner for Computer Science. How can I help you today?",
      timestamp: new Date(),
      guidancePrompts: ["Explain core Computer Science concepts", "Help with coding problems"]
    }
  ]);
  const [input, setInput] = useState("");
  const [isDocumentSelectorOpen, setIsDocumentSelectorOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock documents for document selector
  const availableDocuments = [
    { id: "1", title: "Introduction to Algorithms" },
    { id: "2", title: "Data Structures Overview" },
    { id: "3", title: "Lecture Notes: Complexity Theory" }
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");

    // Simulate AI response (in a real app, this would call an API)
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        content: "I'm simulating a response to your message. In a real application, this would be connected to an AI model that provides helpful information about Computer Science topics.",
        timestamp: new Date(),
        guidancePrompts: ["See more examples", "Practice with a quiz"]
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleGuidancePrompt = (prompt: string) => {
    // Set the input to the prompt text
    setInput(prompt);
    // Optional: Auto-send the message
    // handleSend();
  };

  const handleDocumentSelect = (documentId: string) => {
    // In a real implementation, this would load a document and switch to WhiteSpace mode
    setIsDocumentSelectorOpen(false);
    
    // Find the selected document
    const selectedDocument = availableDocuments.find(doc => doc.id === documentId);
    
    if (selectedDocument) {
      // Add AI message about the opened document
      const aiResponse: Message = {
        id: Date.now().toString(),
        sender: "ai",
        content: `I've opened "${selectedDocument.title}" for you. What would you like to know about it?`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiResponse]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background rounded-xl border border-border/30 shadow-lift overflow-hidden">
      {/* Chat messages area with constrained width and centered */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 flex flex-col items-center">
        <div className="w-full max-w-[700px]">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex mb-6",
                message.sender === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl p-4 space-y-2.5",
                  message.sender === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-foreground"
                )}
              >
                <div className="text-sm leading-relaxed">{message.content}</div>
                
                {/* Guidance prompts */}
                {message.guidancePrompts && message.guidancePrompts.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {message.guidancePrompts.map((prompt, index) => (
                      <button
                        key={index}
                        onClick={() => handleGuidancePrompt(prompt)}
                        className={cn(
                          "text-xs px-3 py-1.5 rounded-full transition-colors",
                          message.sender === "user" 
                            ? "bg-white/10 hover:bg-white/20" 
                            : "bg-primary/10 hover:bg-primary/20 text-primary"
                        )}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
                
                <div className="text-xs opacity-70 text-right">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area with document attachment button */}
      <div className="border-t border-border/30 p-4 bg-background flex justify-center">
        <div className="flex items-center gap-2 w-full max-w-[700px]">
          <Drawer open={isDocumentSelectorOpen} onOpenChange={setIsDocumentSelectorOpen}>
            <DrawerTrigger asChild>
              <Button variant="ghost" size="icon" className="flex-shrink-0 rounded-full h-10 w-10" title="Attach document">
                <Paperclip className="h-5 w-5 text-muted-foreground" />
              </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[70vh]">
              <div className="p-4">
                <h3 className="font-medium mb-4">Select a document</h3>
                <div className="grid gap-2">
                  {availableDocuments.map((doc) => (
                    <Button
                      key={doc.id}
                      variant="outline"
                      className="justify-start"
                      onClick={() => handleDocumentSelect(doc.id)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      {doc.title}
                    </Button>
                  ))}
                </div>
              </div>
            </DrawerContent>
          </Drawer>

          <Button variant="ghost" size="icon" className="flex-shrink-0 rounded-full h-10 w-10">
            <Mic className="h-5 w-5 text-muted-foreground" />
          </Button>
          
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about Computer Science..."
            className="flex-1 rounded-full bg-muted/40 border-0 focus-visible:ring-1 focus-visible:ring-primary/30 py-6 px-4"
          />
          
          <Button 
            onClick={handleSend} 
            disabled={!input.trim()} 
            size="icon" 
            className="flex-shrink-0 rounded-full h-10 w-10 bg-primary/10 text-primary hover:bg-primary/20"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
