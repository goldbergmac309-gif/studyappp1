
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WidgetBoardEditModeProps {
  onEditModeChange: (isEditing: boolean) => void;
  isEditMode: boolean;
  onAddWidgetClick: () => void;
}

const WidgetBoardEditMode = ({ 
  onEditModeChange, 
  isEditMode, 
  onAddWidgetClick 
}: WidgetBoardEditModeProps) => {
  
  const toggleEditMode = () => {
    onEditModeChange(!isEditMode);
  };

  return (
    <div className="flex justify-between mb-4">
      <h2 className="text-xl font-serif">Dashboard Overview</h2>
      <div className="flex gap-2">
        {isEditMode && (
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5"
            onClick={onAddWidgetClick}
          >
            <Plus className="h-4 w-4" />
            <span>Add Widget</span>
          </Button>
        )}
        
        <Button
          variant={isEditMode ? "default" : "outline"}
          size="sm"
          className={cn(
            "gap-1.5",
            isEditMode ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          )}
          onClick={toggleEditMode}
        >
          {isEditMode ? (
            <>
              <Check className="h-4 w-4" />
              <span>Done</span>
            </>
          ) : (
            <>
              <Edit className="h-4 w-4" />
              <span>Edit Layout</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default WidgetBoardEditMode;
