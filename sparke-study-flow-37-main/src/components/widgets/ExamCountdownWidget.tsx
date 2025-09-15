
import { Calendar } from "lucide-react";
import { GridWidget, GridWidgetProps } from "./GridWidget";
import { GridWidgetData } from "../WidgetGrid";

// Define widget-specific data properties
export interface ExamCountdownData {
  title: string;
  date: string;
  daysLeft: number;
}

// Combined props type
export interface ExamCountdownWidgetProps extends Omit<GridWidgetProps, 'children' | 'widget'> {
  widget: GridWidgetData & { data: ExamCountdownData };
  onDragStart: (e: React.MouseEvent) => void;
  isDragging: boolean;
}

const ExamCountdownWidget = (props: ExamCountdownWidgetProps) => {
  const { widget } = props;
  const { data } = widget;

  return (
    <GridWidget {...props} className="exam-countdown-widget">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="font-medium text-base">{data?.title || "Exam"}</h3>
        </div>
        <span className="text-sm text-muted-foreground">{data?.date || "No date set"}</span>
      </div>
      
      <div className="mt-8 text-center">
        <div className="text-6xl font-serif font-medium text-foreground">{data?.daysLeft !== undefined ? data.daysLeft : "--"}</div>
        <div className="text-sm text-muted-foreground mt-2 font-medium">days remaining</div>
      </div>
    </GridWidget>
  );
};

export default ExamCountdownWidget;
