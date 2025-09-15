
import { useState } from "react";
import { Plus, Brain, LayoutGrid, Calendar, Info, CheckCheck, Play, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { generateId } from "@/lib/utils";
import StudySessionToggle from "@/components/StudySessionToggle";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: string;
  text: string;
  completed: boolean;
  isAiSuggested: boolean;
  dueDate: Date | null;
  priority: "low" | "medium" | "high";
}

const initialTasks: Task[] = [
  {
    id: generateId(),
    text: "Review chapters 3-4 on advanced data structures",
    completed: false,
    isAiSuggested: true,
    dueDate: new Date(new Date().setDate(new Date().getDate() + 2)),
    priority: "high"
  },
  {
    id: generateId(),
    text: "Complete algorithm complexity assignment",
    completed: false,
    isAiSuggested: false,
    dueDate: new Date(new Date().setDate(new Date().getDate() + 5)),
    priority: "high"
  },
  {
    id: generateId(),
    text: "Study for midterm quiz on sorting algorithms",
    completed: false,
    isAiSuggested: false,
    dueDate: new Date(new Date().setDate(new Date().getDate() + 7)),
    priority: "medium"
  },
  {
    id: generateId(),
    text: "Watch lecture on binary trees",
    completed: true,
    isAiSuggested: true,
    dueDate: new Date(new Date().setDate(new Date().getDate() - 1)),
    priority: "medium"
  }
];

