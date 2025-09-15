
import { useState } from "react";
import { Check, Clock, Brain, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  completed: boolean;
  isAiSuggested: boolean;
};

const TaskList = () => {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "1",
      title: "Review calculus chapter 3 notes",
      completed: false,
      isAiSuggested: true
    },
    {
      id: "2",
      title: "Complete physics lab report",
      completed: false,
      isAiSuggested: false
    },
    {
      id: "3",
      title: "Prepare for history quiz",
      completed: false,
      isAiSuggested: false
    },
    {
      id: "4",
      title: "Practice French vocabulary",
      completed: true,
      isAiSuggested: true
    }
  ]);

  const toggleTask = (id: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  return (
    <div className="border rounded-lg bg-white shadow-subtle p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Study Tasks</h3>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Plus className="h-4 w-4" />
          <span className="sr-only">Add task</span>
        </Button>
      </div>

      <div className="space-y-1">
        {tasks.map((task) => (
          <div key={task.id} className="task-item">
            <button
              className={cn(
                "flex-shrink-0 h-5 w-5 rounded-full border flex items-center justify-center",
                task.completed ? "bg-primary border-primary" : "border-muted"
              )}
              onClick={() => toggleTask(task.id)}
            >
              {task.completed && <Check className="h-3 w-3 text-white" />}
            </button>

            <div className="flex-1">
              <p className={cn(
                "text-sm",
                task.completed ? "line-through text-muted-foreground" : ""
              )}>
                {task.title}
              </p>
              
              {task.isAiSuggested && !task.completed && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Brain className="h-3 w-3" />
                  <span>AI suggested</span>
                </div>
              )}
            </div>
            
            {!task.completed && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                <span>Today</span>
              </Button>
            )}
          </div>
        ))}
      </div>

      {tasks.some(task => task.completed) && (
        <div className="mt-4 pt-3 border-t">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Completed</h4>
          <div className="space-y-1">
            {tasks.filter(task => task.completed).map((task) => (
              <div key={task.id} className="task-item">
                <button
                  className="flex-shrink-0 h-5 w-5 rounded-full border border-primary bg-primary flex items-center justify-center"
                  onClick={() => toggleTask(task.id)}
                >
                  <Check className="h-3 w-3 text-white" />
                </button>
                
                <div className="flex-1">
                  <p className="text-sm line-through text-muted-foreground">
                    {task.title}
                  </p>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="opacity-0 group-hover:opacity-100 h-6 px-2"
                  onClick={() => {
                    // In a real app, this would permanently remove the task
                    setTasks(tasks.filter(t => t.id !== task.id));
                  }}
                >
                  <span className="text-xs text-muted-foreground">Remove</span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;
