
import { Link, useLocation } from "react-router-dom";
import { BookOpen, ChevronLeft, ChevronRight, MessageCircle, Calendar, BarChart, User, Settings, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

type SidebarItem = "home" | "tutor" | "practice" | "exam-prep" | "planner" | "profile" | "settings" | null;

interface SidebarItemProps {
  id: SidebarItem;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  expanded: boolean;
  onClick: () => void;
  to?: string;
}

const SidebarItemComponent = ({ id, icon, label, active, expanded, onClick, to }: SidebarItemProps) => {
  const content = (
    <>
      <span className="flex-shrink-0">{icon}</span>
      {expanded && <span className="text-sm">{label}</span>}
    </>
  );
  
  const className = cn(
    "w-full flex items-center gap-2.5 py-2.5 px-3 rounded-md transition-colors",
    active 
      ? "bg-secondary/70 text-gray-900 font-medium" 
      : "text-muted-foreground hover:bg-secondary/40 hover:text-gray-900"
  );
  
  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    );
  }
  
  return (
    <button onClick={onClick} className={className}>
      {content}
    </button>
  );
};

interface SubjectSidebarProps {
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  activeItem: SidebarItem;
  onSelectItem: (item: SidebarItem) => void;
  onResetTopNav: () => void;
  subjectId?: string;
}

const SubjectSidebar = ({
  expanded,
  setExpanded,
  activeItem,
  onSelectItem,
  onResetTopNav,
  subjectId = "",
}: SubjectSidebarProps) => {
  const location = useLocation();
  
  const sidebarItems: { id: SidebarItem; icon: React.ReactNode; label: string }[] = [
    { id: "home", icon: <LayoutDashboard className="h-5 w-5" />, label: "Subject Home" },
    { id: "tutor", icon: <MessageCircle className="h-5 w-5" />, label: "Tutor" },
    { id: "practice", icon: <BookOpen className="h-5 w-5" />, label: "Practice" },
    { id: "exam-prep", icon: <BarChart className="h-5 w-5" />, label: "Exam Prep" },
    { id: "planner", icon: <Calendar className="h-5 w-5" />, label: "AI Study Planner" },
  ];

  const settingsItems: { id: SidebarItem; icon: React.ReactNode; label: string; path: string }[] = [
    { id: "profile", icon: <User className="h-5 w-5" />, label: "Profile", path: "/profile" },
    { id: "settings", icon: <Settings className="h-5 w-5" />, label: "Settings", path: "/settings" },
  ];

  const handleItemClick = (item: SidebarItem) => {
    if (item === "home") {
      // If it's the Home item, just reset without selecting any specific tool
      onSelectItem(null);
      onResetTopNav();
    } else if (activeItem === item) {
      onSelectItem(null);
      onResetTopNav();
    } else {
      onSelectItem(item);
    }
  };

  return (
    <div
      className={cn(
        "h-full fixed left-0 top-[57px] bottom-0 transition-all duration-200 flex flex-col",
        "bg-secondary/10 border-r border-secondary/30",
        expanded ? "w-36" : "w-11"
      )}
    >
      <div className="p-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center h-7 text-muted-foreground hover:text-gray-900 bg-secondary/30 rounded-md transition-colors"
        >
          {expanded ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="py-3 px-2 flex-1">
        <div className="space-y-1">
          {sidebarItems.map((item) => (
            <SidebarItemComponent
              key={item.id}
              id={item.id}
              icon={item.icon}
              label={item.label}
              active={activeItem === item.id}
              expanded={expanded}
              onClick={() => handleItemClick(item.id)}
            />
          ))}
        </div>
      </div>

      <div className="mt-auto py-3 px-2 border-t border-secondary/30">
        <div className="space-y-1">
          {settingsItems.map((item) => (
            <SidebarItemComponent
              key={item.id}
              id={item.id}
              icon={item.icon}
              label={item.label}
              active={location.pathname === item.path}
              expanded={expanded}
              onClick={() => {}}
              to={item.path}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SubjectSidebar;
