
import { useState, useEffect, useRef } from "react";
import { PracticeSet, PracticeSessionResults, QuizQuestion } from "./PracticeInterface";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { PenLine, PencilRuler, Send, AlertCircle } from "lucide-react";
import PracticeHelpers from "./PracticeHelpers";

// Mock quiz questions for the demo
const mockQuizQuestions: QuizQuestion[] = [
  {
    id: "q1",
    question: "What is the time complexity of a binary search algorithm?",
    options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
    correctAnswer: "O(log n)",
    type: "multiple-choice",
    explanation: "Binary search works by dividing the search interval in half each time, resulting in O(log n) complexity."
  },
  {
    id: "q2",
    question: "Is garbage collection a manual process in languages like Java?",
    options: ["True", "False"],
    correctAnswer: "False",
    type: "true-false",
    explanation: "Garbage collection in languages like Java is an automatic memory management process."
  },
  {
    id: "q3",
    question: "What data structure uses LIFO (Last In, First Out) ordering?",
    options: ["Queue", "Stack", "Linked List", "Tree"],
    correctAnswer: "Stack",
    type: "multiple-choice",
    explanation: "A stack follows LIFO principle, where the last element added is the first one to be removed."
  },
  {
    id: "q4",
    question: "Name the algorithm that sorts by repeatedly finding the minimum element from the unsorted part of the array.",
    correctAnswer: "selection sort",
    type: "short-answer",
    explanation: "Selection sort works by repeatedly selecting the smallest (or largest) element from the unsorted portion of the list and moving it to the sorted portion."
  }
];

interface QuizPlayerProps {
  set: PracticeSet;
  onComplete: (results: PracticeSessionResults) => void;
}

