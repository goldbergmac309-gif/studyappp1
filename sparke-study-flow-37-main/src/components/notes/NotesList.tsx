
import { useState } from "react";
import { format } from "date-fns";
import { MoreHorizontal, Trash, Edit } from "lucide-react";
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

interface NotesListProps {
  notes: Note[];
  onSelectNote: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
}

const NotesList = ({ notes, onSelectNote, onDeleteNote }: NotesListProps) => {
  const sortedNotes = [...notes].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  );

  const getContentPreview = (content: string) => {
    // Strip wiki links and get plain text preview
    const plainText = content.replace(/\[\[(.*?)\]\]/g, "$1");
    return plainText.length > 120 
      ? plainText.substring(0, 120) + "..." 
      : plainText;
  };

  return (
    <div className="space-y-2">
      {sortedNotes.map((note) => (
        <ContextMenu key={note.id}>
          <ContextMenuTrigger>
            <div 
              className="p-4 border rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer group"
              onClick={() => onSelectNote(note.id)}
            >
              <div className="flex justify-between items-start">
                <h3 className="font-medium">
                  {note.title || "Untitled Note"}
                </h3>
                <div className="flex items-center">
                  <span className="text-xs text-muted-foreground">
                    {format(note.updatedAt, "MMM d, yyyy")}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
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
              </div>
              <p className="text-muted-foreground text-sm mt-2">
                {getContentPreview(note.content) || "No content"}
              </p>
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

export default NotesList;
