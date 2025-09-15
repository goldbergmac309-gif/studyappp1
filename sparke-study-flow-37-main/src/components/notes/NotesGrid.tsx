
import { File, MoreHorizontal, Trash, Edit } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Note } from "@/hooks/use-notes";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface NotesGridProps {
  notes: Note[];
  onSelectNote: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
}

const NotesGrid = ({ notes, onSelectNote, onDeleteNote }: NotesGridProps) => {
  const sortedNotes = [...notes].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {sortedNotes.map((note) => (
        <ContextMenu key={note.id}>
          <ContextMenuTrigger>
            <div 
              className="p-4 border rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer h-40 flex flex-col group"
              onClick={() => onSelectNote(note.id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <File className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium truncate" title={note.title || "Untitled Note"}>
                    {note.title || "Untitled Note"}
                  </h3>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onSelectNote(note.id)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNote(note.id);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-2 flex-1 overflow-hidden">
                <p className="text-muted-foreground text-sm line-clamp-3">
                  {note.content.replace(/\[\[(.*?)\]\]/g, "$1") || "No content"}
                </p>
              </div>
              <div className="mt-auto pt-2 text-xs text-muted-foreground">
                {format(note.updatedAt, "MMM d, yyyy")}
              </div>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => onSelectNote(note.id)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </ContextMenuItem>
            <ContextMenuItem 
              onClick={() => onDeleteNote(note.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash className="h-4 w-4 mr-2" />
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ))}
    </div>
  );
};

export default NotesGrid;