const StudyPlannerContent = ({ subjectName }: { subjectName: string }) => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const { toast } = useToast();

  const formatDate = (date: Date | null): string => {
    if (!date) return "No due date";
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);
    
    if (taskDate.getTime() === today.getTime()) return "Today";
    if (taskDate.getTime() === tomorrow.getTime()) return "Tomorrow";
    
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric",
      weekday: "short" 
    });
  };

  const toggleTask = (taskId: string) => {
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);
    
    // Find the task that was toggled
    const toggledTask = tasks.find(task => task.id === taskId);
    if (toggledTask && !toggledTask.completed) {
      toast({
        title: "Task completed",
        description: `${toggledTask.text} marked as completed.`
      });
    }
  };

  const addNewTask = () => {
    if (!newTask.trim()) return;
    
    const task: Task = {
      id: generateId(),
      text: newTask,
      completed: false,
      isAiSuggested: false,
      dueDate: selectedDate || null,
      priority: "medium"
    };
    
    setTasks([...tasks, task]);
    setNewTask("");
    setIsAddingTask(false);
    setSelectedDate(new Date());
    
    toast({
      title: "Task added",
      description: "New task has been added to your study plan."
    });
  };

  const deleteTask = (taskId: string) => {
    const taskToDelete = tasks.find(task => task.id === taskId);
    setTasks(tasks.filter(task => task.id !== taskId));
    
    if (taskToDelete) {
      toast({
        title: "Task deleted",
        description: `"${taskToDelete.text}" has been removed from your plan.`
      });
    }
  };

  const startFocusedSession = () => {
    toast({
      title: "Study session started",
      description: `Focus mode activated for ${subjectName}.`
    });
  };

  // Filter tasks for better organization
  const pendingTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);

  // Tasks recommended by AI
  const aiRecommendations = tasks.filter(task => task.isAiSuggested && !task.completed);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif">{subjectName} Study Plan</h2>
          <p className="text-muted-foreground mt-1">Manage your tasks and study sessions for this subject</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowCalendar(!showCalendar)}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            <span>Calendar</span>
          </Button>
          <StudySessionToggle />
        </div>
      </div>

      {showCalendar && (
        <div className="bg-white rounded-lg border border-border p-4 shadow-sm flex justify-center animate-fade-in">
          <CalendarComponent
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border"
          />
        </div>
      )}

      {/* AI Recommendations */}
      {aiRecommendations.length > 0 && (
        <div className="bg-white rounded-lg border border-border p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary/80" />
              <h3 className="font-medium text-lg">AI Recommendations</h3>
            </div>
          </div>
          
          <div className="space-y-1">
            {aiRecommendations.map((task) => (
              <div key={task.id} className="task-item border-b border-border py-3 last:border-0">
                <button
                  onClick={() => toggleTask(task.id)}
                  className={cn(
                    "mt-0.5 h-5 w-5 rounded-full border flex items-center justify-center flex-shrink-0",
                    task.completed 
                      ? "bg-primary border-primary text-primary-foreground" 
                      : "border-muted-foreground/30 hover:border-primary/50"
                  )}
                >
                  {task.completed && <CheckCheck className="h-3 w-3" />}
                </button>
                
                <div className="flex-1">
                  <p className={cn(
                    "text-sm", 
                    task.completed && "line-through text-muted-foreground"
                  )}>
                    {task.text}
                  </p>
                  
                  <div className="flex items-center gap-1.5 mt-1">
                    <Brain className="h-3 w-3 text-primary/70" />
                    <span className="text-xs text-muted-foreground">
                      AI suggested based on your course progress
                    </span>
                  </div>
                </div>
                
                <div className="ml-auto flex flex-col items-end gap-1">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary/90">
                    {task.priority}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(task.dueDate)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Button 
              onClick={startFocusedSession} 
              className="w-full gap-2"
            >
              <Play className="h-4 w-4" />
              Start Focused Practice Session
            </Button>
          </div>
        </div>
      )}

      {/* My Tasks */}
      <div className="bg-white rounded-lg border border-border p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-lg">Tasks & Deadlines</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs h-8 gap-1"
            onClick={() => setIsAddingTask(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Task</span>
          </Button>
        </div>
        
        {/* Task add form */}
        {isAddingTask && (
          <div className="mb-4 p-3 border border-border rounded-md bg-secondary/30 animate-fade-in">
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Enter task description..."
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
              />
              
              <div className="flex items-center justify-between gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="text-xs"
                >
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                  {selectedDate ? formatDate(selectedDate) : "Set due date"}
                </Button>
                
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsAddingTask(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={addNewTask}
                  >
                    Add Task
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Pending tasks */}
        {pendingTasks.filter(task => !task.isAiSuggested).length === 0 ? (
          <div className="py-8 text-center">
            <Info className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground">No pending tasks for this subject</p>
            <Button 
              variant="link" 
              className="mt-2"
              onClick={() => setIsAddingTask(true)}
            >
              Add your first task
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {pendingTasks
              .filter(task => !task.isAiSuggested)
              .map((task) => (
                <div key={task.id} className="task-item py-3">
                  <button
                    onClick={() => toggleTask(task.id)}
                    className={cn(
                      "mt-0.5 h-5 w-5 rounded-full border flex items-center justify-center flex-shrink-0",
                      task.completed 
                        ? "bg-primary border-primary text-primary-foreground" 
                        : "border-muted-foreground/30 hover:border-primary/50"
                    )}
                  >
                    {task.completed && <CheckCheck className="h-3 w-3" />}
                  </button>
                  
                  <div className="flex-1">
                    <p className={cn(
                      "text-sm", 
                      task.completed && "line-through text-muted-foreground"
                    )}>
                      {task.text}
                    </p>
                  </div>
                  
                  <div className="ml-auto flex flex-col items-end gap-1">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                      {task.priority}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(task.dueDate)}
                    </span>
                  </div>
                  
                  <div className="ml-2 flex items-center">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Edit className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={() => deleteTask(task.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))
            }
          </div>
        )}
        
        {/* Completed tasks */}
        {completedTasks.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border">
            <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
              <CheckCheck className="h-4 w-4 mr-1" />
              Completed ({completedTasks.length})
            </h4>
            
            <div className="space-y-1">
              {completedTasks.map((task) => (
                <div key={task.id} className="task-item opacity-60 py-2">
                  <button
                    onClick={() => toggleTask(task.id)}
                    className="mt-0.5 h-5 w-5 rounded-full border flex items-center justify-center flex-shrink-0 bg-primary border-primary text-primary-foreground"
                  >
                    <CheckCheck className="h-3 w-3" />
                  </button>
                  
                  <div className="flex-1">
                    <p className="text-sm line-through text-muted-foreground">
                      {task.text}
                    </p>
                  </div>
                  
                  <div className="ml-auto">
                    <button 
                      className="text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => deleteTask(task.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Link to main planner */}
      <div className="flex justify-center">
        <Button variant="outline" size="sm" className="gap-2">
          <LayoutGrid className="h-4 w-4" />
          View Full Calendar
        </Button>
      </div>
    </div>
  );
};

export default StudyPlannerContent;
