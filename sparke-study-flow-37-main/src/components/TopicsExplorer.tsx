
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type TopicProps = {
  title: string;
  imageSrc?: string;
};

const Topic = ({ title, imageSrc }: TopicProps) => {
  const placeholderImage = "/placeholder.svg";
  
  return (
    <div className="bg-white border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer">
      <div className="aspect-video bg-muted overflow-hidden">
        <img 
          src={imageSrc || placeholderImage} 
          alt={title} 
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-3">
        <h4 className="font-medium text-sm line-clamp-1">{title}</h4>
      </div>
    </div>
  );
};

const TopicsExplorer = () => {
  const topics = [
    {
      id: "1",
      title: "Cognitive Psychology: An Introduction",
      imageSrc: "/lovable-uploads/6b84d0f2-4c97-4821-92be-04121a0b5c8e.png"
    },
    {
      id: "2",
      title: "Neural Networks Fundamentals",
      imageSrc: ""
    },
    {
      id: "3",
      title: "Advanced Statistics",
      imageSrc: ""
    },
    {
      id: "4",
      title: "Cell Biology",
      imageSrc: ""
    }
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-lg">Explore topics</h3>
        <Button variant="ghost" size="sm" className="text-xs h-8 gap-1">
          <span>Browse all</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {topics.map((topic) => (
          <Topic 
            key={topic.id}
            title={topic.title}
            imageSrc={topic.imageSrc}
          />
        ))}
      </div>
    </div>
  );
};

export default TopicsExplorer;
