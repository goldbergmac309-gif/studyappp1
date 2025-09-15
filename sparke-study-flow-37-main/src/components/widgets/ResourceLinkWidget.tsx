
import React, { useState } from 'react';
import { X, GripVertical, Link, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GridWidgetData } from '../WidgetGrid';

// Define widget-specific data properties
export interface ResourceLinkData {
  title: string;
  url: string;
  icon?: string;
}

// Combined props type
export interface ResourceLinkWidgetProps {
  widget: GridWidgetData & { data: ResourceLinkData };
  onDelete: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  onUpdate: (updatedWidget: GridWidgetData & { data: ResourceLinkData }) => void;
  isDragging: boolean;
  isEditMode?: boolean;
}

const ResourceLinkWidget = ({
  widget,
  onDelete,
  onDragStart,
  onUpdate,
  isDragging,
  isEditMode = false
}: ResourceLinkWidgetProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(widget.data?.title || '');
  const [url, setUrl] = useState(widget.data?.url || '');
  
  // Save edits
  const handleSave = () => {
    onUpdate({
      ...widget,
      data: {
        ...widget.data,
        title,
        url
      }
    });
    setIsEditing(false);
  };

  // Cancel edits
  const handleCancel = () => {
    setTitle(widget.data?.title || '');
    setUrl(widget.data?.url || '');
    setIsEditing(false);
  };

  // Open URL
  const handleOpenUrl = () => {
    if (!isEditing && !isEditMode) {
      window.open(widget.data?.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className={cn(
        'absolute p-4 w-64 bg-background border border-border rounded-md shadow-sm flex flex-col transition-all',
        isDragging && 'opacity-70',
        isEditing && 'ring-2 ring-primary ring-opacity-50'
      )}
      style={{
        top: `${widget.position.y}px`,
        left: `${widget.position.x}px`,
        cursor: isEditMode ? 'move' : 'pointer',
        zIndex: isDragging ? 10 : 1
      }}
      onMouseDown={(e) => {
        if (!isEditing && e.target === e.currentTarget) {
          onDragStart(e);
        }
      }}
      onDoubleClick={() => !isEditMode && setIsEditing(true)}
    >
      {/* Widget controls */}
      {(isEditMode || isEditing) && (
        <div className="flex items-center justify-between mb-2">
          {isEditMode && (
            <div 
              className="cursor-move p-1 rounded hover:bg-secondary"
              onMouseDown={onDragStart}
            >
              <GripVertical size={14} />
            </div>
          )}
          
          <div className="flex gap-1 ml-auto">
            {/* Delete button */}
            {isEditMode && (
              <button 
                className="p-1 rounded hover:bg-secondary text-gray-500 hover:text-gray-700"
                onClick={onDelete}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Content */}
      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Title</label>
            <input
              className="w-full p-1 text-sm border border-border rounded bg-background"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          
          <div>
            <label className="text-xs text-muted-foreground block mb-1">URL</label>
            <input
              className="w-full p-1 text-sm border border-border rounded bg-background"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          
          <div className="flex justify-end gap-2 mt-2">
            <button
              className="px-2 py-1 text-xs rounded bg-secondary hover:bg-secondary/80"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              className="px-2 py-1 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div 
          className="flex items-center gap-2"
          onClick={handleOpenUrl}
        >
          <div className="w-8 h-8 rounded bg-secondary/50 flex items-center justify-center">
            <Link size={16} className="text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium truncate">{widget.data?.title || 'Untitled Link'}</h4>
            <p className="text-xs text-muted-foreground truncate">{widget.data?.url || '#'}</p>
          </div>
          
          <ExternalLink size={14} className="text-muted-foreground" />
        </div>
      )}
    </div>
  );
};

export default ResourceLinkWidget;
