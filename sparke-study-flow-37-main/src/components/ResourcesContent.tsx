
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { 
  File, 
  FileText, 
  FileImage, 
  FileArchive, 
  Folder, 
  UploadCloud, 
  LayoutGrid, 
  LayoutList,
  ChevronRight,
  Eye,
  Pencil,
  Download,
  FolderSymlink,
  Trash2,
  Bot,
  StickyNote,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { generateId } from "@/lib/utils";

// Types for our file system
interface ResourceFile {
  id: string;
  name: string;
  type: string; // "pdf", "image", "document", etc.
  size: string;
  modified: string;
  path: string[];
}

interface ResourceFolder {
  id: string;
  name: string;
  path: string[];
}

type ResourceItem = ResourceFile | ResourceFolder;
type ViewMode = "grid" | "list";

// Function to determine if item is a file or folder
const isFile = (item: ResourceItem): item is ResourceFile => {
  return 'type' in item;
};

// Helper to get icon based on file type
const getFileIcon = (type: string) => {
  switch (type) {
    case "pdf":
    case "doc":
    case "docx":
    case "txt":
      return <FileText className="h-10 w-10 text-blue-500" />;
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
      return <FileImage className="h-10 w-10 text-purple-500" />;
    case "zip":
    case "rar":
      return <FileArchive className="h-10 w-10 text-amber-500" />;
    default:
      return <File className="h-10 w-10 text-gray-500" />;
  }
};

// Function to format date string
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

// Sample data generator for the current subject
const generateSampleData = (subjectId: string): { files: ResourceFile[], folders: ResourceFolder[] } => {
  // Different sample data based on subject
  if (subjectId === "3") { // Biology
    return {
      files: [
        {
          id: "file1",
          name: "Cell Structure.pdf",
          type: "pdf",
          size: "2.4 MB",
          modified: "2025-03-10T14:48:00",
          path: []
        },
        {
          id: "file2",
          name: "Photosynthesis Diagram.jpg",
          type: "jpg",
          size: "1.7 MB", 
          modified: "2025-03-12T09:15:00",
          path: []
        },
        {
          id: "file3",
          name: "Genetics Notes.docx",
          type: "docx",
          size: "540 KB",
          modified: "2025-04-01T11:30:00",
          path: []
        }
      ],
      folders: [
        {
          id: "folder1",
          name: "Lecture Slides",
          path: []
        },
        {
          id: "folder2",
          name: "Lab Reports",
          path: []
        }
      ]
    };
  } else {
    // Default empty state
    return {
      files: [],
      folders: []
    };
  }
};

const ResourcesContent = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [files, setFiles] = useState<ResourceFile[]>([]);
  const [folders, setFolders] = useState<ResourceFolder[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  // Initialize with sample data
  useEffect(() => {
    const sampleData = generateSampleData(subjectId || "");
    setFiles(sampleData.files);
    setFolders(sampleData.folders);
  }, [subjectId]);

  // Get current directory items
  const currentFiles = files.filter(file => 
    JSON.stringify(file.path) === JSON.stringify(currentPath)
  );
  
  const currentFolders = folders.filter(folder => 
    JSON.stringify(folder.path) === JSON.stringify(currentPath)
  );

  // Handle folder navigation
  const navigateToFolder = (folder: ResourceFolder) => {
    setCurrentPath([...folder.path, folder.name]);
  };

  const navigateUp = () => {
    if (currentPath.length > 0) {
      setCurrentPath(currentPath.slice(0, -1));
    }
  };

  const navigateToBreadcrumb = (index: number) => {
    setCurrentPath(currentPath.slice(0, index));
  };

  // File/Folder action handlers
  const handlePreview = (file: ResourceFile) => {
    toast.info(`Opening preview for ${file.name}`);
  };

  const handleRename = (item: ResourceItem) => {
    // In a real app, we would show a rename modal
    toast.info(`Rename functionality would open for ${item.name}`);
  };

  const handleDownload = (file: ResourceFile) => {
    toast.success(`Started download for ${file.name}`);
  };

  const handleDelete = (item: ResourceItem) => {
    if (isFile(item)) {
      setFiles(files.filter(f => f.id !== item.id));
      toast.success(`Deleted ${item.name}`);
    } else {
      setFolders(folders.filter(f => f.id !== item.id));
      toast.success(`Deleted folder ${item.name}`);
    }
  };

  const handleSummarize = (file: ResourceFile) => {
    toast.info(`AI summarizing ${file.name}...`);
  };

  const handleAskAI = (file: ResourceFile) => {
    toast.info(`Opening AI chat for ${file.name}`);
  };

  const handleAddToNotes = (file: ResourceFile) => {
    toast.success(`Added ${file.name} to your notes`);
  };

  // Drag and drop handling
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
    
    // In a real app, this would handle actual file uploads
    // from the FileList in e.dataTransfer.files
    
    if (e.dataTransfer.files.length > 0) {
      const newFiles: ResourceFile[] = [];
      
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        const extension = file.name.split('.').pop() || "";
        
        newFiles.push({
          id: generateId(),
          name: file.name,
          type: extension,
          size: `${(file.size / 1024).toFixed(1)} KB`,
          modified: new Date().toISOString(),
          path: [...currentPath]
        });
      }
      
      setFiles([...files, ...newFiles]);
      toast.success(`Uploaded ${newFiles.length} files`);
    }
  };

  const handleUploadClick = () => {
    // In a real app, this would trigger a file input
    toast.info("Upload file dialog would open here");
  };

  // Create new folder
  const handleCreateFolder = () => {
    const newFolder: ResourceFolder = {
      id: generateId(),
      name: "New Folder",
      path: [...currentPath]
    };
    
    setFolders([...folders, newFolder]);
    toast.success("Created new folder");
  };

  const isEmpty = currentFiles.length === 0 && currentFolders.length === 0;

  return (
    <div className="bg-white rounded-lg border border-border shadow-sm p-6">
      {/* Header with breadcrumbs and actions */}
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {currentPath.length > 0 && (
              <button
                onClick={navigateUp}
                className="ml-2 p-1 rounded-full hover:bg-secondary/70"
                aria-label="Go back"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="border rounded-md flex">
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-2 transition-colors",
                  viewMode === "list" ? "bg-secondary text-primary" : "hover:bg-secondary/50"
                )}
                aria-label="List view"
              >
                <LayoutList className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-2 transition-colors",
                  viewMode === "grid" ? "bg-secondary text-primary" : "hover:bg-secondary/50"
                )}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateFolder}
            >
              <Folder className="h-4 w-4 mr-2" />
              New Folder
            </Button>
            
            <Button
              variant="default"
              size="sm"
              onClick={handleUploadClick}
            >
              <UploadCloud className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
          </div>
        </div>
        
        {/* Breadcrumbs */}
        <div className="flex items-center text-sm">
          <button
            onClick={() => setCurrentPath([])}
            className={cn(
              "text-primary hover:underline",
              currentPath.length === 0 && "font-medium"
            )}
          >
            Resources
          </button>
          
          {currentPath.map((folder, index) => (
            <div key={index} className="flex items-center">
              <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />
              <button
                onClick={() => navigateToBreadcrumb(index + 1)}
                className={cn(
                  "hover:underline",
                  index === currentPath.length - 1 && "font-medium"
                )}
              >
                {folder}
              </button>
            </div>
          ))}
        </div>
      </div>
      
      {/* Main content area with drag/drop support */}
      <div
        className={cn(
          "min-h-[400px] rounded-lg border-2 border-dashed transition-colors",
          isDragging ? "border-primary/50 bg-primary/5" : "border-border",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <UploadCloud className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No files yet</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              Upload your lecture slides, readings, and images here, or drag and drop files to get started.
            </p>
            <Button onClick={handleUploadClick}>
              <UploadCloud className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
          </div>
        ) : viewMode === "list" ? (
          // List View
          <div className="divide-y">
            {/* Folders */}
            {currentFolders.map((folder) => (
              <ContextMenu key={folder.id}>
                <ContextMenuTrigger>
                  <div
                    className="py-3 px-4 flex items-center hover:bg-secondary/50 cursor-pointer"
                    onClick={() => navigateToFolder(folder)}
                  >
                    <Folder className="h-5 w-5 text-amber-500 mr-3" />
                    <span className="flex-1 font-medium">{folder.name}</span>
                    <span className="text-sm text-muted-foreground">Folder</span>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-64">
                  <ContextMenuItem onClick={() => navigateToFolder(folder)}>
                    <Folder className="h-4 w-4 mr-2" />
                    Open
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleRename(folder)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Rename
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem 
                    className="text-destructive focus:text-destructive" 
                    onClick={() => handleDelete(folder)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
            
            {/* Files */}
            {currentFiles.map((file) => (
              <ContextMenu key={file.id}>
                <ContextMenuTrigger>
                  <div className="py-3 px-4 flex items-center hover:bg-secondary/50">
                    {getFileIcon(file.type)}
                    <div className="ml-3 flex-1">
                      <div className="font-medium">{file.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(file.modified)} · {file.size}
                      </div>
                    </div>
                    <button 
                      className="p-1 rounded-full hover:bg-secondary/70 text-muted-foreground"
                      onClick={() => handlePreview(file)}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="p-1 rounded-full hover:bg-secondary/70 text-muted-foreground">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-64">
                  <ContextMenuItem onClick={() => handlePreview(file)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleRename(file)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Rename
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleDownload(file)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => handleSummarize(file)}>
                    <Bot className="h-4 w-4 mr-2" />
                    Summarize with AI
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleAskAI(file)}>
                    <Bot className="h-4 w-4 mr-2" />
                    Ask AI about this
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleAddToNotes(file)}>
                    <StickyNote className="h-4 w-4 mr-2" />
                    Add to Notes
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem 
                    className="text-destructive focus:text-destructive" 
                    onClick={() => handleDelete(file)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </div>
        ) : (
          // Grid View
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
            {/* Folders */}
            {currentFolders.map((folder) => (
              <ContextMenu key={folder.id}>
                <ContextMenuTrigger>
                  <div
                    className="flex flex-col items-center p-4 rounded-lg border border-transparent hover:border-border hover:bg-secondary/30 cursor-pointer transition-colors"
                    onClick={() => navigateToFolder(folder)}
                  >
                    <Folder className="h-16 w-16 text-amber-500 mb-2" />
                    <span className="text-center font-medium truncate w-full">{folder.name}</span>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-64">
                  <ContextMenuItem onClick={() => navigateToFolder(folder)}>
                    <Folder className="h-4 w-4 mr-2" />
                    Open
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleRename(folder)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Rename
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem 
                    className="text-destructive focus:text-destructive" 
                    onClick={() => handleDelete(folder)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
            
            {/* Files */}
            {currentFiles.map((file) => (
              <ContextMenu key={file.id}>
                <ContextMenuTrigger>
                  <div className="flex flex-col items-center p-4 rounded-lg border border-transparent hover:border-border hover:bg-secondary/30 transition-colors">
                    {getFileIcon(file.type)}
                    <span className="text-center mt-2 font-medium truncate w-full">{file.name}</span>
                    <span className="text-xs text-muted-foreground mt-1">
                      {file.size}
                    </span>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-64">
                  <ContextMenuItem onClick={() => handlePreview(file)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleRename(file)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Rename
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleDownload(file)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => handleSummarize(file)}>
                    <Bot className="h-4 w-4 mr-2" />
                    Summarize with AI
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleAskAI(file)}>
                    <Bot className="h-4 w-4 mr-2" />
                    Ask AI about this
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleAddToNotes(file)}>
                    <StickyNote className="h-4 w-4 mr-2" />
                    Add to Notes
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem 
                    className="text-destructive focus:text-destructive" 
                    onClick={() => handleDelete(file)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </div>
        )}
      </div>
      
      {/* Visual indicator when dragging */}
      {isDragging && (
        <div className="absolute inset-0 bg-primary/5 border-2 border-dashed border-primary/30 rounded-lg flex items-center justify-center pointer-events-none">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <p className="font-medium">Drop files to upload</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourcesContent;
