
import React from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SparkPanelToggleProps {
  isOpen: boolean;
  onClick: () => void;
}

const SparkPanelToggle = ({ isOpen, onClick }: SparkPanelToggleProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0 fixed right-4 top-[76px] rounded-full bg-white border border-border shadow-sm z-50 transition-all",
              isOpen && "bg-primary text-white hover:bg-primary/90"
            )}
            onClick={onClick}
          >
            <Sparkles className="h-4 w-4" />
            <span className="sr-only">Spark Panel</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Spark Panel</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default SparkPanelToggle;
