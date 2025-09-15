
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StickyNote, Link, CheckSquare, Calendar, BarChart2, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

export type GridWidgetType = 
  | "sticky-note" 
  | "resource-link" 
  | "todo-list" 
  | "progress" 
  | "exam-countdown" 
  | "tasks" 
  | "study-tips";

interface WidgetOption {
  type: GridWidgetType;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const widgetOptions: WidgetOption[] = [
  { 
    type: "sticky-note", 
    name: "Note", 
    description: "Quick notes and reminders",
    icon: <StickyNote className="h-5 w-5" /> 
  },
  { 
    type: "resource-link", 
    name: "Resource Link", 
    description: "Links to important resources",
    icon: <Link className="h-5 w-5" /> 
  },
  { 
    type: "todo-list", 
    name: "To-Do List", 
    description: "List of items to complete",
    icon: <CheckSquare className="h-5 w-5" /> 
  },
  { 
    type: "progress", 
    name: "Progress Tracker", 
    description: "Track progress on various topics",
    icon: <BarChart2 className="h-5 w-5" /> 
  },
  { 
    type: "exam-countdown", 
    name: "Exam Countdown", 
    description: "Countdown to important exams",
    icon: <Calendar className="h-5 w-5" /> 
  },
  { 
    type: "tasks", 
    name: "Tasks", 
    description: "Manage your to-do items",
    icon: <CheckSquare className="h-5 w-5" /> 
  },
  { 
    type: "study-tips", 
    name: "Study Tips", 
    description: "AI-generated study advice",
    icon: <Lightbulb className="h-5 w-5" /> 
  }
];

interface WidgetAddMenuProps {
  open: boolean;
  onClose: () => void;
  onSelectWidget: (type: GridWidgetType) => void;
}

const WidgetAddMenu = ({ open, onClose, onSelectWidget }: WidgetAddMenuProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Widget</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-3 mt-4">
          {widgetOptions.map((option) => (
            <button
              key={option.type}
              className={cn(
                "flex flex-col items-center text-center p-4 rounded-lg border border-border",
                "hover:border-primary/50 hover:bg-secondary/50 transition-colors"
              )}
              onClick={() => {
                onSelectWidget(option.type);
                onClose();
              }}
            >
              <div className="bg-secondary rounded-full p-3 mb-3">
                {option.icon}
              </div>
              <h3 className="font-medium text-sm mb-1">{option.name}</h3>
              <p className="text-xs text-muted-foreground">{option.description}</p>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WidgetAddMenu;
