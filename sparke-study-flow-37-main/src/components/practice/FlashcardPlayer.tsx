
import { useState, useEffect } from "react";
import { PracticeSet, PracticeSessionResults, FlashCard } from "./PracticeInterface";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, RotateCcw, ThumbsDown, ThumbsUp, PencilRuler } from "lucide-react";
import PracticeHelpers from "./PracticeHelpers";

// Mock flashcards for the demo
const mockFlashcards: FlashCard[] = [
  {
    id: "f1",
    front: "What is a data structure?",
    back: "A data structure is a specialized format for organizing, processing, retrieving and storing data in a computer system. Examples include arrays, linked lists, trees, and graphs."
  },
  {
    id: "f2",
    front: "What is encapsulation in object-oriented programming?",
    back: "Encapsulation is the bundling of data with the methods that operate on that data, restricting direct access to the data and preventing unintended interference. It's one of the fundamental principles of OOP."
  },
  {
    id: "f3",
    front: "What is a hash table and what is it used for?",
    back: "A hash table is a data structure that implements an associative array abstract data type, a structure that can map keys to values. It uses a hash function to compute an index into an array of buckets or slots. Used for fast data retrieval."
  },
  {
    id: "f4",
    front: "What is the difference between a stack and a queue?",
    back: "A stack uses LIFO (Last In First Out) ordering, where elements are added and removed from the same end. A queue uses FIFO (First In First Out) ordering, where elements are added at one end and removed from the other end."
  }
];

interface FlashcardPlayerProps {
  set: PracticeSet;
  onComplete: (results: PracticeSessionResults) => void;
}

const FlashcardPlayer = ({ set, onComplete }: FlashcardPlayerProps) => {
  const [cards] = useState<FlashCard[]>(mockFlashcards);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<Set<string>>(new Set());
  const [startTime] = useState<Date>(new Date());
  const [isHelpersOpen, setIsHelpersOpen] = useState(false);
  
  const currentCard = cards[currentCardIndex];
  const progress = ((currentCardIndex + 1) / cards.length) * 100;
  
  const handleFlipCard = () => {
    setIsFlipped(!isFlipped);
  };
  
  const handlePreviousCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setIsFlipped(false);
    }
  };
  
  const handleNextCard = () => {
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
    } else {
      handleComplete();
    }
  };
  
  const handleFeedback = (known: boolean) => {
    const newKnownCards = new Set(knownCards);
    
    if (known) {
      newKnownCards.add(currentCard.id);
    } else {
      newKnownCards.delete(currentCard.id);
    }
    
    setKnownCards(newKnownCards);
    handleNextCard();
  };
  
  const handleComplete = () => {
    const endTime = new Date();
    const timeSpent = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    
    const results: PracticeSessionResults = {
      totalQuestions: cards.length,
      correctAnswers: knownCards.size,
      timeSpent,
      completedAt: endTime
    };
    
    onComplete(results);
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* Progress bar */}
      <div className="p-4 border-b border-border">
        <div className="flex justify-between items-center text-sm text-muted-foreground mb-2">
          <span>Card {currentCardIndex + 1} of {cards.length}</span>
          <span>{set.title}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
      
      {/* Flashcard */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center">
        <div 
          className={`w-full max-w-2xl transition-all duration-500 perspective-1000 cursor-pointer ${
            isFlipped ? "rotate-y-180" : ""
          }`}
          onClick={handleFlipCard}
        >
          <Card className={`h-96 p-6 flex flex-col relative preserve-3d transition-transform duration-500 ${
            isFlipped ? "rotate-y-180 bg-primary text-primary-foreground" : "bg-white"
          }`}>
            <div className={`absolute inset-0 p-6 flex flex-col items-center justify-center backface-hidden ${
              isFlipped ? "invisible" : ""
            }`}>
              <div className="text-sm text-muted-foreground mb-4">
                Click to reveal answer
              </div>
              <h3 className="text-2xl font-medium text-center mb-4">
                {currentCard?.front}
              </h3>
              {currentCard?.tags && currentCard.tags.length > 0 && (
                <div className="mt-auto flex flex-wrap gap-2 justify-center">
                  {currentCard.tags.map((tag, i) => (
                    <Badge key={i} variant="outline">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
            
            <div className={`absolute inset-0 p-6 flex flex-col items-center justify-center backface-hidden rotate-y-180 ${
              !isFlipped ? "invisible" : ""
            }`}>
              <div className="overflow-auto max-h-full flex-1 w-full">
                <p className="text-lg text-center">{currentCard?.back}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
      
      {/* Controls */}
      <div className="p-4 border-t border-border flex items-center justify-between">
        <Button 
          variant="outline" 
          onClick={() => setIsHelpersOpen(true)}
          className="gap-2"
        >
          <PencilRuler className="h-4 w-4" />
          Study Aids
        </Button>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handlePreviousCard} 
            disabled={currentCardIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {isFlipped ? (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1" 
                onClick={() => handleFeedback(false)}
              >
                <ThumbsDown className="h-4 w-4" />
                <span>Still Learning</span>
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                className="gap-1" 
                onClick={() => handleFeedback(true)}
              >
                <ThumbsUp className="h-4 w-4" />
                <span>Got It</span>
              </Button>
            </div>
          ) : (
            <Button 
              variant="secondary" 
              onClick={handleFlipCard}
              className="gap-1"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Show Answer</span>
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleNextCard}
            disabled={currentCardIndex === cards.length - 1 && !isFlipped}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Practice helpers (whiteboard, AI hints) */}
      <PracticeHelpers 
        isOpen={isHelpersOpen} 
        onClose={() => setIsHelpersOpen(false)}
        currentFlashcard={currentCard}
      />
    </div>
  );
};

export default FlashcardPlayer;
