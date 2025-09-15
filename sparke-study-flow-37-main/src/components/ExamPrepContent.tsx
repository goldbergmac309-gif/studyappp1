
import { useState } from "react";
import { 
  UploadCloud, 
  FileText, 
  BarChart, 
  Brain, 
  Trash2, 
  ChevronRight,
  FileUp,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { generateId } from "@/lib/utils";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

// Types
type ExamFile = {
  id: string;
  name: string;
  uploadDate: Date;
  size: string;
  processed: boolean;
};

type TopicData = {
  name: string;
  percentage: number;
  color: string;
};

type ExamPrepView = "upload" | "analysis" | "mockExam";
type ExamSource = "pastExams" | "manual";
type ExamDifficulty = "easy" | "medium" | "hard" | "mixed";

const ExamPrepContent = () => {
  const [view, setView] = useState<ExamPrepView>("upload");
  const [examFiles, setExamFiles] = useState<ExamFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  // Mock exam generation state
  const [examSource, setExamSource] = useState<ExamSource>("pastExams");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<ExamDifficulty>("medium");
  const [questionCount, setQuestionCount] = useState(20);
  const [mockExamGenerated, setMockExamGenerated] = useState(false);
  
  // Sample topics based on analysis
  const topicsData: TopicData[] = [
    { name: "Integrals", percentage: 40, color: "bg-blue-500" },
    { name: "Derivatives", percentage: 25, color: "bg-green-500" },
    { name: "Limits", percentage: 15, color: "bg-purple-500" },
    { name: "Series", percentage: 10, color: "bg-amber-500" },
    { name: "Differential Equations", percentage: 10, color: "bg-pink-500" },
  ];
  
  // Available topics for manual selection
  const availableTopics = [
    "Integrals", "Derivatives", "Limits", "Series", "Differential Equations", 
    "Vector Calculus", "Complex Numbers", "Partial Derivatives", "Multiple Integrals"
  ];

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files.length > 0) {
      const newFiles: ExamFile[] = [];
      
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        
        // Only accept PDFs
        if (file.type === "application/pdf") {
          newFiles.push({
            id: generateId(),
            name: file.name,
            uploadDate: new Date(),
            size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
            processed: false,
          });
        } else {
          toast.error(`${file.name} is not a PDF`);
        }
      }
      
      if (newFiles.length > 0) {
        setExamFiles([...examFiles, ...newFiles]);
        toast.success(`Uploaded ${newFiles.length} exam PDFs`);
        
        // Simulate processing - in a real app, this would be an API call
        setTimeout(() => {
          setExamFiles(current => 
            current.map(file => ({ ...file, processed: true }))
          );
          if (examFiles.length === 0 && newFiles.length > 0) {
            setView("analysis"); // Switch to analysis view after first upload
          }
        }, 2000);
      }
    }
  };

  const handleUploadClick = () => {
    // In a real app, this would trigger a file input
    // Simulating a file upload
    const mockFile: ExamFile = {
      id: generateId(),
      name: `Math Final Exam ${new Date().getFullYear()}.pdf`,
      uploadDate: new Date(),
      size: "1.2 MB",
      processed: false
    };
    
    setExamFiles([...examFiles, mockFile]);
    toast.success(`Uploaded ${mockFile.name}`);
    
    // Simulate processing
    setTimeout(() => {
      setExamFiles(current => 
        current.map(file => ({ ...file, processed: true }))
      );
      if (examFiles.length === 0) {
        setView("analysis"); // Switch to analysis view after first upload
      }
    }, 2000);
  };

  const handleDeleteExam = (id: string) => {
    setExamFiles(examFiles.filter(file => file.id !== id));
    toast.success("Exam removed from analysis");
    
    // If all exams are deleted, go back to upload view
    if (examFiles.length === 1) {
      setView("upload");
    }
  };

  const handleTopicSelect = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter(t => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  const handleGenerateMockExam = () => {
    toast.success("Generating mock exam...");
    
    // Simulate generation delay
    setTimeout(() => {
      setMockExamGenerated(true);
      toast.success("Mock exam generated successfully!");
    }, 1500);
  };

  const handleStartExam = () => {
    toast.info("Starting mock exam...");
    // In a real app, this would transition to the quiz player
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (view === "upload" || examFiles.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-border shadow-sm p-6">
        <div 
          className={cn(
            "min-h-[400px] rounded-lg border-2 border-dashed transition-colors flex flex-col items-center justify-center p-8 text-center",
            isDragging ? "border-primary/50 bg-primary/5" : "border-border"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="h-16 w-16 rounded-full bg-secondary/70 flex items-center justify-center mb-4">
            <UploadCloud className="h-8 w-8 text-primary" />
          </div>
          
          <h3 className="text-lg font-medium mb-2">Upload Past Exams</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Upload past exam PDFs to get topic analysis and generate targeted mock tests. 
            This helps identify patterns and focus your studying on what matters most.
          </p>
          
          <Button onClick={handleUploadClick} className="mb-4">
            <FileUp className="h-4 w-4 mr-2" />
            Upload Files
          </Button>
          
          <p className="text-sm text-muted-foreground">
            Or drag and drop PDF files here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-border shadow-sm">
      <Tabs 
        defaultValue="analysis" 
        value={view === "mockExam" ? "mockExam" : "analysis"}
        onValueChange={(value) => setView(value as ExamPrepView)}
        className="p-6"
      >
        <div className="flex justify-between items-center mb-6">
          <TabsList>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="mockExam">Mock Exam</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="analysis" className="mt-0 space-y-6">
          {/* Topic Analysis Visualization */}
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Topic Analysis</h3>
            
            <div className="mb-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Topic Frequency</h4>
              
              <div className="space-y-4">
                {topicsData.map((topic) => (
                  <div key={topic.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{topic.name}</span>
                      <span className="font-medium">{topic.percentage}%</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full", topic.color)} 
                        style={{ width: `${topic.percentage}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* AI Summary/Insights */}
            <div className="bg-secondary/40 rounded-lg p-4 flex">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 mt-1">
                <Brain className="h-4 w-4" />
              </div>
              
              <div className="ml-3">
                <h4 className="font-medium text-sm">AI Analysis</h4>
                <p className="text-sm mt-1">
                  Integrals appear on almost every exam (40% of questions). Focus on integration techniques, 
                  especially substitution and parts. Derivatives and limits are secondary but still important. 
                  Consider spending 3-4 hours on integration practice, 2 hours on derivatives, and 1 hour on limits.
                </p>
              </div>
            </div>
          </Card>
          
          {/* Manage Uploaded Exams */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Uploaded Exams</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleUploadClick}
              >
                <FileUp className="h-4 w-4 mr-2" />
                Upload More
              </Button>
            </div>
            
            <div className="border rounded-md divide-y">
              {examFiles.map(file => (
                <div key={file.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-primary mr-3" />
                    <div>
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(file.uploadDate)} • {file.size}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    {file.processed ? (
                      <Badge variant="outline" className="mr-2 bg-green-50 text-green-600 border-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Analyzed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="mr-2 animate-pulse">
                        Processing...
                      </Badge>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteExam(file.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="mockExam" className="mt-0">
          {!mockExamGenerated ? (
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4">Generate Mock Exam</h3>
              
              <div className="space-y-6">
                {/* Source Selection */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Source</h4>
                  <RadioGroup 
                    value={examSource} 
                    onValueChange={(value) => setExamSource(value as ExamSource)}
                    className="flex flex-col space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pastExams" id="pastExams" />
                      <Label htmlFor="pastExams" className="font-normal">
                        Based on past exam analysis
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="manual" id="manual" />
                      <Label htmlFor="manual" className="font-normal">
                        Manual selection
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                
                {/* Topics Selection (for Manual) */}
                {examSource === "manual" && (
                  <div>
                    <h4 className="text-sm font-medium mb-3">Topics</h4>
                    <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                      <div className="grid grid-cols-2 gap-2">
                        {availableTopics.map(topic => (
                          <div key={topic} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`topic-${topic}`}
                              checked={selectedTopics.includes(topic)}
                              onCheckedChange={() => handleTopicSelect(topic)}
                            />
                            <label 
                              htmlFor={`topic-${topic}`}
                              className="text-sm"
                            >
                              {topic}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Difficulty Selection */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Difficulty</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {["easy", "medium", "hard", "mixed"].map((level) => (
                      <Button
                        key={level}
                        variant={difficulty === level ? "default" : "outline"}
                        className={cn(
                          "text-sm capitalize",
                          difficulty === level ? "" : "bg-white"
                        )}
                        onClick={() => setDifficulty(level as ExamDifficulty)}
                      >
                        {level}
                      </Button>
                    ))}
                  </div>
                </div>
                
                {/* Number of Questions */}
                <div>
                  <div className="flex justify-between mb-2">
                    <h4 className="text-sm font-medium">Number of Questions</h4>
                    <span className="text-sm">{questionCount}</span>
                  </div>
                  <Input
                    type="range"
                    min={5}
                    max={50}
                    step={5}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>5</span>
                    <span>50</span>
                  </div>
                </div>
                
                {/* Generate Button */}
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleGenerateMockExam}
                >
                  <BarChart className="h-4 w-4 mr-2" />
                  Generate Mock Exam
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-6">
              <div className="text-center py-6">
                <div className="h-16 w-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                
                <h3 className="text-xl font-medium mb-2">Mock Exam Ready</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  Your mock exam has been generated based on your specifications. It contains {questionCount} questions covering key topics.
                </p>
                
                <div className="bg-secondary/30 rounded-lg p-4 mb-6 max-w-md mx-auto">
                  <div className="text-left space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Difficulty</span>
                      <span className="text-sm font-medium capitalize">{difficulty}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Questions</span>
                      <span className="text-sm font-medium">{questionCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Source</span>
                      <span className="text-sm font-medium">
                        {examSource === "pastExams" ? "Past Exam Analysis" : "Manual Selection"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Estimated Time</span>
                      <span className="text-sm font-medium">{Math.round(questionCount * 1.5)} min</span>
                    </div>
                  </div>
                </div>
                
                <Button
                  size="lg"
                  onClick={handleStartExam}
                  className="px-6"
                >
                  Start Mock Exam
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                
                <div className="mt-4">
                  <Button
                    variant="link"
                    onClick={() => setMockExamGenerated(false)}
                  >
                    Modify Settings
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExamPrepContent;
