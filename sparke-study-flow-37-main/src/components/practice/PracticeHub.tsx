
import { useState } from "react";
import { PracticeSet } from "./PracticeInterface";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Brain, Calendar, Clock, FlaskConical, ListChecks, Sparkles } from "lucide-react";

// Sample practice sets data
const samplePracticeSets: PracticeSet[] = [
  {
    id: "1",
    title: "Computer Science Fundamentals",
    description: "Core concepts in computer science and programming",
    type: "quiz",
    questionCount: 10,
    difficulty: "medium",
    createdAt: new Date(2023, 10, 15)
  },
  {
    id: "2",
    title: "Data Structures",
    description: "Arrays, linked lists, trees, and graph structures",
    type: "flashcard",
    questionCount: 15,
    difficulty: "hard",
    createdAt: new Date(2023, 11, 5),
    dueDate: new Date(2023, 11, 20)
  },
  {
    id: "3",
    title: "Algorithms Basics",
    description: "Sorting, searching, and time complexity analysis",
    type: "quiz",
    questionCount: 8,
    difficulty: "easy",
    createdAt: new Date(2023, 9, 25)
  }
];

interface PracticeHubProps {
  onStartSession: (set: PracticeSet) => void;
}

const PracticeHub = ({ onStartSession }: PracticeHubProps) => {
  const [activeTab, setActiveTab] = useState("all");
  const [userSets, setUserSets] = useState<PracticeSet[]>([]); // Empty for demo
  
  // Filter practice sets based on active tab
  const filteredSets = (() => {
    if (activeTab === "quiz") return samplePracticeSets.filter(set => set.type === "quiz");
    if (activeTab === "flashcard") return samplePracticeSets.filter(set => set.type === "flashcard");
    if (activeTab === "my-sets") return userSets;
    return samplePracticeSets;
  })();
  
  // AI-generated practice options
  const handleGenerateQuiz = () => {
    // This would typically make an API call to generate a quiz
    const newQuiz: PracticeSet = {
      id: "ai-generated-1",
      title: "AI-Generated Quiz on Computer Science",
      description: "Personalized questions based on your recent studies",
      type: "quiz",
      questionCount: 10,
      difficulty: "medium",
      createdAt: new Date()
    };
    
    onStartSession(newQuiz);
  };
  
  const handleGenerateFlashcards = () => {
    // This would typically make an API call to generate flashcards
    const newFlashcards: PracticeSet = {
      id: "ai-generated-2",
      title: "AI-Generated Flashcards on Computer Science",
      description: "Key concepts organized into flashcards for effective learning",
      type: "flashcard",
      questionCount: 12,
      difficulty: "medium",
      createdAt: new Date()
    };
    
    onStartSession(newFlashcards);
  };
  
  return (
    <div className="h-full p-6">
      <h2 className="text-2xl font-serif mb-6">Practice Hub</h2>
      
      {/* AI-Generated Practice Section */}
      <section className="mb-8">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI-Generated Practice
        </h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="bg-secondary/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Generate a Quiz</CardTitle>
              <CardDescription>
                AI creates questions based on your current topic
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              <p>Get a personalized quiz with questions adapted to your knowledge level.</p>
            </CardContent>
            <CardFooter>
              <Button onClick={handleGenerateQuiz} className="w-full">
                <Brain className="h-4 w-4 mr-2" />
                Start AI Quiz
              </Button>
            </CardFooter>
          </Card>
          
          <Card className="bg-secondary/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Generate Flashcards</CardTitle>
              <CardDescription>
                AI creates flashcards to help memorize concepts
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              <p>Review key concepts with AI-generated flashcards for better retention.</p>
            </CardContent>
            <CardFooter>
              <Button onClick={handleGenerateFlashcards} className="w-full">
                <FlaskConical className="h-4 w-4 mr-2" />
                Start Flashcards
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>
      
      {/* Due Today / Spaced Repetition Section */}
      <section className="mb-8">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Due Today
        </h3>
        
        {samplePracticeSets.filter(set => set.dueDate).length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {samplePracticeSets
              .filter(set => set.dueDate)
              .map(set => (
                <Card key={set.id} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base">{set.title}</CardTitle>
                      <Badge variant={set.type === "quiz" ? "default" : "secondary"}>
                        {set.type === "quiz" ? "Quiz" : "Flashcards"}
                      </Badge>
                    </div>
                    <CardDescription>
                      {set.questionCount} items • {set.difficulty} difficulty
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>Due today</span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      onClick={() => onStartSession(set)} 
                      variant="secondary" 
                      className="w-full"
                    >
                      Start Review
                    </Button>
                  </CardFooter>
                </Card>
              ))}
          </div>
        ) : (
          <Card className="bg-muted/50">
            <CardContent className="p-6 text-center text-muted-foreground">
              <p>No review sessions scheduled for today.</p>
            </CardContent>
          </Card>
        )}
      </section>
      
      {/* Practice Sets Browser */}
      <section>
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary" />
          Browse Practice Sets
        </h3>
        
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">All Sets</TabsTrigger>
            <TabsTrigger value="quiz">Quizzes</TabsTrigger>
            <TabsTrigger value="flashcard">Flashcards</TabsTrigger>
            <TabsTrigger value="my-sets">My Sets</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="m-0">
            {filteredSets.length > 0 ? (
              <ScrollArea className="h-[450px] pr-4">
                <div className="grid gap-4">
                  {filteredSets.map(set => (
                    <Card key={set.id} className="relative">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-base">{set.title}</CardTitle>
                          <Badge variant={set.type === "quiz" ? "default" : "secondary"}>
                            {set.type === "quiz" ? "Quiz" : "Flashcards"}
                          </Badge>
                        </div>
                        <CardDescription>
                          {set.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2 text-sm">
                        <div className="flex justify-between">
                          <span>{set.questionCount} items</span>
                          <Badge variant="outline">{set.difficulty}</Badge>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button 
                          onClick={() => onStartSession(set)} 
                          variant="secondary" 
                          className="w-full"
                        >
                          Start Practice
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <Card className="bg-muted/50">
                <CardContent className="p-8 text-center">
                  <h4 className="text-lg font-medium mb-2">No Custom Sets Yet</h4>
                  <p className="text-muted-foreground mb-4">
                    You haven't created any custom practice sets yet.
                  </p>
                  <Button>
                    Create New Set
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
};

export default PracticeHub;
