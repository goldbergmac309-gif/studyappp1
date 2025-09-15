
import { useState } from 'react';
import { CheckCircle2, Circle, Plus } from "lucide-react";
import { GridWidget, GridWidgetProps } from "./GridWidget";
import { cn } from '@/lib/utils';
import { GridWidgetData } from "../WidgetGrid";

// Define task item structure
export interface Task {
  id: string;
  text: string;
  completed: boolean;
}

// Define widget-specific data properties
export interface TasksWidgetData {
  title: string;
  tasks: Task[];
}

// Combined props type
export interface TasksWidgetProps extends Omit<GridWidgetProps, 'children' | 'widget'> {
  widget: GridWidgetData & { data: TasksWidgetData };
  onDragStart: (e: React.MouseEvent) => void;
  isDragging: boolean;
}

const TasksWidget = (props: TasksWidgetProps) => {
  const { widget, editMode, onUpdate } = props;
  const { data } = widget;
  
  // Ensure tasks exists with a default empty array
  const tasks = data?.tasks || [];

  const toggleTask = (taskId: string) => {
    if (editMode) return;
    
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    
    onUpdate({
      ...widget,
      data: {
        ...data,
        tasks: updatedTasks
      }
    });
  };

  return (
    <GridWidget {...props} className="tasks-widget">
      <div className="flex items-center gap-2.5 mb-4">
        <CheckCircle2 className="h-5 w-5 text-primary" />
        <h3 className="font-medium text-base">{data?.title || "Tasks"}</h3>
      </div>
      
      <div className="space-y-3.5">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-start gap-3">
            <button
              className="mt-0.5 flex-shrink-0"
              onClick={() => toggleTask(task.id)}
              disabled={editMode}
            >
              {task.completed ? (
                <CheckCircle2 className="h-[18px] w-[18px] text-primary" />
              ) : (
                <Circle className="h-[18px] w-[18px] text-muted-foreground" />
              )}
            </button>
            <span className={cn(
              "text-sm leading-tight",
              task.completed && "line-through text-muted-foreground"
            )}>
              {task.text}
            </span>
          </div>
        ))}
        
        {!editMode && tasks.length > 0 && (
          <button
            className="flex items-center text-xs text-muted-foreground hover:text-foreground mt-4 gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="font-medium">Add task</span>
          </button>
        )}
        
        {tasks.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4">
            No tasks available
          </div>
        )}
      </div>
    </GridWidget>
  );
};

export default TasksWidget;
