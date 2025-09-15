
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lightbulb, Download, PenLine, Send } from "lucide-react";
import { QuizQuestion, FlashCard } from "./PracticeInterface";

interface PracticeHelpersProps {
  isOpen: boolean;
  onClose: () => void;
  currentQuestion?: QuizQuestion;
  currentFlashcard?: FlashCard;
}

const PracticeHelpers = ({ 
  isOpen, 
  onClose,
  currentQuestion,
  currentFlashcard
}: PracticeHelpersProps) => {
  const [activeTab, setActiveTab] = useState<string>("whiteboard");
  const [hintPrompt, setHintPrompt] = useState<string>("");
  const [aiHint, setAiHint] = useState<string>("");
  const [isLoadingHint, setIsLoadingHint] = useState(false);
  
  // Get content based on whether we're viewing a question or a flashcard
  const content = currentQuestion?.question || currentFlashcard?.front;
  
  const handleRequestHint = () => {
    setIsLoadingHint(true);
    
    // Simulate AI response with a timeout
    setTimeout(() => {
      let hint = "";
      
      if (currentQuestion) {
        if (currentQuestion.type === "multiple-choice") {
          hint = "For multiple choice questions about algorithms, remember to consider the worst-case scenario. Big O notation represents the upper bound of time complexity.";
        } else if (currentQuestion.type === "short-answer") {
          hint = "When identifying sorting algorithms, think about their key characteristics: selection sort repeatedly finds the minimum element from the unsorted portion.";
        } else {
          hint = "Consider what you know about memory management in different programming languages.";
        }
      } else if (currentFlashcard) {
        hint = "Think about the core purpose of data structures - they're ways to organize data for specific use cases and performance characteristics.";
      }
      
      if (hintPrompt) {
        hint += `\n\nRegarding "${hintPrompt}": This concept relates to efficiency in algorithms. Consider how the size of the input affects the number of operations needed.`;
      }
      
      setAiHint(hint);
      setIsLoadingHint(false);
    }, 1500);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Study Aids</DialogTitle>
        </DialogHeader>
        
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab} 
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="mx-auto">
            <TabsTrigger value="whiteboard" className="gap-2">
              <PenLine className="h-4 w-4" />
              Whiteboard
            </TabsTrigger>
            <TabsTrigger value="ai-hint" className="gap-2">
              <Lightbulb className="h-4 w-4" />
              AI Hint
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="whiteboard" className="flex-1 flex flex-col mt-0 data-[state=active]:flex-1">
            <div className="p-4 bg-muted/30 rounded mb-4 text-sm">
              <p>Working on: <strong>{content}</strong></p>
            </div>
            
            <div className="flex-1 bg-white border rounded-md relative flex items-center justify-center">
              <div className="text-muted-foreground text-center p-6">
                <p className="mb-2">Whiteboard functionality would go here.</p>
                <p className="text-sm">This would include drawing tools and a canvas for working through problems.</p>
              </div>
              
              {/* This would be an actual whiteboard component in a real implementation */}
              <div className="absolute top-2 right-2">
                <Button size="sm" variant="outline" className="gap-1">
                  <Download className="h-4 w-4" />
                  Save
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="ai-hint" className="flex-1 flex flex-col mt-0 data-[state=active]:flex-1">
            <div className="p-4 bg-muted/30 rounded mb-4 text-sm">
              <p>Need help with: <strong>{content}</strong></p>
            </div>
            
            <div className="flex-1 overflow-auto border rounded-md p-4 mb-4">
              {aiHint ? (
                <div className="bg-primary/5 p-4 rounded-md">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                    Spark.E Hint
                  </h4>
                  <div className="text-sm whitespace-pre-line">
                    {aiHint}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-center">
                  <div>
                    <Lightbulb className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p>Ask for a hint about the current question</p>
                    <p className="text-sm">I'll help without giving away the answer</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Input
                placeholder="Ask for a specific hint..."
                value={hintPrompt}
                onChange={(e) => setHintPrompt(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={handleRequestHint} 
                disabled={isLoadingHint}
                className="gap-2"
              >
                {isLoadingHint ? (
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Get Hint
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default PracticeHelpers;
