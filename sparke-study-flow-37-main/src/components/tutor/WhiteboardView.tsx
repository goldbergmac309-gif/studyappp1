
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Pen, 
  Eraser, 
  Square, 
  Circle, 
  Type, 
  Palette, 
  Download, 
  Save,
  Undo,
  Redo
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DrawingTool = "pen" | "eraser" | "square" | "circle" | "text";

const colors = [
  "#000000", // Black
  "#4B5563", // Gray
  "#EF4444", // Red
  "#F59E0B", // Amber
  "#10B981", // Green
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#EC4899", // Pink
];

const WhiteboardView = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTool, setActiveTool] = useState<DrawingTool>("pen");
  const [activeColor, setActiveColor] = useState(colors[0]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastX, setLastX] = useState(0);
  const [lastY, setLastY] = useState(0);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    
    if (context) {
      // Set canvas to full size of container
      const resizeCanvas = () => {
        const container = canvas.parentElement;
        if (container) {
          canvas.width = container.clientWidth;
          canvas.height = container.clientHeight;
          
          // Fill with white background
          context.fillStyle = "#FFFFFF";
          context.fillRect(0, 0, canvas.width, canvas.height);
        }
      };

      resizeCanvas();
      window.addEventListener("resize", resizeCanvas);
      setCtx(context);

      return () => {
        window.removeEventListener("resize", resizeCanvas);
      };
    }
  }, []);

  useEffect(() => {
    if (!ctx) return;
    
    ctx.strokeStyle = activeTool === "eraser" ? "#FFFFFF" : activeColor;
    ctx.lineWidth = activeTool === "eraser" ? 15 : 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [activeTool, activeColor, ctx]);

  const startDrawing = (e: React.MouseEvent) => {
    if (!ctx) return;

    const rect = canvasRef.current!.getBoundingClientRect();
    setLastX(e.clientX - rect.left);
    setLastY(e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing || !ctx) return;
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    if (activeTool === "pen" || activeTool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(currentX, currentY);
      ctx.stroke();
    } else if (activeTool === "square") {
      // For squares, we'll handle drawing on mouse up
    } else if (activeTool === "circle") {
      // For circles, we'll handle drawing on mouse up
    }

    setLastX(currentX);
    setLastY(currentY);
  };

  const stopDrawing = (e: React.MouseEvent) => {
    if (!isDrawing || !ctx) return;
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    if (activeTool === "square") {
      ctx.beginPath();
      const width = currentX - lastX;
      const height = currentY - lastY;
      ctx.rect(lastX, lastY, width, height);
      ctx.stroke();
    } else if (activeTool === "circle") {
      ctx.beginPath();
      const radius = Math.sqrt(
        Math.pow(currentX - lastX, 2) + Math.pow(currentY - lastY, 2)
      );
      ctx.arc(lastX, lastY, radius, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (activeTool === "text") {
      const text = prompt("Enter text:");
      if (text) {
        ctx.font = "16px Arial";
        ctx.fillStyle = activeColor;
        ctx.fillText(text, lastX, lastY);
      }
    }

    setIsDrawing(false);
  };

  const handleSaveImage = () => {
    if (!canvasRef.current) return;
    
    // Create a link element
    const link = document.createElement("a");
    link.download = `whiteboard-${Date.now()}.png`;
    
    // Convert canvas to data URL
    link.href = canvasRef.current.toDataURL("image/png");
    
    // Simulate click to trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-border">
      {/* Toolbar */}
      <div className="p-2 border-b border-border flex items-center gap-2">
        <div className="flex items-center gap-1 pr-2 border-r border-border">
          <ToolButton 
            tool="pen" 
            activeTool={activeTool} 
            onClick={() => setActiveTool("pen")}
            icon={<Pen className="h-4 w-4" />} 
          />
          <ToolButton 
            tool="eraser" 
            activeTool={activeTool} 
            onClick={() => setActiveTool("eraser")}
            icon={<Eraser className="h-4 w-4" />} 
          />
          <ToolButton 
            tool="square" 
            activeTool={activeTool} 
            onClick={() => setActiveTool("square")}
            icon={<Square className="h-4 w-4" />} 
          />
          <ToolButton 
            tool="circle" 
            activeTool={activeTool} 
            onClick={() => setActiveTool("circle")}
            icon={<Circle className="h-4 w-4" />} 
          />
          <ToolButton 
            tool="text" 
            activeTool={activeTool} 
            onClick={() => setActiveTool("text")}
            icon={<Type className="h-4 w-4" />} 
          />
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              className="w-8 h-8"
              style={{ backgroundColor: activeColor }}
            >
              <Palette className="h-4 w-4 text-white" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="flex flex-wrap gap-2 w-40">
              {colors.map((color) => (
                <button
                  key={color}
                  className={cn(
                    "w-8 h-8 rounded-md border",
                    activeColor === color ? "ring-2 ring-primary" : ""
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => setActiveColor(color)}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => console.log("Undo")}>
            <Undo className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => console.log("Redo")}>
            <Redo className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="secondary" onClick={handleSaveImage}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={() => setIsDrawing(false)}
        />
      </div>
    </div>
  );
};

interface ToolButtonProps {
  tool: DrawingTool;
  activeTool: DrawingTool;
  onClick: () => void;
  icon: React.ReactNode;
}

const ToolButton = ({ tool, activeTool, onClick, icon }: ToolButtonProps) => (
  <Button
    variant={activeTool === tool ? "default" : "ghost"}
    size="icon"
    className="w-8 h-8"
    onClick={onClick}
  >
    {icon}
  </Button>
);

export default WhiteboardView;
