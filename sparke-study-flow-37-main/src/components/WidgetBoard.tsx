
import { useState, useEffect } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import WidgetGrid, { GridWidgetData, GridPosition } from "./WidgetGrid";
import WidgetAddMenu, { GridWidgetType } from "./widgets/WidgetAddMenu";
import { generateId } from "@/lib/utils";

export type WidgetType = "sticky-note" | "resource-link" | "todo-list" | "progress" | "exam-countdown" | "tasks" | "study-tips";

export interface WidgetPosition {
  x: number;
  y: number;
}

export interface WidgetBase {
  id: string;
  type: WidgetType;
  position: WidgetPosition;
}

export interface StickyNoteData extends WidgetBase {
  type: "sticky-note";
  content: string;
  color: string;
}

export interface ResourceLinkData extends WidgetBase {
  type: "resource-link";
  title: string;
  url: string;
  icon?: string;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface TodoListData extends WidgetBase {
  type: "todo-list";
  title: string;
  items: TodoItem[];
  color: string;
}

export type WidgetData = StickyNoteData | ResourceLinkData | TodoListData;

const convertToGridWidget = (widget: WidgetData): GridWidgetData => {
  const gridPosition: GridPosition = {
    row: Math.max(1, Math.floor(widget.position.y / 60) + 1),
    col: Math.max(1, Math.floor(widget.position.x / 60) + 1),
    width: 4,
    height: 3
  };

  switch (widget.type) {
    case "sticky-note":
      return {
        id: widget.id,
        type: "sticky-note",
        position: widget.position,
        gridPosition,
        data: {
          content: (widget as StickyNoteData).content,
          color: (widget as StickyNoteData).color
        }
      };
    
    case "resource-link":
      return {
        id: widget.id,
        type: "resource-link",
        position: widget.position,
        gridPosition,
        data: {
          title: (widget as ResourceLinkData).title,
          url: (widget as ResourceLinkData).url,
          icon: (widget as ResourceLinkData).icon
        }
      };
    
    case "todo-list":
      return {
        id: widget.id,
        type: "todo-list",
        position: widget.position,
        gridPosition,
        data: {
          title: (widget as TodoListData).title,
          items: (widget as TodoListData).items,
          color: (widget as TodoListData).color
        }
      };
  }
};

const getSampleGridWidgets = (): GridWidgetData[] => {
  return [
    {
      id: generateId(),
      type: "progress",
      position: { x: 0, y: 0 },
      gridPosition: { row: 1, col: 1, width: 4, height: 4 },
      data: {
        title: "Recent Topics",
        topics: [
          { name: "Cell Division", progress: 75 },
          { name: "Genetic Inheritance", progress: 45 },
          { name: "Photosynthesis", progress: 90 },
          { name: "Ecosystems", progress: 30 }
        ]
      }
    },
    {
      id: generateId(),
      type: "exam-countdown",
      position: { x: 0, y: 0 },
      gridPosition: { row: 1, col: 5, width: 3, height: 3 },
      data: {
        title: "Final Exam",
        date: "May 15, 2025",
        daysLeft: 28
      }
    },
    {
      id: generateId(),
      type: "tasks",
      position: { x: 0, y: 0 },
      gridPosition: { row: 1, col: 8, width: 5, height: 4 },
      data: {
        title: "Upcoming Tasks",
        tasks: [
          { id: generateId(), text: "Complete chapter review questions", completed: true },
          { id: generateId(), text: "Prepare lab notes for submission", completed: false },
          { id: generateId(), text: "Study for quiz on Friday", completed: false },
          { id: generateId(), text: "Meet with study group", completed: false }
        ]
      }
    },
    {
      id: generateId(),
      type: "study-tips",
      position: { x: 0, y: 0 },
      gridPosition: { row: 5, col: 1, width: 5, height: 3 },
      data: {
        title: "Study Tip",
        tip: "When studying cell division, create visual diagrams showing each phase of mitosis and meiosis for better retention.",
        source: "Spark.E AI Assistant"
      }
    },
    {
      id: generateId(),
      type: "sticky-note",
      position: { x: 0, y: 0 },
      gridPosition: { row: 5, col: 6, width: 3, height: 3 },
      data: {
        content: "Remember to bring lab notebook to Thursday's class for peer review.",
        color: "#F1F0FB"
      }
    },
    {
      id: generateId(),
      type: "resource-link",
      position: { x: 0, y: 0 },
      gridPosition: { row: 5, col: 9, width: 4, height: 3 },
      data: {
        title: "Cell Division Video Lecture",
        url: "https://example.com/cell-division",
        icon: "video"
      }
    }
  ];
};

const getDefaultGridPosition = (type: GridWidgetType): GridPosition => {
  switch (type) {
    case "progress":
      return { row: 1, col: 1, width: 4, height: 4 };
    case "exam-countdown":
      return { row: 1, col: 1, width: 3, height: 3 };
    case "tasks":
    case "todo-list":
      return { row: 1, col: 1, width: 4, height: 4 };
    case "study-tips":
      return { row: 1, col: 1, width: 5, height: 3 };
    case "sticky-note":
      return { row: 1, col: 1, width: 3, height: 3 };
    case "resource-link":
      return { row: 1, col: 1, width: 4, height: 3 };
    default:
      return { row: 1, col: 1, width: 3, height: 3 };
  }
};

const getDefaultWidgetData = (type: GridWidgetType) => {
  switch (type) {
    case "progress":
      return {
        title: "Topic Progress",
        topics: [
          { name: "Topic 1", progress: 0 },
          { name: "Topic 2", progress: 0 }
        ]
      };
    case "exam-countdown":
      return {
        title: "Upcoming Exam",
        date: "May 15, 2025",
        daysLeft: 30
      };
    case "tasks":
    case "todo-list":
      return {
        title: "Tasks",
        tasks: [
          { id: generateId(), text: "New task", completed: false }
        ]
      };
    case "study-tips":
      return {
        title: "Study Tip",
        tip: "Regular short study sessions are more effective than cramming.",
        source: "Spark.E AI Assistant"
      };
    case "sticky-note":
      return {
        content: "New note",
        color: "#F1F0FB"
      };
    case "resource-link":
      return {
        title: "New resource",
        url: "https://example.com",
        icon: "link"
      };
    default:
      return {};
  }
};

interface WidgetBoardProps {
  subjectId?: string;
  editMode?: boolean;
}

const WidgetBoard = ({ subjectId, editMode = false }: WidgetBoardProps) => {
  const [widgets, setWidgets] = useState<GridWidgetData[]>([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!subjectId) return;
    
    const storageKey = `grid-widgets-${subjectId}`;
    const savedWidgets = localStorage.getItem(storageKey);
    
    if (savedWidgets) {
      try {
        setWidgets(JSON.parse(savedWidgets));
      } catch (error) {
        console.error("Failed to parse saved widgets:", error);
        const sampleWidgets = getSampleGridWidgets();
        setWidgets(sampleWidgets);
        saveWidgets(sampleWidgets);
      }
    } else {
      const legacyKey = `widgets-${subjectId}`;
      const legacyWidgets = localStorage.getItem(legacyKey);
      
      if (legacyWidgets) {
        try {
          const oldWidgets = JSON.parse(legacyWidgets) as WidgetData[];
          const convertedWidgets = oldWidgets.map(convertToGridWidget);
          setWidgets(convertedWidgets);
          saveWidgets(convertedWidgets);
        } catch (error) {
          console.error("Failed to convert legacy widgets:", error);
          const sampleWidgets = getSampleGridWidgets();
          setWidgets(sampleWidgets);
          saveWidgets(sampleWidgets);
        }
      } else {
        const sampleWidgets = getSampleGridWidgets();
        setWidgets(sampleWidgets);
        saveWidgets(sampleWidgets);
      }
    }
  }, [subjectId]);

