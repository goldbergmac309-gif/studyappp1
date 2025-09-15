
import { Clock, BarChart, Calendar, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const StatsCard = ({
  icon,
  value,
  label,
  trend
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  trend?: {
    value: string;
    positive: boolean;
  };
}) => {
  return (
    <div className="bg-white rounded-lg p-4 shadow-subtle hover-trigger">
      <div className="flex justify-between">
        <div className="text-muted-foreground">{icon}</div>
        {trend && (
          <span className={cn(
            "text-xs font-medium flex items-center",
            trend.positive ? "text-green-600" : "text-red-600"
          )}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      <div className="mt-2">
        <div className="text-2xl font-medium">{value}</div>
        <div className="text-sm text-muted-foreground mt-1">{label}</div>
      </div>
      
      {/* Hover content that appears after delay */}
      <div className="hover-content bg-white rounded-lg p-3 shadow-lift border border-border w-full">
        {label === "Study time this week" && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Monday</span>
              <span className="font-medium">2.5h</span>
            </div>
            <div className="flex justify-between">
              <span>Tuesday</span>
              <span className="font-medium">3h</span>
            </div>
            <div className="flex justify-between">
              <span>Wednesday</span>
              <span className="font-medium">4h</span>
            </div>
            <div className="flex justify-between">
              <span>Thursday</span>
              <span className="font-medium">2h</span>
            </div>
            <div className="flex justify-between">
              <span>Friday</span>
              <span className="font-medium">3h</span>
            </div>
          </div>
        )}
        
        {label === "Completion rate" && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Mathematics</span>
              <span className="font-medium">92%</span>
            </div>
            <div className="flex justify-between">
              <span>Physics</span>
              <span className="font-medium">85%</span>
            </div>
            <div className="flex justify-between">
              <span>Biology</span>
              <span className="font-medium">78%</span>
            </div>
            <div className="flex justify-between">
              <span>Computer Science</span>
              <span className="font-medium">95%</span>
            </div>
          </div>
        )}
        
        {label === "Subjects improved" && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Physics</span>
              <span className="font-medium">+15%</span>
            </div>
            <div className="flex justify-between">
              <span>Biology</span>
              <span className="font-medium">+8%</span>
            </div>
            <div className="flex justify-between">
              <span>Mathematics</span>
              <span className="font-medium">+5%</span>
            </div>
          </div>
        )}
        
        {label === "Upcoming deadlines" && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Physics Lab Report</span>
              <span className="font-medium">Apr 19</span>
            </div>
            <div className="flex justify-between">
              <span>Biology Midterm</span>
              <span className="font-medium">Apr 21</span>
            </div>
            <div className="flex justify-between">
              <span>CS Project</span>
              <span className="font-medium">Apr 22</span>
            </div>
            <div className="flex justify-between">
              <span>Math Assignment</span>
              <span className="font-medium">Apr 23</span>
            </div>
            <div className="flex justify-between">
              <span>History Essay</span>
              <span className="font-medium">Apr 25</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DashboardStats = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatsCard 
        icon={<Clock className="h-5 w-5" />} 
        value="14.5h" 
        label="Study time this week" 
        trend={{
          value: "2.5h",
          positive: true
        }} 
      />
      
      <StatsCard 
        icon={<Zap className="h-5 w-5" />} 
        value="87%" 
        label="Completion rate" 
        trend={{
          value: "3%",
          positive: true
        }}
      />
      
      <StatsCard 
        icon={<BarChart className="h-5 w-5" />} 
        value="3" 
        label="Subjects improved"
      />
      
      <StatsCard 
        icon={<Calendar className="h-5 w-5" />} 
        value="5" 
        label="Upcoming deadlines" 
      />
    </div>
  );
};

export default DashboardStats;
