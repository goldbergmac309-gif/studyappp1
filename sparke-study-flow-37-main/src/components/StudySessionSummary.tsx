
import { useState } from "react";
import { Clock, BookOpen, CheckSquare, Lightbulb } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface StudySessionSummaryProps {
  isOpen: boolean;
  onClose: () => void;
  sessionData?: {
    timeSpent: string;
    topicsCovered: string[];
    activities: string[];
    suggestions: string[];
  };
}

const defaultSessionData = {
  timeSpent: "1h 25m",
  topicsCovered: ["Linear Algebra", "Calculus", "Statistics"],
  activities: [
    "Completed 2 practice quizzes",
    "Created 3 notes",
    "Reviewed 12 flashcards"
  ],
  suggestions: [
    "Review derivatives again tomorrow",
    "Consider creating more practice questions on statistics",
    "You're making great progress! Keep it up!"
  ]
};

const StudySessionSummary = ({ 
  isOpen, 
  onClose, 
  sessionData = defaultSessionData 
}: StudySessionSummaryProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Study Session Summary</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-5 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="text-sm font-medium">Time Spent</h4>
              <p className="text-lg font-medium">{sessionData.timeSpent}</p>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-medium">Topics Covered</h4>
            </div>
            <ul className="space-y-1 pl-6 list-disc text-sm">
              {sessionData.topicsCovered.map((topic, index) => (
                <li key={index}>{topic}</li>
              ))}
            </ul>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckSquare className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-medium">Activities</h4>
            </div>
            <ul className="space-y-1 pl-6 list-disc text-sm">
              {sessionData.activities.map((activity, index) => (
                <li key={index}>{activity}</li>
              ))}
            </ul>
          </div>
          
          <div className="bg-secondary/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-medium">AI Suggestions</h4>
            </div>
            <ul className="space-y-2 pl-6 list-disc text-sm">
              {sessionData.suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StudySessionSummary;
