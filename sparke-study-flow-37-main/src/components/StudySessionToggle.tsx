
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";
import StudySessionSummary from "./StudySessionSummary";

const StudySessionToggle = () => {
  const [isActive, setIsActive] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  
  const toggleSession = () => {
    // If we're ending an active session, show the summary
    if (isActive) {
      setShowSummary(true);
    }
    setIsActive(prev => !prev);
  };
  
  return (
    <>
      <Button
        onClick={toggleSession}
        variant={isActive ? "default" : "outline"}
        size="sm"
        className={`flex items-center gap-2 transition-all ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
      >
        {isActive ? (
          <>
            <span className="h-2 w-2 rounded-full bg-primary-foreground animate-pulse-subtle"></span>
            <span className="hidden md:inline">Active Session</span>
            <Pause className="h-4 w-4 md:ml-1" />
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            <span className="hidden md:inline">Start Session</span>
          </>
        )}
      </Button>
      
      <StudySessionSummary 
        isOpen={showSummary} 
        onClose={() => setShowSummary(false)}
      />
    </>
  );
};

export default StudySessionToggle;
