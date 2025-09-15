
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import Header from "@/components/Header";
import SubjectTopNav from "@/components/SubjectTopNav";
import SubjectSidebar from "@/components/SubjectSidebar";
import WidgetBoard from "@/components/WidgetBoard";
import WidgetBoardEditMode from "@/components/WidgetBoardEditMode";
import ResourcesContent from "@/components/ResourcesContent";
import NotesContent from "@/components/NotesContent";
import TutorInterface from "@/components/tutor/TutorInterface";
import PracticeInterface from "@/components/practice/PracticeInterface";
import { cn } from "@/lib/utils";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useSparkPanel } from "@/contexts/SparkPanelContext";

import ExamPrepContent from "@/components/ExamPrepContent";
import StudyPlannerContent from "@/components/planner/StudyPlannerContent";

type TopNavContent = "overview" | "resources" | "notes";
type SidebarContent = "home" | "tutor" | "practice" | "exam-prep" | "planner" | "profile" | "settings" | null;

const Subject = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const [activeTopNav, setActiveTopNav] = useState<TopNavContent>("overview");
  const [activeSidebar, setActiveSidebar] = useState<SidebarContent>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [isEditingWidgets, setIsEditingWidgets] = useState(false);
  const { isSparkPanelOpen } = useSparkPanel();
  const [showAddWidgetMenu, setShowAddWidgetMenu] = useState(false);

  // Find the matching content component based on active navigation
  const renderContent = () => {
    if (activeSidebar === "tutor") return <TutorInterface />;
    if (activeSidebar === "practice") return <PracticeInterface />;
    if (activeSidebar === "exam-prep") return <ExamPrepContent />;
    if (activeSidebar === "planner") return <StudyPlannerContent subjectName={subjectName} />;

    // Default to top nav content when no sidebar is selected
    if (activeTopNav === "resources") return <ResourcesContent />;
    if (activeTopNav === "notes") return <NotesContent subjectId={subjectId || ""} />;
    
    // Overview with widget board
    return (
      <>
        <WidgetBoardEditMode 
          onEditModeChange={setIsEditingWidgets} 
          isEditMode={isEditingWidgets}
          onAddWidgetClick={() => setShowAddWidgetMenu(true)}
        />
        <WidgetBoard subjectId={subjectId} editMode={isEditingWidgets} />
      </>
    );
  };

  // Handle sidebar item selection
  const handleSidebarItemSelect = (item: SidebarContent) => {
    setActiveSidebar(item);
  };

  // Mock subject data - would come from a database in a real app
  const subjectName = subjectId === "1" ? "Mathematics" :
                      subjectId === "2" ? "Computer Science" : 
                      subjectId === "3" ? "Biology" :
                      subjectId === "4" ? "Physics" : "Unknown Subject";

  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col">
      <Header />
      
      <div className="flex-1 flex">
        {/* Sidebar */}
        <SubjectSidebar 
          expanded={sidebarExpanded}
          setExpanded={setSidebarExpanded}
          activeItem={activeSidebar}
          onSelectItem={handleSidebarItemSelect}
          onResetTopNav={() => setActiveTopNav("overview")}
          subjectId={subjectId}
        />
        
        {/* Main content */}
        <main className={cn(
          "flex-1 transition-all duration-200",
          sidebarExpanded ? "ml-36" : "ml-11",
          isSparkPanelOpen ? "mr-72" : ""
        )}>
          <div className="px-6 py-6 max-w-screen-2xl mx-auto w-full">
            {/* Breadcrumb and subject title */}
            <div className="mb-6">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to="/" className="flex items-center">
                        <Home className="h-4 w-4 mr-1" />
                        <span>Home</span>
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator>
                    <ChevronRight className="h-4 w-4" />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbLink className="font-medium">
                      {subjectName}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              
              <h1 className="text-2xl md:text-3xl mt-3 font-serif">{subjectName}</h1>
            </div>
            
            {/* Top navigation - only show when no sidebar item is active */}
            {!activeSidebar && (
              <SubjectTopNav 
                activeTab={activeTopNav}
                onSelectTab={(tab) => {
                  setActiveTopNav(tab);
                  setActiveSidebar(null);
                }}
              />
            )}
            
            {/* Content area - removed redundant titles, content renders directly */}
            <div className={cn(
              "mt-6", 
              activeSidebar ? "h-[calc(100vh-200px)]" : ""
            )}>
              {renderContent()}
            </div>
          </div>
        </main>
      </div>
      
      <footer className="py-4 px-6 text-center text-sm text-muted-foreground border-t border-border">
        <p>Spark.E © 2025 • Your AI-Powered Study Partner</p>
      </footer>
    </div>
  );
};

export default Subject;
