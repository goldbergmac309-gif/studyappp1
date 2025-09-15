
import { cn } from "@/lib/utils";

type SubjectTab = "overview" | "resources" | "notes";

interface SubjectTopNavProps {
  activeTab: SubjectTab;
  onSelectTab: (tab: SubjectTab) => void;
}

const SubjectTopNav = ({ activeTab, onSelectTab }: SubjectTopNavProps) => {
  const tabs: { id: SubjectTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "resources", label: "Resources" },
    { id: "notes", label: "Notes" },
  ];

  return (
    <div className="border-b border-border">
      <nav className="flex space-x-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={cn(
              "py-3 px-1 font-medium text-sm relative hover:text-gray-900 transition-colors",
              activeTab === tab.id
                ? "text-gray-900"
                : "text-muted-foreground"
            )}
          >
            {tab.label}
            <span
              className={cn(
                "absolute bottom-0 left-0 w-full h-0.5 bg-gray-900 transform transition-transform",
                activeTab === tab.id ? "scale-x-100" : "scale-x-0"
              )}
            />
          </button>
        ))}
      </nav>
    </div>
  );
};

export default SubjectTopNav;