const QuizPlayer = ({ set, onComplete }: QuizPlayerProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string | string[]>>({});
  const [currentAnswer, setCurrentAnswer] = useState<string | string[]>("");
  const [isShowingFeedback, setIsShowingFeedback] = useState(false);
  const [startTime] = useState<Date>(new Date());
  const [questions] = useState<QuizQuestion[]>(mockQuizQuestions);
  const [isHelpersOpen, setIsHelpersOpen] = useState(false);
  
  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  
  // Check if the current answer is correct
  const isCurrentAnswerCorrect = (): boolean => {
    if (!currentQuestion) return false;
    
    if (Array.isArray(currentQuestion.correctAnswer)) {
      // Handle multiple correct answers (checkboxes)
      if (!Array.isArray(currentAnswer)) return false;
      return currentQuestion.correctAnswer.length === currentAnswer.length && 
        currentQuestion.correctAnswer.every(ans => currentAnswer.includes(ans));
    } else {
      // Single correct answer
      if (currentQuestion.type === "short-answer") {
        // For short answer, check if answer matches (case insensitive)
        return typeof currentAnswer === "string" && 
          currentAnswer.toLowerCase() === currentQuestion.correctAnswer.toLowerCase();
      } else {
        // For multiple choice or true/false
        return currentAnswer === currentQuestion.correctAnswer;
      }
    }
  };
  
  const handleSubmitAnswer = () => {
    if (!currentQuestion || !currentAnswer) return;
    
    // Save the answer
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: currentAnswer
    }));
    
    // Show feedback before moving to next question
    setIsShowingFeedback(true);
  };
  
  const handleNextQuestion = () => {
    setIsShowingFeedback(false);
    
    if (isLastQuestion) {
      // Calculate results and complete the session
      const correctCount = Object.keys(userAnswers).filter(questionId => {
        const question = questions.find(q => q.id === questionId);
        const userAnswer = userAnswers[questionId];
        
        if (!question) return false;
        
        if (Array.isArray(question.correctAnswer)) {
          if (!Array.isArray(userAnswer)) return false;
          return question.correctAnswer.length === userAnswer.length && 
            question.correctAnswer.every(ans => userAnswer.includes(ans));
        } else {
          if (question.type === "short-answer") {
            return typeof userAnswer === "string" && 
              userAnswer.toLowerCase() === question.correctAnswer.toLowerCase();
          } else {
            return userAnswer === question.correctAnswer;
          }
        }
      }).length;
      
      const endTime = new Date();
      const timeSpent = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      
      const results: PracticeSessionResults = {
        totalQuestions: questions.length,
        correctAnswers: correctCount,
        timeSpent,
        completedAt: endTime
      };
      
      onComplete(results);
    } else {
      // Move to next question
      setCurrentQuestionIndex(prev => prev + 1);
      setCurrentAnswer("");
    }
  };
  
  return (
    <div className="h-full flex flex-col relative">
      {/* Progress bar */}
      <div className="p-4 border-b border-border">
        <div className="flex justify-between items-center text-sm text-muted-foreground mb-2">
          <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
          <span>{set.title}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
      
      {/* Question and answer area */}
      <div className="flex-1 overflow-auto p-6">
        <Card className="max-w-3xl mx-auto">
          <CardHeader className="pb-2">
            <h3 className="text-xl font-medium">
              {currentQuestion?.question}
            </h3>
          </CardHeader>
          <CardContent>
            {/* Answer inputs based on question type */}
            {currentQuestion?.type === "multiple-choice" && (
              <RadioGroup 
                value={currentAnswer as string} 
                onValueChange={setCurrentAnswer}
                className="space-y-3"
                disabled={isShowingFeedback}
              >
                {currentQuestion.options?.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value={option} 
                      id={`option-${index}`} 
                    />
                    <Label 
                      htmlFor={`option-${index}`}
                      className="flex-1 cursor-pointer py-2"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
            
            {currentQuestion?.type === "true-false" && (
              <RadioGroup 
                value={currentAnswer as string} 
                onValueChange={setCurrentAnswer}
                className="space-y-3"
                disabled={isShowingFeedback}
              >
                {currentQuestion.options?.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value={option} 
                      id={`option-${index}`} 
                    />
                    <Label 
                      htmlFor={`option-${index}`}
                      className="flex-1 cursor-pointer py-2"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
            
            {currentQuestion?.type === "short-answer" && (
              <div className="space-y-2">
                <Label htmlFor="short-answer">Enter your answer:</Label>
                <Input
                  id="short-answer"
                  placeholder="Type your answer here"
                  value={currentAnswer as string}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  disabled={isShowingFeedback}
                  className="w-full"
                />
              </div>
            )}
            
            {/* Feedback area (showing after submission) */}
            {isShowingFeedback && (
              <div className={`mt-4 p-4 rounded-md ${
                isCurrentAnswerCorrect() ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              }`}>
                <div className="font-medium mb-1">
                  {isCurrentAnswerCorrect() ? "Correct!" : "Incorrect"}
                </div>
                {currentQuestion?.explanation && (
                  <div className="text-sm">
                    <strong>Explanation:</strong> {currentQuestion.explanation}
                  </div>
                )}
                {!isCurrentAnswerCorrect() && (
                  <div className="text-sm mt-1">
                    <strong>Correct answer:</strong> {
                      Array.isArray(currentQuestion?.correctAnswer) 
                        ? currentQuestion?.correctAnswer.join(", ")
                        : currentQuestion?.correctAnswer
                    }
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setIsHelpersOpen(true)}
              className="gap-2"
            >
              <PencilRuler className="h-4 w-4" />
              Study Aids
            </Button>
            
            {!isShowingFeedback ? (
              <Button 
                onClick={handleSubmitAnswer} 
                disabled={!currentAnswer || currentAnswer.length === 0}
              >
                <Send className="h-4 w-4 mr-2" />
                Submit Answer
              </Button>
            ) : (
              <Button onClick={handleNextQuestion}>
                {isLastQuestion ? "See Results" : "Next Question"}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
      
      {/* Practice helpers (whiteboard, AI hints) */}
      <PracticeHelpers 
        isOpen={isHelpersOpen} 
        onClose={() => setIsHelpersOpen(false)}
        currentQuestion={currentQuestion}
      />
    </div>
  );
};

export default QuizPlayer;
