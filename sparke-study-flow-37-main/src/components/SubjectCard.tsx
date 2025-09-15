
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import SubjectContextMenu from "./SubjectContextMenu";

type SubjectCardProps = {
  id?: string;
  name: string;
  color: string;
  progress?: number;
  tasks?: number;
  nextSession?: string;
};

const SubjectCard = ({ id = "0", name, color, progress = 0, tasks = 0, nextSession }: SubjectCardProps) => {
  return (
    <div 
      className="study-card group cursor-pointer animate-fade-in"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div className="flex items-start justify-between">
        <h4 className="font-medium">{name}</h4>
        <SubjectContextMenu subjectId={id} subjectName={name} />
      </div>

      {progress > 0 && (
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full" 
              style={{ width: `${progress}%`, backgroundColor: color }}
            ></div>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-sm">
        {tasks > 0 && (
          <span className="text-muted-foreground">
            {tasks} task{tasks !== 1 ? 's' : ''}
          </span>
        )}
        
        {nextSession && (
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full",
            "bg-secondary/70 text-muted-foreground"
          )}>
            {nextSession}
          </span>
        )}
      </div>
    </div>
  );
};

export default SubjectCard;
