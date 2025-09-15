import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { WidgetData, WidgetType } from './WidgetBoard';
import { GridWidget } from './widgets/GridWidget';
import StickyNoteWidget from './widgets/StickyNoteWidget';
import ResourceLinkWidget from './widgets/ResourceLinkWidget';
import TodoListWidget from './widgets/TodoListWidget';
import ProgressWidget from './widgets/ProgressWidget';
import ExamCountdownWidget from './widgets/ExamCountdownWidget';
import TasksWidget from './widgets/TasksWidget';
import StudyTipsWidget from './widgets/StudyTipsWidget';
import { Edit } from 'lucide-react';

export type GridPosition = {
  row: number;
  col: number;
  width: number;
  height: number;
};

export interface GridWidgetData {
  id: string;
  type: WidgetType | 'progress' | 'exam-countdown' | 'tasks' | 'study-tips';
  position: { x: number; y: number };
  gridPosition: GridPosition;
  data: any; // This will be typed further in each widget component
}

interface WidgetGridProps {
  widgets: GridWidgetData[];
  editMode: boolean;
  onUpdateWidget: (updatedWidget: GridWidgetData) => void;
  onDeleteWidget: (widgetId: string) => void;
  className?: string;
}

const WidgetGrid = ({ 
  widgets, 
  editMode, 
  onUpdateWidget, 
  onDeleteWidget, 
  className 
}: WidgetGridProps) => {
  const [resizingWidget, setResizingWidget] = useState<string | null>(null);
  const [movingWidget, setMovingWidget] = useState<string | null>(null);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const [initialPosition, setInitialPosition] = useState<GridPosition | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Grid configuration
  const gridColumns = 12;
  const gridRows = 12;
  const cellSize = 60; // px

  const handleWidgetUpdate = (updatedWidget: GridWidgetData) => {
    onUpdateWidget(updatedWidget);
  };

  const handleWidgetDelete = (widgetId: string) => {
    onDeleteWidget(widgetId);
  };

  const handleMouseDown = (widgetId: string, position: GridPosition, event: React.MouseEvent) => {
    if (editMode) {
      // Calculate mouse offset from widget origin
      const widget = widgets.find(w => w.id === widgetId);
      if (widget) {
        setInitialPosition(position);
        
        if (gridRef.current) {
          const gridRect = gridRef.current.getBoundingClientRect();
          const mouseX = event.clientX - gridRect.left;
          const mouseY = event.clientY - gridRect.top;
          
          // Calculate the offset from the top-left corner of the widget
          const widgetLeft = (position.col - 1) * cellSize;
          const widgetTop = (position.row - 1) * cellSize;
          
          setMouseOffset({
            x: mouseX - widgetLeft,
            y: mouseY - widgetTop
          });
        }
      }
    }
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (movingWidget && editMode && gridRef.current) {
      const widget = widgets.find(w => w.id === movingWidget);
      if (!widget || !initialPosition) return;
      
      const gridRect = gridRef.current.getBoundingClientRect();
      const mouseX = event.clientX - gridRect.left - mouseOffset.x;
      const mouseY = event.clientY - gridRect.top - mouseOffset.y;
      
      // Calculate grid position
      let newCol = Math.max(1, Math.min(gridColumns - widget.gridPosition.width + 1, Math.round(mouseX / cellSize) + 1));
      let newRow = Math.max(1, Math.min(gridRows - widget.gridPosition.height + 1, Math.round(mouseY / cellSize) + 1));
      
      handleWidgetMove(movingWidget, {
        col: newCol,
        row: newRow,
        width: widget.gridPosition.width,
        height: widget.gridPosition.height
      });
    } else if (resizingWidget && editMode && gridRef.current) {
      const widget = widgets.find(w => w.id === resizingWidget);
      if (!widget || !initialPosition) return;
      
      const gridRect = gridRef.current.getBoundingClientRect();
      const mouseX = event.clientX - gridRect.left;
      const mouseY = event.clientY - gridRect.top;
      
      // Calculate new width and height based on mouse position
      const startCol = widget.gridPosition.col;
      const startRow = widget.gridPosition.row;
      
      const mouseCol = Math.floor(mouseX / cellSize) + 1;
      const mouseRow = Math.floor(mouseY / cellSize) + 1;
      
      // Calculate new width and height
      const newWidth = Math.max(2, Math.min(gridColumns - startCol + 1, mouseCol - startCol + 1));
      const newHeight = Math.max(2, Math.min(gridRows - startRow + 1, mouseRow - startRow + 1));
      
      handleWidgetMove(resizingWidget, {
        col: startCol,
        row: startRow,
        width: newWidth,
        height: newHeight
      });
    }
  };

  const handleMouseUp = () => {
    if (movingWidget || resizingWidget) {
      setMovingWidget(null);
      setResizingWidget(null);
      setInitialPosition(null);
    }
  };

  useEffect(() => {
    if (editMode) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [editMode, movingWidget, resizingWidget, mouseOffset, initialPosition]);

  const handleWidgetMove = (widgetId: string, position: GridPosition) => {
    const widget = widgets.find(w => w.id === widgetId);
    if (widget) {
      const updatedWidget = {
        ...widget,
        gridPosition: position
      };
      onUpdateWidget(updatedWidget as GridWidgetData);
    }
  };

  const renderWidget = (widget: GridWidgetData) => {
    const { gridPosition } = widget;
    const style = {
      gridColumnStart: gridPosition.col,
      gridColumnEnd: gridPosition.col + gridPosition.width,
      gridRowStart: gridPosition.row,
      gridRowEnd: gridPosition.row + gridPosition.height,
    };

    const isMoving = movingWidget === widget.id;
    const isResizing = resizingWidget === widget.id;

    // We'll create specific adapter functions for each widget type to handle type conversion
    const handleWidgetUpdate = (updatedWidget: GridWidgetData) => {
      onUpdateWidget(updatedWidget);
    };

    return (
      <div 
        style={style} 
        className={cn(
          "relative p-2 transition-all duration-200",
          editMode && "z-10",
          isMoving && "z-50",
          isResizing && "z-50"
        )}
        key={widget.id}
      >
        {(() => {
          switch (widget.type) {
            case 'sticky-note':
              return (
                <StickyNoteWidget 
                  widget={widget}
                  onDelete={() => handleWidgetDelete(widget.id)}
                  onDragStart={(e) => {
                    if (editMode) {
                      setMovingWidget(widget.id);
                      handleMouseDown(widget.id, widget.gridPosition, e);
                    }
                  }}
                  onUpdate={handleWidgetUpdate}
                  isDragging={isMoving}
                  isEditMode={editMode}
                />
              );
            case 'resource-link':
              return (
                <ResourceLinkWidget 
                  widget={widget}
                  onDelete={() => handleWidgetDelete(widget.id)}
                  onDragStart={(e) => {
                    if (editMode) {
                      setMovingWidget(widget.id);
                      handleMouseDown(widget.id, widget.gridPosition, e);
                    }
                  }}
                  onUpdate={handleWidgetUpdate}
                  isDragging={isMoving}
                  isEditMode={editMode}
                />
              );
            case 'todo-list':
              return (
                <TodoListWidget 
                  widget={widget}
                  onDelete={() => handleWidgetDelete(widget.id)}
                  onDragStart={(e) => {
                    if (editMode) {
                      setMovingWidget(widget.id);
                      handleMouseDown(widget.id, widget.gridPosition, e);
                    }
                  }}
                  onUpdate={handleWidgetUpdate}
                  isDragging={isMoving}
                  isEditMode={editMode}
                />
              );
            case 'progress':
              return <ProgressWidget 
                widget={widget} 
                onDragStart={(e) => {
                  if (editMode) {
                    setMovingWidget(widget.id);
                    handleMouseDown(widget.id, widget.gridPosition, e);
                  }
                }} 
                isDragging={isMoving} 
                onUpdate={handleWidgetUpdate}
                onDelete={() => handleWidgetDelete(widget.id)}
                editMode={editMode}
                isMoving={isMoving}
                isResizing={isResizing}
                onMove={(position) => handleWidgetMove(widget.id, position)}
                onResize={(position) => handleWidgetMove(widget.id, position)}
                setMoving={(isMoving) => setMovingWidget(isMoving ? widget.id : null)}
                setResizing={(isResizing) => setResizingWidget(isResizing ? widget.id : null)}
              />;
            case 'exam-countdown':
              return <ExamCountdownWidget 
                widget={widget} 
                onDragStart={(e) => {
                  if (editMode) {
                    setMovingWidget(widget.id);
                    handleMouseDown(widget.id, widget.gridPosition, e);
                  }
                }}
                isDragging={isMoving} 
                onUpdate={handleWidgetUpdate}
                onDelete={() => handleWidgetDelete(widget.id)}
                editMode={editMode}
                isMoving={isMoving}
                isResizing={isResizing}
                onMove={(position) => handleWidgetMove(widget.id, position)}
                onResize={(position) => handleWidgetMove(widget.id, position)}
                setMoving={(isMoving) => setMovingWidget(isMoving ? widget.id : null)}
                setResizing={(isResizing) => setResizingWidget(isResizing ? widget.id : null)}
              />;
            case 'tasks':
              return <TasksWidget 
                widget={widget} 
                onDragStart={(e) => {
                  if (editMode) {
                    setMovingWidget(widget.id);
                    handleMouseDown(widget.id, widget.gridPosition, e);
                  }
                }}
                isDragging={isMoving} 
                onUpdate={handleWidgetUpdate}
                onDelete={() => handleWidgetDelete(widget.id)}
                editMode={editMode}
                isMoving={isMoving}
                isResizing={isResizing}
                onMove={(position) => handleWidgetMove(widget.id, position)}
                onResize={(position) => handleWidgetMove(widget.id, position)}
                setMoving={(isMoving) => setMovingWidget(isMoving ? widget.id : null)}
                setResizing={(isResizing) => setResizingWidget(isResizing ? widget.id : null)}
              />;
            case 'study-tips':
              return <StudyTipsWidget 
                widget={widget} 
                onDragStart={(e) => {
                  if (editMode) {
                    setMovingWidget(widget.id);
                    handleMouseDown(widget.id, widget.gridPosition, e);
                  }
                }}
                isDragging={isMoving} 
                onUpdate={handleWidgetUpdate}
                onDelete={() => handleWidgetDelete(widget.id)}
                editMode={editMode}
                isMoving={isMoving}
                isResizing={isResizing}
                onMove={(position) => handleWidgetMove(widget.id, position)}
                onResize={(position) => handleWidgetMove(widget.id, position)}
                setMoving={(isMoving) => setMovingWidget(isMoving ? widget.id : null)}
                setResizing={(isResizing) => setResizingWidget(isResizing ? widget.id : null)}
              />;
            default:
              return null;
          }
        })()}
      </div>
    );
  };

  // Calculate the grid template areas for visualizing empty spots in edit mode
  const gridTemplateAreas = [];
  for (let row = 1; row <= gridRows; row++) {
    const rowAreas = [];
    for (let col = 1; col <= gridColumns; col++) {
      rowAreas.push(`"area-${row}-${col}"`);
    }
    gridTemplateAreas.push(rowAreas.join(' '));
  }

  return (
    <div
      ref={gridRef}
      className={cn(
        'relative bg-background rounded-xl border-0 overflow-hidden',
        editMode && 'bg-secondary/10',
        className
      )}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gridColumns}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${gridRows}, ${cellSize}px)`,
        minHeight: `${gridRows * cellSize}px`,
      }}
    >
      {/* Grid lines (only visible in edit mode) */}
      {editMode && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="w-full h-full grid" style={{ 
            gridTemplateColumns: `repeat(${gridColumns}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${gridRows}, ${cellSize}px)`
          }}>
            {Array.from({ length: gridColumns * gridRows }).map((_, index) => {
              const row = Math.floor(index / gridColumns) + 1;
              const col = (index % gridColumns) + 1;
              return (
                <div
                  key={`cell-${row}-${col}`}
                  className="border border-dashed border-primary/10"
                  style={{ gridRow: row, gridColumn: col }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Widgets */}
      {widgets.map(renderWidget)}

      {/* Empty state */}
      {widgets.length === 0 && (
        <div className="col-span-full row-span-full flex flex-col items-center justify-center text-center p-6">
          <div className="bg-secondary/20 rounded-full p-6 mb-4">
            <Edit className="h-10 w-10 text-muted-foreground opacity-50" />
          </div>
          <h3 className="text-lg font-medium mb-2">Customize your Overview</h3>
          <p className="text-muted-foreground max-w-md">
            {editMode 
              ? "Click the \"Add Widget\" button to create widgets like Exam Countdowns, Task Lists, or Progress Trackers."
              : "Click 'Edit Layout' to customize your dashboard with widgets like Exam Countdowns, Task Lists, or Progress Trackers."}
          </p>
        </div>
      )}
    </div>
  );
};

export default WidgetGrid;
