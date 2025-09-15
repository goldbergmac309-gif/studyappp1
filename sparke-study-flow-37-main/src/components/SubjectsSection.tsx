
import { useState } from "react";
import { Plus, Book, Star, Clock, Grid, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { generateId } from "@/lib/utils";

type Subject = {
  id: string;
  name: string;
  lastAccessed: string;
  color?: string;
  starred?: boolean;
  archived?: boolean;
  icon?: string;
};

type TabType = "recent" | "starred" | "all" | "archived";

const SubjectsSection = () => {
  const [activeTab, setActiveTab] = useState<TabType>("recent");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("book");
  const [selectedColor, setSelectedColor] = useState("#5A6573");
  
  const [subjects, setSubjects] = useState<Subject[]>([
    { 
      id: "1", 
      name: "Mathematics", 
      lastAccessed: "4/8/2025",
      color: "#5A6573", 
      starred: true,
      icon: "book"
    },
    { 
      id: "2", 
      name: "Computer Science", 
      lastAccessed: "4/7/2025",
      color: "#6B6578", 
      starred: true,
      icon: "code"
    },
    { 
      id: "3", 
      name: "Biology", 
      lastAccessed: "4/5/2025",
      color: "#5E6A63",
      icon: "flask"
    },
    { 
      id: "4", 
      name: "Physics", 
      lastAccessed: "4/3/2025",
      color: "#7A7A6C",
      archived: true,
      icon: "atom"
    },
  ]);

  const filteredSubjects = subjects.filter(subject => {
    if (activeTab === "recent") {
      return !subject.archived; // Show only non-archived
    } else if (activeTab === "starred") {
      return subject.starred && !subject.archived;
    } else if (activeTab === "archived") {
      return subject.archived;
    }
    return !subject.archived; // "all" tab shows everything except archived
  });
  
  const handleArchiveSubject = (id: string) => {
    setSubjects(subjects.map(subject => 
      subject.id === id ? { ...subject, archived: true } : subject
    ));
    toast.success("Subject archived");
  };
  
  const handleUnarchiveSubject = (id: string) => {
    setSubjects(subjects.map(subject => 
      subject.id === id ? { ...subject, archived: false } : subject
    ));
    toast.success("Subject unarchived");
  };
  
  const handleCreateSubject = () => {
    if (!newSubjectName.trim()) {
      toast.error("Please enter a subject name");
      return;
    }
    
    const newSubject: Subject = {
      id: generateId(),
      name: newSubjectName,
      lastAccessed: new Date().toLocaleDateString(),
      color: selectedColor,
      icon: selectedIcon
    };
    
    setSubjects([...subjects, newSubject]);
    setIsAddModalOpen(false);
    setNewSubjectName("");
    toast.success(`${newSubjectName} space created`);
  };
  
  // Available icons
  const icons = ["book", "pencil", "flask", "atom", "globe", "code", "brain", "calculator"];
  
  // Available colors (shades of grey)
  const colors = [
    "#5A6573", "#6B6578", "#5E6A63", "#7A7A6C", 
    "#403E43", "#8A898C", "#C8C8C9", "#9F9EA1"
  ];

  return (
    <div className="mb-16">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-medium text-lg">My spaces</h3>
        
        <div className="flex items-center gap-2">
          {/* Tab buttons */}
          <div className="flex items-center rounded-md bg-secondary p-0.5">
            <TabButton 
              active={activeTab === "recent"} 
              onClick={() => setActiveTab("recent")}
              icon={<Clock className="h-3.5 w-3.5" />}
              label="Recent"
            />
            <TabButton 
              active={activeTab === "starred"} 
              onClick={() => setActiveTab("starred")}
              icon={<Star className="h-3.5 w-3.5" />}
              label="Starred"
            />
            <TabButton 
              active={activeTab === "all"} 
              onClick={() => setActiveTab("all")}
              icon={<Grid className="h-3.5 w-3.5" />}
              label="All"
            />
            <TabButton 
              active={activeTab === "archived"} 
              onClick={() => setActiveTab("archived")}
              icon={<Archive className="h-3.5 w-3.5" />}
              label="Archived"
            />
          </div>
          
          <Button variant="ghost" size="sm" className="text-xs h-8 gap-1" asChild>
            <Link to="/subjects">View all</Link>
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredSubjects.map((subject) => (
          <SubjectCard 
            key={subject.id}
            subject={subject}
            onArchive={handleArchiveSubject}
            onUnarchive={handleUnarchiveSubject}
            isInArchive={activeTab === "archived"}
          />
        ))}
        
        {/* Add space card - only shown in non-archived tabs */}
        {activeTab !== "archived" && (
          <div 
            onClick={() => setIsAddModalOpen(true)}
            className="border border-dashed border-border rounded-lg p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-gray-900/30 hover:text-gray-900 transition-colors cursor-pointer h-[88px] shadow-subtle hover:shadow-lift transition-shadow"
          >
            <Plus className="h-4 w-4" />
            <span className="text-xs">Add space</span>
          </div>
        )}
      </div>
      
      {/* Add New Space Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Space</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subjectName">Subject Name</Label>
              <Input 
                id="subjectName" 
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="Enter subject name"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Select Icon</Label>
              <div className="grid grid-cols-8 gap-2">
                {icons.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setSelectedIcon(icon)}
                    className={cn(
                      "h-10 w-10 rounded-md flex items-center justify-center",
                      selectedIcon === icon ? "bg-gray-200 border-2 border-gray-300" : "bg-gray-100 hover:bg-gray-200"
                    )}
                  >
                    <IconDisplay name={icon} />
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Color Tag</Label>
              <div className="grid grid-cols-8 gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={cn(
                      "h-6 w-6 rounded-full",
                      selectedColor === color ? "ring-2 ring-gray-400 ring-offset-2" : ""
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSubject}>
              Create Space
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper component to display icons
const IconDisplay = ({ name }: { name: string }) => {
  switch (name) {
    case "book":
      return <Book className="h-5 w-5" />;
    case "pencil":
      return <span>✏️</span>;
    case "flask":
      return <span>🧪</span>;
    case "atom":
      return <span>⚛️</span>;
    case "globe":
      return <span>🌍</span>;
    case "code":
      return <span>💻</span>;
    case "brain":
      return <span>🧠</span>;
    case "calculator":
      return <span>🧮</span>;
    default:
      return <Book className="h-5 w-5" />;
  }
};

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const TabButton = ({ active, onClick, icon, label }: TabButtonProps) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors",
      active 
        ? "bg-background text-foreground shadow-sm font-medium" 
        : "text-muted-foreground hover:text-foreground"
    )}
  >
    {icon}
    <span>{label}</span>
  </button>
);

interface SubjectCardProps {
  subject: Subject;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  isInArchive: boolean;
}

const SubjectCard = ({ subject, onArchive, onUnarchive, isInArchive }: SubjectCardProps) => {
  return (
    <Link 
      to={`/subject/${subject.id}`}
      className="study-card group shadow-subtle hover:shadow-lift transition-shadow"
    >
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center" 
               style={{ backgroundColor: subject.color || "#5A6573", color: "white" }}>
          <IconDisplay name={subject.icon || "book"} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">{subject.name}</h4>
            <div className="flex items-center gap-1">
              {subject.starred && (
                <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
              )}
              
              <div className="relative">
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isInArchive) {
                      onUnarchive(subject.id);
                    } else {
                      onArchive(subject.id);
                    }
                  }}
                  className="ml-1 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-opacity"
                >
                  {isInArchive ? (
                    <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Last accessed: {subject.lastAccessed}</p>
        </div>
      </div>
    </Link>
  );
};

export default SubjectsSection;
