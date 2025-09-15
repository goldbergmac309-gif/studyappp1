
import React, { useState } from 'react';
import { X, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import WidgetColorPicker from './WidgetColorPicker';
import { GridWidgetData } from '../WidgetGrid';

// Define widget-specific data properties
export interface StickyNoteData {
  content: string;
  color: string;
}

// Combined props type
export interface StickyNoteWidgetProps {
  widget: GridWidgetData & { data: StickyNoteData };
  onDelete: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  onUpdate: (updatedWidget: GridWidgetData & { data: StickyNoteData }) => void;
  isDragging: boolean;
  isEditMode?: boolean;
}

const StickyNoteWidget = ({
  widget,
  onDelete,
  onDragStart,
  onUpdate,
  isDragging,
  isEditMode = false
}: StickyNoteWidgetProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(widget.data?.content || '');
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  // Handle content change
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };
  
  // Save content when focus is lost
  const handleBlur = () => {
    if (content !== widget.data?.content) {
      onUpdate({
        ...widget,
        data: {
          ...widget.data,
          content
        }
      });
    }
    setIsEditing(false);
  };

  // Handle color change
  const handleColorChange = (color: string) => {
    onUpdate({
      ...widget,
      data: {
        ...widget.data,
        color
      }
    });
    setShowColorPicker(false);
  };

  return (
    <div
      className={cn(
        'absolute p-4 w-64 h-auto min-h-[150px] rounded-md shadow-md flex flex-col transition-all',
        isDragging && 'opacity-70',
        isEditing && 'ring-2 ring-primary ring-opacity-50'
      )}
      style={{
        backgroundColor: widget.data?.color || '#FFFFFF',
        top: `${widget.position.y}px`,
        left: `${widget.position.x}px`,
        cursor: isEditMode ? 'move' : 'default',
        zIndex: isDragging ? 10 : 1
      }}
      onMouseDown={(e) => {
        if (!isEditing && e.target === e.currentTarget) {
          onDragStart(e);
        }
      }}
      onDoubleClick={() => !isEditMode && setIsEditing(true)}
    >
      {/* Widget controls - only shown in edit mode or when editing content */}
      {(isEditMode || isEditing) && (
        <div className="flex items-center justify-between mb-2">
          {isEditMode && (
            <div 
              className="cursor-move p-1 rounded hover:bg-black/5"
              onMouseDown={onDragStart}
            >
              <GripVertical size={14} />
            </div>
          )}
          
          <div className="flex gap-1 ml-auto">
            {/* Color picker button */}
            {isEditMode && (
              <button 
                className="w-4 h-4 rounded-full border border-gray-300 focus:outline-none"
                style={{ backgroundColor: widget.data?.color || '#FFFFFF' }}
                onClick={() => setShowColorPicker(!showColorPicker)}
              />
            )}
            
            {/* Delete button */}
            {isEditMode && (
              <button 
                className="p-1 rounded hover:bg-black/5 text-gray-500 hover:text-gray-700"
                onClick={onDelete}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Color picker popover */}
      {showColorPicker && (
        <div className="absolute top-10 right-0 z-10">
          <WidgetColorPicker onSelectColor={handleColorChange} onClose={() => setShowColorPicker(false)} />
        </div>
      )}
      
      {/* Content */}
      {isEditing ? (
        <textarea
          className="flex-1 bg-transparent resize-none focus:outline-none w-full"
          value={content}
          onChange={handleContentChange}
          onBlur={handleBlur}
          autoFocus
        />
      ) : (
        <div 
          className="flex-1 whitespace-pre-wrap break-words"
          onClick={() => !isEditMode && setIsEditing(true)}
        >
          {widget.data?.content || ''}
        </div>
      )}
    </div>
  );
};

export default StickyNoteWidget;
