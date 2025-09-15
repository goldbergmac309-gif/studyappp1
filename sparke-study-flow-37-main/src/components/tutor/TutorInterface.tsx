
import { useState } from "react";
import ChatView from "./ChatView";
import WhiteboardView from "./WhiteboardView";
import WhiteSpaceView from "./WhiteSpaceView";
import { Button } from "@/components/ui/button";
import { MessageCircle, PenLine, SplitSquareVertical, History } from "lucide-react";
import { cn } from "@/lib/utils";
import ChatHistoryPanel from "./ChatHistoryPanel";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export type TutorMode = "chat" | "whiteboard" | "whitespace";

const TutorInterface = () => {
  const [activeMode, setActiveMode] = useState<TutorMode>("chat");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const toggleHistoryPanel = () => {
    setIsHistoryOpen(!isHistoryOpen);
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Mode toggles and history button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ModeToggle 
            mode="chat" 
            activeMode={activeMode} 
            onClick={() => setActiveMode("chat")}
            icon={<MessageCircle className="h-4 w-4" />}
            label="Chat"
          />
          <ModeToggle 
            mode="whiteboard" 
            activeMode={activeMode} 
            onClick={() => setActiveMode("whiteboard")}
            icon={<PenLine className="h-4 w-4" />}
            label="Whiteboard"
          />
          <ModeToggle 
            mode="whitespace" 
            activeMode={activeMode} 
            onClick={() => setActiveMode("whitespace")}
            icon={<SplitSquareVertical className="h-4 w-4" />}
            label="WhiteSpace"
          />
        </div>
        
        {/* History toggle button */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={toggleHistoryPanel}
          className={cn(
            "gap-1",
            isHistoryOpen && "bg-secondary"
          )}
        >
          <History className="h-4 w-4" />
          <span>History</span>
        </Button>
      </div>

      {/* Content based on active mode */}
      <div className="flex-1 h-full flex justify-center">
        <div className="w-full">
          {activeMode === "chat" && <ChatView />}
          {activeMode === "whiteboard" && <WhiteboardView />}
          {activeMode === "whitespace" && <WhiteSpaceView />}
        </div>
      </div>

      {/* Chat History Panel */}
      <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen} modal={false}>
        <SheetContent 
          className="w-80 p-0 border-l shadow-none"
          side="right"
        >
          <ChatHistoryPanel onSelectConversation={() => {
            // This would typically load a specific conversation
            setIsHistoryOpen(false);
          }} />
        </SheetContent>
      </Sheet>
    </div>
  );
};

interface ModeToggleProps {
  mode: TutorMode;
  activeMode: TutorMode;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const ModeToggle = ({ mode, activeMode, onClick, icon, label }: ModeToggleProps) => {
  const isActive = mode === activeMode;
  
  return (
    <Button
      variant={isActive ? "default" : "outline"}
      size="sm"
      className={cn(
        "gap-2",
        isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground"
      )}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </Button>
  );
};

export default TutorInterface;
