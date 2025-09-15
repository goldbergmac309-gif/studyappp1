
import { Brain, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type SuggestionProps = {
  title: string;
  description: string;
};

const Suggestion = ({ title, description }: SuggestionProps) => {
  return (
    <div className="border-b border-border/30 last:border-0 py-4 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 mt-1">
          <Brain className="h-4 w-4" />
        </div>
        
        <div>
          <h4 className="font-medium text-sm">{title}</h4>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{description}</p>
          
          <Button variant="link" size="sm" className="h-8 pl-0 text-primary mt-1">
            <span>Try Now</span>
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const AiSuggestions = () => {
  return (
    <div className="bg-white rounded-[var(--widget-radius)] shadow-lift p-6 border-0">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-medium">AI Learning Suggestions</h3>
      </div>
      
      <div className="space-y-1">
        <Suggestion 
          title="Create flashcards from your biology notes" 
          description="I've analyzed your notes and can generate effective flashcards to help you memorize key concepts."
        />
        
        <Suggestion 
          title="Practice calculus with targeted exercises" 
          description="Based on your recent quiz results, I can provide exercises focused on integration by parts."
        />
        
        <Suggestion 
          title="Review physics concepts before your upcoming test" 
          description="Your test is in 3 days. Let me help you create a structured review plan."
        />
      </div>
    </div>
  );
};

export default AiSuggestions;
