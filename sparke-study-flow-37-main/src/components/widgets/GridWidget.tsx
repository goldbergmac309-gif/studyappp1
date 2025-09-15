
import { useState } from 'react';
import { MoreVertical, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GridWidgetData, GridPosition } from '../WidgetGrid';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface GridWidgetProps {
  widget: GridWidgetData;
  editMode: boolean;
  isMoving: boolean;
  isResizing: boolean;
  onMove: (position: GridPosition) => void;
  onResize: (position: GridPosition) => void;
  onUpdate: (updatedWidget: GridWidgetData) => void;
  onDelete: () => void;
  setMoving: (isMoving: boolean) => void;
  setResizing: (isResizing: boolean) => void;
  children?: React.ReactNode;
  className?: string;
  onDragStart: (e: React.MouseEvent) => void;
  isDragging: boolean;
}

export const GridWidget = ({
  widget,
  editMode,
  isMoving,
  isResizing,
  onMove,
  onResize,
  onUpdate,
  onDelete,
  setMoving,
  setResizing,
  children,
  className,
  onDragStart,
  isDragging,
}: GridWidgetProps) => {
  const [showControls, setShowControls] = useState(false);

  return (
    <div
      className={cn(
        "h-full rounded-xl transition-all duration-200",
        editMode 
          ? "border border-muted bg-card/95" 
          : "bg-card shadow-lift border-0",
        (isMoving || isResizing || isDragging) && "ring-2 ring-primary ring-opacity-50",
        className
      )}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Widget Header - now more subtle */}
      <div className={cn(
        "flex items-center justify-between px-3 h-9 rounded-t-xl transition-colors",
        editMode ? "bg-muted/50" : "bg-transparent"
      )}>
        {/* Widget Controls */}
        <div className={cn(
          "flex items-center gap-1 ml-auto",
          !editMode && !showControls && "opacity-0",
          "transition-opacity"
        )}>
          {editMode && (
            <div 
              className="cursor-move p-1.5 rounded hover:bg-black/5"
              onMouseDown={(e) => {
                e.stopPropagation();
                onDragStart(e);
                setMoving(true);
              }}
            >
              <GripVertical size={14} className="text-muted-foreground" />
            </div>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical size={14} className="text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {/* Widget-specific actions will be added by child components */}
              {editMode && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="text-destructive">
                    Remove Widget
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Widget Content */}
      <div className="p-5">
        {children}
      </div>

      {/* Resize handle (only in edit mode) - made more visible */}
      {editMode && (
        <div 
          className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize"
          onMouseDown={(e) => {
            e.stopPropagation();
            setResizing(true);
          }}
        >
          <div className="absolute bottom-2 right-2 w-3 h-3 bg-primary/70 rounded-sm" />
        </div>
      )}
    </div>
  );
};
