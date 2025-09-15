
import { Progress } from "@/components/ui/progress";
import { GridWidget, GridWidgetProps } from "./GridWidget";
import { BarChart2 } from "lucide-react";
import { GridWidgetData } from "../WidgetGrid";

// Define widget-specific data properties
export interface ProgressWidgetData {
  title: string;
  topics: {
    name: string;
    progress: number;
  }[];
}

// Combined props type
export interface ProgressWidgetProps extends Omit<GridWidgetProps, 'children' | 'widget'> {
  widget: GridWidgetData & { data: ProgressWidgetData };
  onDragStart: (e: React.MouseEvent) => void;
  isDragging: boolean;
}

const ProgressWidget = (props: ProgressWidgetProps) => {
  const { widget } = props;
  const { data } = widget;
  
  // Ensure topics exists with a default empty array
  const topics = data?.topics || [];

  return (
    <GridWidget {...props} className="progress-widget">
      <div className="flex items-center gap-2.5 mb-5">
        <BarChart2 className="h-5 w-5 text-primary" />
        <h3 className="font-medium text-base">{data?.title || "Recent Topics"}</h3>
      </div>
      
      <div className="space-y-5">
        {topics.map((topic, index) => (
          <div key={index} className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{topic.name}</span>
              <span className="text-xs text-muted-foreground font-medium">{topic.progress}%</span>
            </div>
            <Progress value={topic.progress} className="h-2.5 rounded-full bg-secondary/50" />
          </div>
        ))}
        
        {topics.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-6">
            No topics available
          </div>
        )}
      </div>
    </GridWidget>
  );
};

export default ProgressWidget;
