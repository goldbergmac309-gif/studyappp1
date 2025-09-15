
import { useState } from "react";
import Header from "@/components/Header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Book, Search, Star, Plus, ChevronRight, Home } from "lucide-react";
import SubjectCard from "@/components/SubjectCard";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

type Subject = {
  id: string;
  name: string;
  color: string;
  progress?: number;
  tasks?: number;
  nextSession?: string;
  starred?: boolean;
};

const AllSubjects = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "starred">("all");
  
  // Mock data for subjects
  const subjects: Subject[] = [
    {
      id: "1",
      name: "Mathematics",
      color: "#3A5783",
      progress: 65,
      tasks: 3,
      nextSession: "Tomorrow",
      starred: true,
    },
    {
      id: "2",
      name: "Computer Science",
      color: "#6D5896",
      progress: 42,
      tasks: 5,
      nextSession: "Today",
      starred: true,
    },
    {
      id: "3",
      name: "Biology",
      color: "#4A7C59",
      progress: 28,
      tasks: 2,
    },
    {
      id: "4",
      name: "Physics",
      color: "#A89650",
      progress: 18,
      tasks: 1,
      nextSession: "Friday",
    },
    {
      id: "5",
      name: "Chemistry",
      color: "#C25450",
      progress: 0,
    },
    {
      id: "6",
      name: "History",
      color: "#8E5D4E",
      progress: 10,
    },
    {
      id: "7",
      name: "Literature",
      color: "#6B8CAE",
      progress: 5,
      tasks: 2,
    },
    {
      id: "8",
      name: "Art History",
      color: "#9D6275",
      progress: 0,
    }
  ];

  // Filter and search subjects
  const filteredSubjects = subjects
    .filter(subject => {
      // Filter by search query
      const matchesQuery = subject.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filter by tab
      const matchesFilter = filter === "all" || (filter === "starred" && subject.starred);
      
      return matchesQuery && matchesFilter;
    });

  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col">
      <Header />
      
      <main className="flex-1 px-4 md:px-6 py-12 max-w-screen-2xl mx-auto w-full">
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
                <BreadcrumbLink>
                  All Spaces
                </BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          <h1 className="text-2xl md:text-3xl mt-3 font-serif">All Study Spaces</h1>
        </div>

        {/* Search and filter controls */}
        <div className="flex flex-col md:flex-row gap-3 mb-6 justify-between">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search spaces..."
              className="pl-9 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant={filter === "all" ? "default" : "outline"} 
              size="sm"
              onClick={() => setFilter("all")}
            >
              <Book className="h-4 w-4 mr-1" />
              All
            </Button>
            <Button 
              variant={filter === "starred" ? "default" : "outline"} 
              size="sm"
              onClick={() => setFilter("starred")}
            >
              <Star className="h-4 w-4 mr-1" />
              Starred
            </Button>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New Space
            </Button>
          </div>
        </div>
        
        {/* Subjects grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredSubjects.map(subject => (
            <Link key={subject.id} to={`/subject/${subject.id}`}>
              <SubjectCard
                id={subject.id}
                name={subject.name}
                color={subject.color}
                progress={subject.progress}
                tasks={subject.tasks}
                nextSession={subject.nextSession}
              />
            </Link>
          ))}
          
          {/* Create new subject card */}
          <div className="study-card flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-gray-900/30 hover:text-gray-900 transition-colors cursor-pointer min-h-[180px]">
            <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
              <Plus className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium mt-2">Create New Space</span>
          </div>
        </div>
        
        {filteredSubjects.length === 0 && searchQuery && (
          <div className="text-center py-12">
            <div className="font-medium text-lg mb-2">No spaces found</div>
            <p className="text-muted-foreground">Try adjusting your search or filters</p>
          </div>
        )}
      </main>
      
      <footer className="py-4 px-6 text-center text-sm text-muted-foreground border-t border-border">
        <p>Spark.E © 2025 • Your AI-Powered Study Partner</p>
      </footer>
    </div>
  );
};

export default AllSubjects;
