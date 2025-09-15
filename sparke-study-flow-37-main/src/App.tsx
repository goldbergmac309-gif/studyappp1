
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Subject from "./pages/Subject";
import Search from "./pages/Search";
import NotFound from "./pages/NotFound";
import AllSubjects from "./pages/AllSubjects";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import { SparkPanelProvider } from "./contexts/SparkPanelContext";
import SparkPanel from "./components/spark/SparkPanel";
import SparkPanelToggle from "./components/spark/SparkPanelToggle";
import { useSparkPanel } from "./contexts/SparkPanelContext";

const queryClient = new QueryClient();

const SparkPanelWrapper = () => {
  const { isSparkPanelOpen, toggleSparkPanel, closeSparkPanel } = useSparkPanel();
  
  return (
    <>
      <SparkPanelToggle isOpen={isSparkPanelOpen} onClick={toggleSparkPanel} />
      <SparkPanel isOpen={isSparkPanelOpen} onClose={closeSparkPanel} />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SparkPanelProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SparkPanelWrapper />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/subject/:subjectId" element={<Subject />} />
            <Route path="/search" element={<Search />} />
            <Route path="/subjects" element={<AllSubjects />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </SparkPanelProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
