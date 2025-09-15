
import { PracticeSessionResults, PracticeSet } from "./PracticeInterface";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { HomeIcon, RotateCw, Clock, Calendar, Share2, Download } from "lucide-react";

interface PracticeResultsProps {
  results: PracticeSessionResults;
  set: PracticeSet | null;
  onRestartSession: () => void;
  onReturnToHub: () => void;
}

// Helper function to format seconds to MM:SS
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const PracticeResults = ({ results, set, onRestartSession, onReturnToHub }: PracticeResultsProps) => {
  const percentageCorrect = Math.round((results.correctAnswers / results.totalQuestions) * 100);
  
  const getScoreMessage = (): string => {
    if (percentageCorrect >= 90) return "Excellent work!";
    if (percentageCorrect >= 70) return "Well done!";
    if (percentageCorrect >= 50) return "Good effort!";
    return "Keep practicing!";
  };
  
  return (
    <div className="h-full p-6 flex flex-col">
      <h2 className="text-2xl font-serif mb-6">Practice Results</h2>
      
      <div className="flex-1">
        <Card className="max-w-lg mx-auto">
          <CardHeader className="pb-2 text-center">
            <CardTitle className="text-xl">{set?.title || "Practice Session"} Complete</CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Score Overview */}
            <div className="text-center space-y-2">
              <div className="text-4xl font-bold">
                {results.correctAnswers} / {results.totalQuestions}
              </div>
              <p className="text-muted-foreground">
                {getScoreMessage()}
              </p>
              <Progress value={percentageCorrect} className="h-3 mt-4" />
              <div className="text-sm font-medium mt-1">
                {percentageCorrect}% correct
              </div>
            </div>
            
            {/* Additional Information */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-secondary/50 p-4 rounded-md flex flex-col items-center">
                <Clock className="h-5 w-5 text-muted-foreground mb-2" />
                <div className="font-medium">Time Spent</div>
                <div className="text-2xl">{formatTime(results.timeSpent)}</div>
              </div>
              
              <div className="bg-secondary/50 p-4 rounded-md flex flex-col items-center">
                <Calendar className="h-5 w-5 text-muted-foreground mb-2" />
                <div className="font-medium">Completed</div>
                <div className="text-sm">
                  {results.completedAt.toLocaleDateString()}
                </div>
              </div>
            </div>
            
            {/* AI Analysis */}
            <div className="bg-primary/5 border border-primary/20 p-4 rounded-md">
              <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                AI Learning Insights
              </h4>
              <p className="text-sm">
                Based on your results, I recommend focusing on {set?.type === "quiz" ? "algorithm complexity" : "data structures"} concepts. 
                Would you like me to generate a customized practice set to help reinforce these areas?
              </p>
              <Button variant="link" className="text-primary p-0 h-auto mt-1 text-sm">
                Generate Recommended Practice
              </Button>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col gap-3">
            <div className="flex gap-2 w-full">
              <Button 
                variant="default" 
                onClick={onRestartSession} 
                className="flex-1 gap-2"
              >
                <RotateCw className="h-4 w-4" />
                Practice Again
              </Button>
              <Button 
                variant="outline" 
                onClick={onReturnToHub} 
                className="flex-1 gap-2"
              >
                <HomeIcon className="h-4 w-4" />
                Return to Hub
              </Button>
            </div>
            
            <div className="flex gap-2 w-full">
              <Button variant="secondary" className="flex-1 gap-2">
                <Share2 className="h-4 w-4" />
                Share Results
              </Button>
              <Button variant="secondary" className="flex-1 gap-2">
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default PracticeResults;
