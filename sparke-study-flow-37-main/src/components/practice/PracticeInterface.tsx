
import { useState } from "react";
import PracticeHub from "./PracticeHub";
import QuizPlayer from "./QuizPlayer";
import FlashcardPlayer from "./FlashcardPlayer";
import PracticeResults from "./PracticeResults";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export type PracticeMode = "hub" | "quiz" | "flashcard" | "results";
export type PracticeDifficulty = "easy" | "medium" | "hard";
export type QuestionType = "multiple-choice" | "true-false" | "short-answer";

export interface PracticeSet {
  id: string;
  title: string;
  description: string;
  type: "quiz" | "flashcard";
  questionCount: number;
  difficulty: PracticeDifficulty;
  createdAt: Date;
  dueDate?: Date; // For spaced repetition
}

export interface QuizQuestion {
  id: string;
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  type: QuestionType;
  explanation?: string;
}

export interface FlashCard {
  id: string;
  front: string;
  back: string;
  tags?: string[];
}

export interface PracticeSessionResults {
  totalQuestions: number;
  correctAnswers: number;
  incorrectQuestions?: QuizQuestion[];
  timeSpent: number; // in seconds
  completedAt: Date;
}

const PracticeInterface = () => {
  const [activeMode, setActiveMode] = useState<PracticeMode>("hub");
  const [activeSet, setActiveSet] = useState<PracticeSet | null>(null);
  const [results, setResults] = useState<PracticeSessionResults | null>(null);
  
  // Return to the practice hub
  const handleReturnToHub = () => {
    setActiveMode("hub");
    setActiveSet(null);
    setResults(null);
  };
  
  // Start a practice session with a specific set
  const handleStartSession = (set: PracticeSet) => {
    setActiveSet(set);
    setActiveMode(set.type);
  };
  
  // Handle completion of a practice session
  const handleCompleteSession = (sessionResults: PracticeSessionResults) => {
    setResults(sessionResults);
    setActiveMode("results");
  };
  
  // Restart the same practice set
  const handleRestartSession = () => {
    if (activeSet) {
      setActiveMode(activeSet.type);
      setResults(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-border overflow-hidden">
      {/* Header with back button when not in hub */}
      {activeMode !== "hub" && (
        <div className="p-3 border-b border-border">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleReturnToHub} 
            className="gap-1 text-muted-foreground"
          >
            <Home className="h-4 w-4" />
            <span>Practice Hub</span>
          </Button>
        </div>
      )}
      
      {/* Content based on active mode */}
      <div className="flex-1 overflow-auto">
        {activeMode === "hub" && (
          <PracticeHub onStartSession={handleStartSession} />
        )}
        
        {activeMode === "quiz" && activeSet && (
          <QuizPlayer 
            set={activeSet} 
            onComplete={handleCompleteSession} 
          />
        )}
        
        {activeMode === "flashcard" && activeSet && (
          <FlashcardPlayer 
            set={activeSet} 
            onComplete={handleCompleteSession} 
          />
        )}
        
        {activeMode === "results" && results && (
          <PracticeResults 
            results={results} 
            set={activeSet}
            onRestartSession={handleRestartSession}
            onReturnToHub={handleReturnToHub}
          />
        )}
      </div>
    </div>
  );
};

export default PracticeInterface;
