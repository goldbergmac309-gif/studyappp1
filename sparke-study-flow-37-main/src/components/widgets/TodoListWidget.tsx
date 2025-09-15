
import React, { useState } from 'react';
import { TodoItem } from '../WidgetBoard';
import { X, GripVertical, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateId } from '@/lib/utils';
import WidgetColorPicker from './WidgetColorPicker';
import { GridWidgetData } from '../WidgetGrid';

// Define widget-specific data properties
export interface TodoListData {
  title: string;
  items: TodoItem[];
  color: string;
}

// Combined props type
export interface TodoListWidgetProps {
  widget: GridWidgetData & { data: TodoListData };
  onDelete: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  onUpdate: (updatedWidget: GridWidgetData & { data: TodoListData }) => void;
  isDragging: boolean;
  isEditMode?: boolean;
}

const TodoListWidget = ({
  widget,
  onDelete,
  onDragStart,
  onUpdate,
  isDragging,
  isEditMode = false
}: TodoListWidgetProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(widget.data?.title || "To-Do List");
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  const items = widget.data?.items || [];
  
  const handleTitleBlur = () => {
    if (title !== widget.data?.title) {
      onUpdate({
        ...widget,
        data: {
          ...widget.data,
          title
        }
      });
    }
    setIsEditingTitle(false);
  };
  
  const toggleItemComplete = (itemId: string) => {
    if (isEditMode) return;
    
    const updatedItems = items.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    
    onUpdate({
      ...widget,
      data: {
        ...widget.data,
        items: updatedItems
      }
    });
  };
  
  const addItem = () => {
    const newItem: TodoItem = {
      id: generateId(),
      text: "",
      completed: false
    };
    
    onUpdate({
      ...widget,
      data: {
        ...widget.data,
        items: [...items, newItem]
      }
    });
  };
  
  const updateItemText = (itemId: string, text: string) => {
    const updatedItems = items.map(item => 
      item.id === itemId ? { ...item, text } : item
    );
    
    onUpdate({
      ...widget,
      data: {
        ...widget.data,
        items: updatedItems
      }
    });
  };
  
  const deleteItem = (itemId: string) => {
    const updatedItems = items.filter(item => item.id !== itemId);
    
    onUpdate({
      ...widget,
      data: {
        ...widget.data,
        items: updatedItems
      }
    });
  };

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
        'absolute p-4 w-64 rounded-md shadow-md flex flex-col transition-all',
        isDragging && 'opacity-70'
      )}
      style={{
        backgroundColor: widget.data?.color || '#F1F0FB',
        top: `${widget.position.y}px`,
        left: `${widget.position.x}px`,
        cursor: isEditMode ? 'move' : 'default',
        zIndex: isDragging ? 10 : 1
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onDragStart(e);
        }
      }}
    >
      {isEditMode && (
        <div className="flex items-center justify-between mb-2">
          <div 
            className="cursor-move p-1 rounded hover:bg-black/5"
            onMouseDown={onDragStart}
          >
            <GripVertical size={14} />
          </div>
          
          <div className="flex gap-1">
            <button 
              className="w-4 h-4 rounded-full border border-gray-300 focus:outline-none"
              style={{ backgroundColor: widget.data?.color || '#F1F0FB' }}
              onClick={() => setShowColorPicker(!showColorPicker)}
            />
            
            <button 
              className="p-1 rounded hover:bg-black/5 text-gray-500 hover:text-gray-700"
              onClick={onDelete}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
      
      {showColorPicker && (
        <div className="absolute top-10 right-0 z-10">
          <WidgetColorPicker onSelectColor={handleColorChange} onClose={() => setShowColorPicker(false)} />
        </div>
      )}
      
      <div className="mb-3">
        {isEditingTitle ? (
          <input
            className="w-full bg-transparent border-b border-gray-300 font-medium focus:outline-none focus:border-gray-500"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            autoFocus
          />
        ) : (
          <h3 
            className="font-medium cursor-text"
            onClick={() => !isEditMode && setIsEditingTitle(true)}
          >
            {title}
          </h3>
        )}
      </div>
      
      <ul className="space-y-1.5 mb-3">
        {items.map(item => (
          <TodoItemComponent
            key={item.id}
            item={item}
            onToggle={() => toggleItemComplete(item.id)}
            onTextChange={(text) => updateItemText(item.id, text)}
            onDelete={() => deleteItem(item.id)}
            isEditMode={isEditMode}
          />
        ))}
      </ul>
      
      {!isEditMode && (
        <button
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={addItem}
        >
          <Plus size={12} />
          <span>Add item</span>
        </button>
      )}
    </div>
  );
};

interface TodoItemProps {
  item: TodoItem;
  onToggle: () => void;
  onTextChange: (text: string) => void;
  onDelete: () => void;
  isEditMode: boolean;
}

const TodoItemComponent = ({ item, onToggle, onTextChange, onDelete, isEditMode }: TodoItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(item.text);
  
  const handleBlur = () => {
    onTextChange(text);
    setIsEditing(false);
  };

  return (
    <li className="flex items-start gap-2">
      <button
        className={cn(
          "flex-shrink-0 w-4 h-4 rounded border mt-0.5",
          item.completed 
            ? "bg-primary border-primary flex items-center justify-center" 
            : "border-gray-300"
        )}
        onClick={isEditMode ? undefined : onToggle}
        disabled={isEditMode}
      >
        {item.completed && <Check size={12} className="text-primary-foreground" />}
      </button>
      
      {isEditing ? (
        <input
          className="flex-1 bg-transparent border-b border-gray-300 text-sm focus:outline-none"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          autoFocus
        />
      ) : (
        <div 
          className={cn(
            "flex-1 text-sm",
            item.completed && "line-through text-muted-foreground"
          )}
          onClick={() => !isEditMode && setIsEditing(true)}
        >
          {item.text}
        </div>
      )}
      
      {!isEditMode && (
        <button
          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-black/5 rounded"
          onClick={onDelete}
        >
          <X size={12} className="text-muted-foreground" />
        </button>
      )}
    </li>
  );
};

export default TodoListWidget;
