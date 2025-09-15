
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ChatHistoryPanelProps {
  onSelectConversation: (id: string) => void;
}

interface ChatHistoryItem {
  id: string;
  title: string;
  preview: string;
  date: Date;
}

const ChatHistoryPanel = ({ onSelectConversation }: ChatHistoryPanelProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Mock chat history data
  const mockChatHistory: ChatHistoryItem[] = [
    {
      id: "1",
      title: "Algorithms Introduction",
      preview: "Can you explain Big O notation?",
      date: new Date(2025, 3, 17) // April 17, 2025
    },
    {
      id: "2",
      title: "Data Structures",
      preview: "What's the difference between arrays and linked lists?",
      date: new Date(2025, 3, 16) // April 16, 2025
    },
    {
      id: "3",
      title: "Programming Paradigms",
      preview: "Can you explain functional programming?",
      date: new Date(2025, 3, 15) // April 15, 2025
    },
    {
      id: "4",
      title: "Machine Learning Basics",
      preview: "What's the difference between supervised and unsupervised learning?",
      date: new Date(2025, 3, 14) // April 14, 2025
    },
    {
      id: "5",
      title: "Computer Networks",
      preview: "Explain the OSI model layers",
      date: new Date(2025, 3, 13) // April 13, 2025
    }
  ];

  // Filter chat history based on search query
  const filteredHistory = searchQuery.trim() === "" 
    ? mockChatHistory 
    : mockChatHistory.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.preview.toLowerCase().includes(searchQuery.toLowerCase())
      );

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="font-medium mb-4">Chat History</h3>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {filteredHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No conversations found
          </div>
        ) : (
          <div className="space-y-2">
            {filteredHistory.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                className="w-full justify-start text-left h-auto py-3 px-3"
                onClick={() => onSelectConversation(item.id)}
              >
                <div className="mr-3 flex-shrink-0">
                  <MessageCircle className="h-5 w-5 text-primary/70" />
                </div>
                <div className="overflow-hidden">
                  <p className="font-medium text-sm truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {item.preview}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.date.toLocaleDateString()}
                  </p>
                </div>
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHistoryPanel;