  const saveWidgets = (updatedWidgets: GridWidgetData[]) => {
    if (!subjectId) return;
    localStorage.setItem(`grid-widgets-${subjectId}`, JSON.stringify(updatedWidgets));
  };

  const handleAddWidget = (type: GridWidgetType) => {
    const newWidget: GridWidgetData = {
      id: generateId(),
      type: type,
      position: { x: 0, y: 0 },
      gridPosition: getDefaultGridPosition(type),
      data: getDefaultWidgetData(type)
    };
    
    const updatedWidgets = [...widgets, newWidget];
    setWidgets(updatedWidgets);
    saveWidgets(updatedWidgets);
    
    toast({
      title: "Widget added",
      description: `New ${type.replace('-', ' ')} widget has been added.`
    });
  };

  const handleUpdateWidget = (updatedWidget: GridWidgetData) => {
    const updatedWidgets = widgets.map(widget => 
      widget.id === updatedWidget.id ? updatedWidget : widget
    );
    
    setWidgets(updatedWidgets);
    saveWidgets(updatedWidgets);
  };

  const handleDeleteWidget = (widgetId: string) => {
    const updatedWidgets = widgets.filter(widget => widget.id !== widgetId);
    setWidgets(updatedWidgets);
    saveWidgets(updatedWidgets);
    
    toast({
      title: "Widget deleted",
      description: "The widget has been removed."
    });
  };

  return (
    <div className="relative">
      <WidgetGrid
        widgets={widgets}
        editMode={editMode}
        onUpdateWidget={handleUpdateWidget}
        onDeleteWidget={handleDeleteWidget}
        className="min-h-[720px]"
      />
      
      <WidgetAddMenu
        open={showAddMenu}
        onClose={() => setShowAddMenu(false)}
        onSelectWidget={handleAddWidget}
      />
      
      {editMode && (
        <div className="hidden">
          <button onClick={() => setShowAddMenu(true)}>
            Add Widget (Hidden)
          </button>
        </div>
      )}
    </div>
  );
};

export default WidgetBoard;
