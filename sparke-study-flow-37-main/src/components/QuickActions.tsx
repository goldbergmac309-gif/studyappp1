
import { useState } from "react";
import { BarChart2, BookOpen, CalendarDays, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type QuickActionProps = {
  icon: React.ReactNode;
  title: string;
  isHighlighted?: boolean;
  details?: React.ReactNode;
};

const QuickAction = ({ icon, title, isHighlighted, details }: QuickActionProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const handleMouseEnter = () => {
    const timeout = setTimeout(() => {
      setIsHovered(true);
    }, 1500); // 1.5 second delay
    
    setHoverTimeout(timeout);
  };
  
  const handleMouseLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    setIsHovered(false);
  };
  
  return (
    <div className="relative hover-trigger">
      <div 
        className={cn(
          "flex items-center gap-3 py-3 px-4 bg-white rounded-lg border border-border hover:border-gray-900/30 transition-all cursor-pointer",
          isHighlighted && "border-gray-900/30"
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="text-gray-900">
          {icon}
        </div>
        <span className="text-sm font-medium">{title}</span>
        {isHighlighted && (
          <span className="ml-auto text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full">Ad</span>
        )}
      </div>
      
      {isHovered && details && (
        <div 
          className="hover-content bg-white border border-border p-3 rounded-lg shadow-md"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {details}
        </div>
      )}
    </div>
  );
};

const LearningInsightsDetails = () => (
  <div className="space-y-2">
    <h4 className="text-sm font-medium">Recent Progress</h4>
    <ul className="text-xs space-y-1.5 text-muted-foreground">
      <li className="flex justify-between">
        <span>Physics concepts</span>
        <span className="font-medium text-green-600">+12%</span>
      </li>
      <li className="flex justify-between">
        <span>Math practice</span>
        <span className="font-medium text-green-600">+8%</span>
      </li>
      <li className="flex justify-between">
        <span>Biology quiz scores</span>
        <span className="font-medium text-amber-600">-3%</span>
      </li>
    </ul>
  </div>
);

const BiologyMidtermDetails = () => (
  <div className="space-y-2">
    <h4 className="text-sm font-medium">Biology Midterm</h4>
    <ul className="text-xs space-y-1.5 text-muted-foreground">
      <li className="flex items-center gap-1.5">
        <CalendarDays className="h-3 w-3" />
        <span>April 22, 2025</span>
      </li>
      <li className="flex items-center gap-1.5">
        <Clock className="h-3 w-3" />
        <span>9:00 AM - 11:00 AM</span>
      </li>
      <li>Room B201</li>
      <li className="text-primary font-medium mt-1">3 days left to prepare</li>
    </ul>
  </div>
);

const TodayClassesDetails = () => (
  <div className="space-y-2">
    <h4 className="text-sm font-medium">Today's Schedule</h4>
    <ul className="text-xs space-y-1.5 text-muted-foreground">
      <li className="flex justify-between">
        <span>Physics Lab</span>
        <span>9:00 AM</span>
      </li>
      <li className="flex justify-between">
        <span>Calculus</span>
        <span>11:30 AM</span>
      </li>
      <li className="flex justify-between">
        <span>English Literature</span>
        <span>2:15 PM</span>
      </li>
      <li className="flex justify-between">
        <span>Study Group</span>
        <span>4:00 PM</span>
      </li>
    </ul>
  </div>
);

const QuickActions = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
      <QuickAction
        icon={<BarChart2 className="h-5 w-5" />}
        title="Learning Insights"
        details={<LearningInsightsDetails />}
      />
      <QuickAction
        icon={<BookOpen className="h-5 w-5" />}
        title="Next: Biology Midterm"
        isHighlighted={true}
        details={<BiologyMidtermDetails />}
      />
      <QuickAction
        icon={<CalendarDays className="h-5 w-5" />}
        title="Today's Classes"
        details={<TodayClassesDetails />}
      />
    </div>
  );
};

export default QuickActions;
