
import { 
  FileText, 
  File, 
  Calendar, 
  Clock, 
  BookOpen,
  CheckCircle2
} from "lucide-react";
import { useState } from "react"; // Adding the missing import
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface SearchResultItemProps {
  type: "note" | "resource" | "task" | "event";
  title: string;
  subject: string;
  snippet: string;
  searchTerm: string;
}

// A component to highlight search terms in text
const HighlightedText = ({ text, highlight }: { text: string, highlight: string }) => {
  if (!highlight.trim()) {
    return <span>{text}</span>;
  }
  
  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <>
      {parts.map((part, i) => (
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-100 text-gray-900 px-0.5 rounded-sm">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      ))}
    </>
  );
};

// A component for a single search result item
const SearchResultItem = ({ type, title, subject, snippet, searchTerm }: SearchResultItemProps) => {
  let Icon;
  let iconColor;
  
  switch (type) {
    case "note":
      Icon = FileText;
      iconColor = "text-blue-600";
      break;
    case "resource":
      Icon = File;
      iconColor = "text-green-600";
      break;
    case "task":
      Icon = CheckCircle2;
      iconColor = "text-orange-600";
      break;
    case "event":
      Icon = Calendar;
      iconColor = "text-purple-600";
      break;
    default:
      Icon = FileText;
      iconColor = "text-gray-600";
  }
  
  return (
    <div className="py-4">
      <div className="flex items-center gap-3 mb-1">
        <div className={cn("h-8 w-8 rounded-full flex items-center justify-center bg-secondary", iconColor)}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h4 className="font-medium text-sm">
            <HighlightedText text={title} highlight={searchTerm} />
          </h4>
          <p className="text-xs text-muted-foreground">in {subject}</p>
        </div>
      </div>
      <div className="pl-11 text-sm text-muted-foreground">
        <HighlightedText text={snippet} highlight={searchTerm} />
      </div>
    </div>
  );
};

// Filter tabs for search results
const FilterTabs = ({ activeFilter, setActiveFilter }: {
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
}) => {
  const filters = [
    { id: "all", label: "All", icon: null },
    { id: "notes", label: "Notes", icon: <FileText className="h-4 w-4 mr-1" /> },
    { id: "resources", label: "Resources", icon: <File className="h-4 w-4 mr-1" /> },
    { id: "tasks", label: "Tasks", icon: <CheckCircle2 className="h-4 w-4 mr-1" /> },
    { id: "events", label: "Events", icon: <Calendar className="h-4 w-4 mr-1" /> },
  ];
  
  return (
    <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
      {filters.map((filter) => (
        <Button 
          key={filter.id}
          variant={activeFilter === filter.id ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter(filter.id)}
          className="flex items-center"
        >
          {filter.icon}
          {filter.label}
        </Button>
      ))}
    </div>
  );
};

// The main search results component
interface SearchResultsProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

const SearchResults = ({
  searchTerm,
  onSearchChange
}: SearchResultsProps) => {
  // Mock results for demonstration
  const mockResults: SearchResultItemProps[] = [
    {
      type: "note",
      title: "Differentiation Rules",
      subject: "Mathematics",
      snippet: "The power rule states that if f(x) = x^n, then f'(x) = nx^(n-1). This is one of the essential differentiation rules.",
      searchTerm
    },
    {
      type: "resource",
      title: "Calculus Textbook Chapter 3",
      subject: "Mathematics",
      snippet: "Chapter 3 covers differentiation rules and their applications to real-world problems.",
      searchTerm
    },
    {
      type: "task",
      title: "Complete practice problems 1-10",
      subject: "Mathematics",
      snippet: "Due tomorrow: Solve practice problems 1-10 on differentiation from the textbook.",
      searchTerm
    },
    {
      type: "event",
      title: "Calculus Study Group",
      subject: "Mathematics",
      snippet: "Join the study group session on Thursday at 3PM to review differentiation rules.",
      searchTerm
    },
    {
      type: "note",
      title: "Integration Techniques",
      subject: "Mathematics",
      snippet: "Integration by parts is useful when integrating products of functions. The formula is: ∫u dv = uv - ∫v du",
      searchTerm
    },
  ];

  // State for active filter
  const [activeFilter, setActiveFilter] = useState("all");
  
  // Filter results based on the active filter
  const filteredResults = mockResults.filter(result => {
    if (activeFilter === "all") return true;
    if (activeFilter === "notes") return result.type === "note";
    if (activeFilter === "resources") return result.type === "resource";
    if (activeFilter === "tasks") return result.type === "task";
    if (activeFilter === "events") return result.type === "event";
    return true;
  });

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl mb-4 font-serif">Search Results</h1>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Search..."
            className="max-w-lg"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <Button type="submit">Search</Button>
        </div>
      </div>
      
      <FilterTabs activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
      
      {filteredResults.length > 0 ? (
        <div>
          <div className="text-sm text-muted-foreground mb-4">
            Found {filteredResults.length} results for "{searchTerm}"
          </div>
          <div className="divide-y divide-border">
            {filteredResults.map((result, index) => (
              <SearchResultItem 
                key={index}
                type={result.type}
                title={result.title}
                subject={result.subject}
                snippet={result.snippet}
                searchTerm={searchTerm}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="py-12 text-center">
          <div className="bg-secondary/50 inline-flex rounded-full p-3 mb-4">
            <Clock className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">No results found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search terms or checking your spelling
          </p>
        </div>
      )}
    </div>
  );
};

export default SearchResults;
