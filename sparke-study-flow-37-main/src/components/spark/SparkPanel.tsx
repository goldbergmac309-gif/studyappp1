
import React from "react";
import { X, Sparkles, Lightbulb, BookText, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";

interface SparkPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const SparkPanel = ({ isOpen, onClose }: SparkPanelProps) => {
  const location = useLocation();
  const path = location.pathname;
  
  // Determine the current context based on the URL path
  const getContext = () => {
    if (path.includes("/subject/")) {
      // Check if in notes view
      if (path.includes("notes") || location.hash === "#notes") {
        return "notes";
      }
      // Check if in resources view
      if (path.includes("resources") || location.hash === "#resources") {
        return "resources";
      }
      return "subject";
    }
    return "dashboard";
  };
  
  const context = getContext();
  
  // Get suggestions based on context
  const getSuggestions = () => {
    switch (context) {
      case "notes":
        return (
          <>
            <h4 className="text-sm font-medium mb-2">Related Concepts</h4>
            <div className="space-y-1.5 mb-4">
              <div className="text-sm p-1.5 rounded-md hover:bg-secondary/80 cursor-pointer flex items-center">
                <BookText className="h-3.5 w-3.5 mr-2 text-primary" />
                <span className="text-sm">[[Differential Equations]]</span>
              </div>
              <div className="text-sm p-1.5 rounded-md hover:bg-secondary/80 cursor-pointer flex items-center">
                <BookText className="h-3.5 w-3.5 mr-2 text-primary" />
                <span className="text-sm">[[Integration Methods]]</span>
              </div>
            </div>
            
            <h4 className="text-sm font-medium mb-2">Key Terms Found</h4>
            <div className="space-y-1.5 mb-4">
              <Button variant="outline" size="sm" className="text-xs h-7 w-full justify-start">
                <Lightbulb className="h-3.5 w-3.5 mr-2 text-amber-500" />
                Define "Partial Fractions"
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-7 w-full justify-start">
                <Lightbulb className="h-3.5 w-3.5 mr-2 text-amber-500" />
                Explain "Laplace Transform"
              </Button>
            </div>
            
            <h4 className="text-sm font-medium mb-2">Suggested Actions</h4>
            <div className="space-y-1.5 mb-4">
              <Button variant="outline" size="sm" className="text-xs h-7 w-full justify-start">
                <Sparkles className="h-3.5 w-3.5 mr-2 text-primary" />
                Create flashcards from this note
              </Button>
            </div>
          </>
        );
        
      case "resources":
        return (
          <>
            <h4 className="text-sm font-medium mb-2">Content Analysis</h4>
            <div className="space-y-1.5 mb-4">
              <div className="text-sm p-1.5 rounded-md hover:bg-secondary/80 cursor-pointer">
                <p className="text-xs text-muted-foreground mb-1">This PDF covers topics from:</p>
                <p className="text-sm font-medium">Integration by Parts</p>
              </div>
            </div>
            
            <h4 className="text-sm font-medium mb-2">Suggested Actions</h4>
            <div className="space-y-1.5 mb-4">
              <Button variant="outline" size="sm" className="text-xs h-7 w-full justify-start">
                <Sparkles className="h-3.5 w-3.5 mr-2 text-primary" />
                Summarize this resource
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-7 w-full justify-start">
                <Sparkles className="h-3.5 w-3.5 mr-2 text-primary" />
                Generate flashcards
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-7 w-full justify-start">
                <Sparkles className="h-3.5 w-3.5 mr-2 text-primary" />
                Add key points to notes
              </Button>
            </div>
          </>
        );
        
      case "subject":
        return (
          <>
            <h4 className="text-sm font-medium mb-2">Subject Insights</h4>
            <div className="space-y-1.5 mb-4">
              <div className="text-sm p-1.5 rounded-md hover:bg-secondary/80 cursor-pointer">
                <p className="text-xs text-muted-foreground mb-1">Recent progress:</p>
                <p className="text-sm">You've completed 3/5 practice quizzes</p>
              </div>
              <div className="text-sm p-1.5 rounded-md hover:bg-secondary/80 cursor-pointer">
                <p className="text-xs text-muted-foreground mb-1">Study suggestion:</p>
                <p className="text-sm">Review Integration Methods today</p>
              </div>
            </div>
            
            <h4 className="text-sm font-medium mb-2">Upcoming Tasks</h4>
            <div className="space-y-1.5 mb-4">
              <div className="text-sm p-1.5 rounded-md border border-amber-200 bg-amber-50 flex items-center">
                <Calendar className="h-3.5 w-3.5 mr-2 text-amber-500" />
                <span>Quiz on Integration (2 days)</span>
              </div>
            </div>
          </>
        );
        
      default: // Dashboard
        return (
          <>
            <h4 className="text-sm font-medium mb-2">Study Recommendations</h4>
            <div className="space-y-1.5 mb-4">
              <div className="text-sm p-1.5 rounded-md hover:bg-secondary/80 cursor-pointer">
                <p className="text-xs text-muted-foreground mb-1">Focus today:</p>
                <p className="text-sm font-medium">Mathematics - Integration Practice</p>
              </div>
              <div className="text-sm p-1.5 rounded-md hover:bg-secondary/80 cursor-pointer">
                <p className="text-xs text-muted-foreground mb-1">Need attention:</p>
                <p className="text-sm font-medium">Biology - Cell Structure Notes</p>
              </div>
            </div>
            
            <h4 className="text-sm font-medium mb-2">Today's Review</h4>
            <div className="space-y-1.5 mb-4">
              <Button variant="outline" size="sm" className="text-xs h-7 w-full justify-start">
                <Sparkles className="h-3.5 w-3.5 mr-2 text-primary" />
                Review Calculus flashcards (15)
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-7 w-full justify-start">
                <Sparkles className="h-3.5 w-3.5 mr-2 text-primary" />
                Practice Biology quiz
              </Button>
            </div>
            
            <h4 className="text-sm font-medium mb-2">Recent Activity</h4>
            <div className="space-y-1.5">
              <div className="text-sm p-1.5 rounded-md hover:bg-secondary/80 cursor-pointer">
                <p className="text-xs text-muted-foreground mb-1">Last studied:</p>
                <p className="text-sm">Computer Science - Algorithms</p>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div
      className={cn(
        "fixed top-[61px] right-0 h-[calc(100vh-61px)] bg-white border-l border-border transition-all duration-300 ease-in-out shadow-md flex flex-col",
        isOpen ? "translate-x-0 w-72" : "translate-x-full w-0"
      )}
      style={{ zIndex: 40 }}
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center">
          <Sparkles className="h-4 w-4 mr-2 text-primary" />
          <h3 className="font-medium text-sm">Spark Panel</h3>
        </div>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {getSuggestions()}
      </div>
      
      <div className="p-3 border-t border-border text-xs text-center text-muted-foreground">
        AI-powered insights based on your content
      </div>
    </div>
  );
};

export default SparkPanel;
