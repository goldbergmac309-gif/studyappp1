
import { useState, useEffect } from "react";
import { Plus, List, Grid, NetworkIcon, ExternalLink, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Note, useNotes } from "@/hooks/use-notes";
import NotesList from "@/components/notes/NotesList";
import NotesGrid from "@/components/notes/NotesGrid";
import NoteEditor from "@/components/notes/NoteEditor";
import GraphView from "@/components/notes/GraphView";
import { toast } from "sonner";

interface NotesContentProps {
  subjectId: string;
}

type ViewMode = "list" | "grid" | "graph";

const NotesContent = ({ subjectId }: NotesContentProps) => {
  const { notes, createNote, updateNote, deleteNote } = useNotes(subjectId);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  
  const activeNote = activeNoteId 
    ? notes.find(note => note.id === activeNoteId) 
    : null;

  const handleCreateNote = () => {
    const newNote = createNote();
    setActiveNoteId(newNote.id);
    toast.success("New note created");
  };

  const handleSaveNote = (updatedNote: Note) => {
    updateNote(updatedNote);
    toast.success("Note saved");
  };

  const handleDeleteNote = (noteId: string) => {
    deleteNote(noteId);
    if (activeNoteId === noteId) {
      setActiveNoteId(null);
    }
    toast.success("Note deleted");
  };

  const handleSelectNote = (noteId: string) => {
    setActiveNoteId(noteId);
  };

  // If the note being viewed doesn't exist anymore, reset to list view
  useEffect(() => {
    if (activeNoteId && !notes.some(note => note.id === activeNoteId)) {
      setActiveNoteId(null);
    }
  }, [notes, activeNoteId]);

  if (activeNoteId) {
    return (
      <div className="h-full">
        <div className="flex items-center space-x-2 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setActiveNoteId(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
            Back to notes
          </Button>
          {activeNote && <span className="text-muted-foreground">•</span>}
          {activeNote && <span className="text-muted-foreground">{activeNote.title || "Untitled Note"}</span>}
        </div>
        {activeNote && (
          <NoteEditor 
            note={activeNote} 
            onSave={handleSaveNote} 
            onDelete={() => handleDeleteNote(activeNote.id)}
            notes={notes}
          />
        )}
      </div>
    );
  }

  if (viewMode === "graph") {
    return (
      <div className="h-full">
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setViewMode("list")}
              className="flex items-center"
            >
              <List className="h-4 w-4 mr-2" />
              Back to notes
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleCreateNote}
              className="flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Note
            </Button>
          </div>
        </div>
        
        <GraphView 
          notes={notes} 
          onSelectNote={handleSelectNote} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <div className="border rounded-md p-1 flex">
            <Button 
              variant={viewMode === "list" ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setViewMode("list")}
              className="h-8 w-8 p-0"
            >
              <List className="h-4 w-4" />
              <span className="sr-only">List view</span>
            </Button>
            <Button 
              variant={viewMode === "grid" ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setViewMode("grid")}
              className="h-8 w-8 p-0"
            >
              <Grid className="h-4 w-4" />
              <span className="sr-only">Grid view</span>
            </Button>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setViewMode("graph")}
            className="flex items-center"
          >
            <NetworkIcon className="h-4 w-4 mr-2" />
            View Graph
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleCreateNote}
            className="flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Note
          </Button>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
            <ExternalLink className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-medium mb-2">Create your first note</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Notes help you organize your thoughts and connect ideas with [[wiki-style links]]
          </p>
          <Button onClick={handleCreateNote}>
            <Plus className="h-4 w-4 mr-2" />
            New Note
          </Button>
        </div>
      ) : viewMode === "list" ? (
        <NotesList 
          notes={notes} 
          onSelectNote={handleSelectNote} 
          onDeleteNote={handleDeleteNote}
        />
      ) : (
        <NotesGrid 
          notes={notes} 
          onSelectNote={handleSelectNote}
          onDeleteNote={handleDeleteNote}
        />
      )}
    </div>
  );
};

export default NotesContent;
