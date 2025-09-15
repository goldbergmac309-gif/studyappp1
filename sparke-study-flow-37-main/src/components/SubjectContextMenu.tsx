
import { 
  Pencil, 
  Palette, 
  Archive, 
  Trash2,
  MoreHorizontal
} from "lucide-react";
import { useState } from "react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SubjectContextMenuProps {
  subjectId: string;
  subjectName: string;
  isArchived?: boolean;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
}

const SubjectContextMenu = ({ 
  subjectId, 
  subjectName, 
  isArchived = false,
  onArchive,
  onUnarchive
}: SubjectContextMenuProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const handleRename = () => {
    // In a real app, this would open a rename dialog
    toast.info("Rename subject feature coming soon");
  };
  
  const handleChangeColor = () => {
    // In a real app, this would open a color selection dialog
    toast.info("Change subject color feature coming soon");
  };
  
  const handleArchive = () => {
    if (onArchive) {
      onArchive(subjectId);
    } else {
      toast.success(`Subject "${subjectName}" archived`);
    }
  };
  
  const handleUnarchive = () => {
    if (onUnarchive) {
      onUnarchive(subjectId);
    } else {
      toast.success(`Subject "${subjectName}" unarchived`);
    }
  };
  
  const handleDelete = () => {
    setIsDeleteDialogOpen(false);
    toast.success(`Subject "${subjectName}" deleted`);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Open actions menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleRename} className="cursor-pointer">
            <Pencil className="mr-2 h-4 w-4" />
            <span>Rename</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleChangeColor} className="cursor-pointer">
            <Palette className="mr-2 h-4 w-4" />
            <span>Change Color</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isArchived ? (
            <DropdownMenuItem onClick={handleUnarchive} className="cursor-pointer">
              <Archive className="mr-2 h-4 w-4" />
              <span>Unarchive</span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={handleArchive} className="cursor-pointer">
              <Archive className="mr-2 h-4 w-4" />
              <span>Archive</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem 
            onClick={() => setIsDeleteDialogOpen(true)} 
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Subject</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{subjectName}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SubjectContextMenu;
