
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import SearchResults from "@/components/search/SearchResults";
import { cn } from "@/lib/utils";
import { useSparkPanel } from "@/contexts/SparkPanelContext";

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const { isSparkPanelOpen } = useSparkPanel();
  
  useEffect(() => {
    // Update the URL when search term changes
    if (searchTerm) {
      setSearchParams({ q: searchTerm });
    } else {
      setSearchParams({});
    }
  }, [searchTerm, setSearchParams]);
  
  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
  };

  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col">
      <Header />
      
      <main className={cn(
        "flex-1 transition-all duration-200",
        isSparkPanelOpen ? "mr-72" : ""
      )}>
        <SearchResults 
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
        />
      </main>
      
      <footer className="py-4 px-6 text-center text-sm text-muted-foreground border-t border-border">
        <p>Spark.E © 2025 • Your AI-Powered Study Partner</p>
      </footer>
    </div>
  );
};

export default Search;
