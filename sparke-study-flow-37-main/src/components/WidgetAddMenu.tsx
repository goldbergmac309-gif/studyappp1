
import { StickyNote, Link, CheckSquare } from "lucide-react";
import { WidgetType } from "./WidgetBoard";

interface WidgetAddMenuProps {
  position: { x: number; y: number };
  onAddWidget: (type: WidgetType) => void;
  onClose: () => void;
}

const WidgetAddMenu = ({ position, onAddWidget, onClose }: WidgetAddMenuProps) => {
  const menuItems: { type: WidgetType; icon: React.ReactNode; label: string }[] = [
    { type: "sticky-note", icon: <StickyNote className="h-4 w-4" />, label: "Sticky Note" },
    { type: "resource-link", icon: <Link className="h-4 w-4" />, label: "Resource Link" },
    { type: "todo-list", icon: <CheckSquare className="h-4 w-4" />, label: "To-Do List" }
  ];

  return (
    <div 
      className="absolute z-20 bg-white rounded-lg shadow-lg border border-border overflow-hidden"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`, 
        transform: 'translate(-50%, -50%)' 
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="py-1">
        {menuItems.map((item) => (
          <button
            key={item.type}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary transition-colors"
            onClick={() => onAddWidget(item.type)}
          >
            <span className="text-muted-foreground">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default WidgetAddMenu;
