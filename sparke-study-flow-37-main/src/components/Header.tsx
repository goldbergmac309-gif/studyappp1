
import { User, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import StudySessionToggle from "./StudySessionToggle";

const Header = () => {
  const location = useLocation();
  const isHome = location.pathname === "/";
  
  return (
    <header className="w-full bg-background border-b border-border py-3 px-4 md:px-6 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-2 md:gap-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground h-8 w-8 rounded-full flex items-center justify-center font-medium">
            S
          </div>
          <h1 className="text-base md:text-lg font-medium">Spark.E</h1>
        </Link>
        
        {!isHome && (
          <Link to="/" className="ml-4 text-muted-foreground hover:text-foreground flex items-center text-sm">
            <Home className="h-4 w-4 mr-1" />
            <span className="hidden md:inline">Dashboard</span>
          </Link>
        )}
      </div>
      
      <div className="flex items-center gap-2 md:gap-4">
        <StudySessionToggle />
        
        <Button 
          variant="outline" 
          size="sm" 
          className="border-primary text-primary hover:bg-primary/5 hover:border-primary/90 text-xs h-9"
        >
          Upgrade
        </Button>
      </div>
    </header>
  );
};

export default Header;
