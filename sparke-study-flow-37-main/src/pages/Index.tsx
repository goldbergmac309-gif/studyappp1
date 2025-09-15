
import Header from "@/components/Header";
import QuickActions from "@/components/QuickActions";
import LearningPrompt from "@/components/LearningPrompt";
import SubjectsSection from "@/components/SubjectsSection";
import TopicsExplorer from "@/components/TopicsExplorer";
import { useSparkPanel } from "@/contexts/SparkPanelContext";

const Index = () => {
  const { isSparkPanelOpen } = useSparkPanel();
  
  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />
      
      <main className={`px-4 md:px-6 py-8 max-w-7xl mx-auto transition-all ${isSparkPanelOpen ? 'mr-[400px]' : ''}`}>
        <div className="mb-14">
          <QuickActions />
        </div>
        
        <div className="mb-14">
          <LearningPrompt />
        </div>
        
        <div className="mb-16">
          <SubjectsSection />
        </div>
        
        <div className="mb-16">
          <TopicsExplorer />
        </div>
      </main>
    </div>
  );
};

export default Index;
