
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Paperclip, FileText } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerTrigger, DrawerContent } from "@/components/ui/drawer";
import { Message } from "./ChatView";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

// Sample document content for demonstration
const sampleDocument = `
# Introduction to Algorithms

An algorithm is a finite sequence of well-defined instructions, typically used to solve a class of specific problems or to perform a computation.

## Key Characteristics of Algorithms

1. **Finiteness**: An algorithm must terminate after a finite number of steps.
2. **Definiteness**: Each step must be precisely defined.
3. **Input**: An algorithm has zero or more inputs.
4. **Output**: An algorithm has one or more outputs.
5. **Effectiveness**: The operations must be basic enough to be carried out.

## Common Algorithms

### Sorting Algorithms
- Bubble Sort
- Quick Sort
- Merge Sort
- Insertion Sort

### Search Algorithms
- Linear Search
- Binary Search
- Depth-First Search
- Breadth-First Search

## Time Complexity

The time complexity of an algorithm quantifies the amount of time taken by an algorithm to run as a function of the length of the input. It is commonly expressed using big O notation.

For example, the time complexity of binary search is O(log n), which is more efficient than linear search's O(n) for large datasets.
`;

const WhiteSpaceView = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "ai",
      content: "I've opened a document on Algorithms for you. Feel free to highlight any text to ask questions or get clarification.",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isDocumentSelectorOpen, setIsDocumentSelectorOpen] = useState(false);
  const [currentDocument, setCurrentDocument] = useState({
    title: "Introduction to Algorithms",
    content: sampleDocument
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock documents for document selector
  const availableDocuments = [
    { id: "1", title: "Introduction to Algorithms", content: sampleDocument },
    { id: "2", title: "Data Structures Overview", content: "# Data Structures\n\nThis would contain content about various data structures..." },
    { id: "3", title: "Lecture Notes: Complexity Theory", content: "# Complexity Theory\n\nThis would contain lecture notes..." }
  ];

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

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        content: "This is a simulation of how I would respond to your question about the document content. In a real implementation, this would analyze your query in context of the document.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
      
      // Scroll to bottom
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 1000);
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    
    const selectedText = selection.toString().trim();
    if (!selectedText) return;
    
    // Show text selection options (in a real implementation, this would likely use
    // a context menu positioned near the selection)
    console.log("Selected text:", selectedText);
  };

  const handleHighlightAction = (action: string, text: string) => {
    setInput(`${action}: "${text}"`);
    handleSend();
  };

  const handleDocumentSelect = (document: typeof availableDocuments[0]) => {
    setCurrentDocument(document);
    setIsDocumentSelectorOpen(false);
    
    // Add AI message about the newly opened document
    const aiMessage: Message = {
      id: Date.now().toString(),
      sender: "ai",
      content: `I've opened "${document.title}" for you. What would you like to know about it?`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, aiMessage]);
    
    // Scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="h-full bg-white rounded-lg border border-border overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Chat panel (left) */}
        <ResizablePanel defaultSize={40} minSize={30}>
          <div className="flex flex-col h-full">
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-full rounded-lg p-3 ${
                    message.sender === "user"
                      ? "bg-primary text-primary-foreground ml-auto"
                      : "bg-secondary"
                  }`}
                >
                  <div className="text-sm">{message.content}</div>
                  <div className="text-xs opacity-70 text-right mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area with document attachment button */}
            <div className="border-t border-border p-3">
              <div className="flex items-center gap-2">
                <Drawer open={isDocumentSelectorOpen} onOpenChange={setIsDocumentSelectorOpen}>
                  <DrawerTrigger asChild>
                    <Button variant="ghost" size="icon" className="flex-shrink-0" title="Attach document">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
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
                            onClick={() => handleDocumentSelect(doc)}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            {doc.title}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </DrawerContent>
                </Drawer>
                
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask about the document..."
                  className="flex-1"
                />
                
                <Button 
                  onClick={handleSend} 
                  disabled={!input.trim()} 
                  size="icon" 
                  className="flex-shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </ResizablePanel>

        {/* Resizable divider */}
        <ResizableHandle withHandle />

        {/* Document viewer (right) */}
        <ResizablePanel defaultSize={60} minSize={40}>
          <div className="h-full flex flex-col">
            {/* Document header */}
            <div className="border-b border-border p-3 flex items-center justify-between">
              <h3 className="font-medium truncate">{currentDocument.title}</h3>
            </div>
            
            {/* Document content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div 
                className="prose max-w-none" 
                onMouseUp={handleTextSelection}
                dangerouslySetInnerHTML={{ 
                  __html: currentDocument.content
                    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mb-4 mt-2">$1</h1>')
                    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold my-3">$1</h2>')
                    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold my-2">$1</h3>')
                    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                    .replace(/- (.+)$/gm, '<li class="ml-4">$1</li>')
                }}
              />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Text selection popup - this would be positioned at the selection in a real implementation */}
      <TextSelectionPopup 
        onAction={(action) => {
          const selection = window.getSelection();
          if (selection) {
            handleHighlightAction(action, selection.toString().trim());
          }
        }} 
      />
    </div>
  );
};

interface TextSelectionPopupProps {
  onAction: (action: string) => void;
}

// This is a simplified version of what would be a positioned popover in a real implementation
const TextSelectionPopup = ({ onAction }: TextSelectionPopupProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="hidden">Trigger</div>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1">
        <div className="space-y-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-sm"
            onClick={() => onAction("Explain")}
          >
            Explain this
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-sm"
            onClick={() => onAction("Summarize")}
          >
            Summarize
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-sm"
            onClick={() => onAction("Examples")}
          >
            Show examples
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-sm"
            onClick={() => onAction("Quiz")}
          >
            Create quiz
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default WhiteSpaceView;
