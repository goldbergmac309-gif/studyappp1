
import { useRef, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Note, NoteLink } from "@/hooks/use-notes";
import NotePreviewer from "@/components/notes/NotePreviewer";
import { X } from "lucide-react";

interface GraphViewProps {
  notes: Note[];
  onSelectNote: (noteId: string) => void;
}

interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  radius: number;
  color: string;
}

interface GraphEdge {
  source: string;
  target: string;
}

const GraphView = ({ notes, onSelectNote }: GraphViewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Note | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Extract links from notes content
  const extractLinks = (): NoteLink[] => {
    const links: NoteLink[] = [];
    
    notes.forEach(note => {
      const linkRegex = /\[\[(.*?)\]\]/g;
      const matches = [...note.content.matchAll(linkRegex)];
      
      matches.forEach(match => {
        const targetTitle = match[1].trim();
        const targetNote = notes.find(n => 
          n.title.toLowerCase() === targetTitle.toLowerCase()
        );
        
        if (targetNote) {
          links.push({
            source: note.id,
            target: targetNote.id
          });
        }
      });
    });
    
    return links;
  };

  // Initialize graph data
  useEffect(() => {
    if (!containerRef.current) return;
    
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    // Create graph nodes
    const graphNodes: GraphNode[] = notes.map((note, index) => {
      // Position nodes in a circle initially
      const angle = (index / notes.length) * 2 * Math.PI;
      const radius = Math.min(width, height) * 0.35;
      const x = width / 2 + radius * Math.cos(angle);
      const y = height / 2 + radius * Math.sin(angle);
      
      return {
        id: note.id,
        label: note.title || "Untitled Note",
        x,
        y,
        radius: 30,
        color: "#8B5CF6"  // Vivid purple from the color palette
      };
    });
    
    // Create edges from the extracted links
    const links = extractLinks();
    const graphEdges: GraphEdge[] = links.map(link => ({
      source: link.source,
      target: link.target
    }));
    
    setNodes(graphNodes);
    setEdges(graphEdges);
  }, [notes]);
  
  // Apply force-directed layout
  useEffect(() => {
    if (nodes.length === 0) return;
    
    const simulation = () => {
      const newNodes = [...nodes];
      
      // Apply forces
      for (let i = 0; i < 50; i++) {  // Run simulation steps
        // Repulsive force between nodes
        for (let i = 0; i < newNodes.length; i++) {
          for (let j = i + 1; j < newNodes.length; j++) {
            const dx = newNodes[j].x - newNodes[i].x;
            const dy = newNodes[j].y - newNodes[i].y;
            const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
            const force = 1000 / (distance * distance);
            
            const forceX = (dx / distance) * force;
            const forceY = (dy / distance) * force;
            
            newNodes[i].x -= forceX;
            newNodes[i].y -= forceY;
            newNodes[j].x += forceX;
            newNodes[j].y += forceY;
          }
        }
        
        // Attractive force for edges
        for (const edge of edges) {
          const source = newNodes.find(n => n.id === edge.source);
          const target = newNodes.find(n => n.id === edge.target);
          
          if (source && target) {
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
            const force = distance / 50;
            
            const forceX = (dx / distance) * force;
            const forceY = (dy / distance) * force;
            
            source.x += forceX;
            source.y += forceY;
            target.x -= forceX;
            target.y -= forceY;
          }
        }
      }
      
      // Contain nodes within canvas
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        const padding = 50;
        
        for (const node of newNodes) {
          node.x = Math.max(padding, Math.min(width - padding, node.x));
          node.y = Math.max(padding, Math.min(height - padding, node.y));
        }
      }
      
      setNodes(newNodes);
    };
    
    simulation();
  }, [nodes.length, edges]);
  
  // Draw the graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Set canvas size
    if (containerRef.current) {
      canvas.width = containerRef.current.clientWidth;
      canvas.height = containerRef.current.clientHeight;
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw edges
    ctx.strokeStyle = "#CBD5E1";  // Light gray
    ctx.lineWidth = 1;
    
    for (const edge of edges) {
      const source = nodes.find(n => n.id === edge.source);
      const target = nodes.find(n => n.id === edge.target);
      
      if (source && target) {
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
      }
    }
    
    // Draw nodes
    for (const node of nodes) {
      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
      
      // Selected node has a different appearance
      if (selectedNode && node.id === selectedNode.id) {
        ctx.fillStyle = "#6E59A5";  // Tertiary Purple
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#1A1F2C";  // Dark Purple
      } else {
        ctx.fillStyle = node.color;
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#fff";
      }
      
      ctx.fill();
      ctx.stroke();
      
      // Node label
      ctx.fillStyle = "#fff";
      ctx.font = "12px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        node.label.length > 15 ? node.label.substring(0, 12) + "..." : node.label, 
        node.x, 
        node.y
      );
    }
  }, [nodes, edges, selectedNode]);
  
  // Handle mouse interactions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      if (isDragging && draggedNodeId) {
        // Update the dragged node position
        setNodes(prevNodes => 
          prevNodes.map(node => 
            node.id === draggedNodeId
              ? { ...node, x: x - dragOffset.x, y: y - dragOffset.y }
              : node
          )
        );
      } else {
        // Change cursor when hovering over a node
        const hoveredNode = nodes.find(node => {
          const dx = node.x - x;
          const dy = node.y - y;
          return Math.sqrt(dx * dx + dy * dy) <= node.radius;
        });
        
        canvas.style.cursor = hoveredNode ? "pointer" : "default";
      }
    };
    
    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Check if a node was clicked
      const clickedNode = nodes.find(node => {
        const dx = node.x - x;
        const dy = node.y - y;
        return Math.sqrt(dx * dx + dy * dy) <= node.radius;
      });
      
      if (clickedNode) {
        const note = notes.find(n => n.id === clickedNode.id);
        if (note) {
          setSelectedNode(note);
        }
        
        // Start dragging
        setIsDragging(true);
        setDraggedNodeId(clickedNode.id);
        setDragOffset({
          x: x - clickedNode.x,
          y: y - clickedNode.y
        });
      } else {
        setSelectedNode(null);
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      setDraggedNodeId(null);
    };
    
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseUp);
    
    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mouseleave", handleMouseUp);
    };
  }, [nodes, isDragging, draggedNodeId, dragOffset, notes]);
  
  const handleWikiLinkClick = (title: string) => {
    const targetNote = notes.find(
      note => note.title.toLowerCase() === title.toLowerCase()
    );
    
    if (targetNote) {
      setSelectedNode(targetNote);
    }
  };
  
  return (
    <div className="h-[600px] relative" ref={containerRef}>
      <canvas 
        ref={canvasRef} 
        className="w-full h-full bg-secondary/30 rounded-lg"
      />
      
      {selectedNode && (
        <Card className="absolute top-4 right-4 w-80 max-h-[550px] overflow-auto shadow-lg">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-medium">
              {selectedNode.title || "Untitled Note"}
            </h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => setSelectedNode(null)}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          <CardContent className="p-4">
            <NotePreviewer 
              note={selectedNode} 
              onLinkClick={handleWikiLinkClick} 
            />
            <Button
              variant="secondary"
              size="sm"
              className="w-full mt-4"
              onClick={() => onSelectNote(selectedNode.id)}
            >
              Edit Note
            </Button>
          </CardContent>
        </Card>
      )}
      
      {notes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          No notes to display in the graph view
        </div>
      )}
    </div>
  );
};

export default GraphView;
