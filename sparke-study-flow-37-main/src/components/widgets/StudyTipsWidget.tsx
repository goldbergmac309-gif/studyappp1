
import { Lightbulb } from "lucide-react";
import { GridWidget, GridWidgetProps } from "./GridWidget";
import { GridWidgetData } from "../WidgetGrid";

// Define widget-specific data properties
export interface StudyTipsData {
  title: string;
  tip: string;
  source: string;
}

// Combined props type
export interface StudyTipsWidgetProps extends Omit<GridWidgetProps, 'children' | 'widget'> {
  widget: GridWidgetData & { data: StudyTipsData };
  onDragStart: (e: React.MouseEvent) => void;
  isDragging: boolean;
}

const StudyTipsWidget = (props: StudyTipsWidgetProps) => {
  const { widget } = props;
  const { data } = widget;

  return (
    <GridWidget {...props} className="study-tips-widget">
      <div className="flex items-center gap-2.5 mb-4">
        <Lightbulb className="h-5 w-5 text-primary" />
        <h3 className="font-medium text-base">{data?.title || "Study Tip"}</h3>
      </div>
      
      <div className="space-y-4">
        <p className="text-sm leading-relaxed">{data?.tip || "No tip available"}</p>
        <p className="text-xs text-muted-foreground font-medium italic">— {data?.source || "Spark.E"}</p>
      </div>
    </GridWidget>
  );
};

export default StudyTipsWidget;
