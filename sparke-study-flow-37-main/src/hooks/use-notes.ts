
import { useState, useEffect } from "react";
import { generateId } from "@/lib/utils";

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  subjectId: string;
}

export interface NoteLink {
  source: string;
  target: string;
}

export function useNotes(subjectId: string) {
  const [notes, setNotes] = useState<Note[]>([]);

  // Load notes from localStorage on initial render
  useEffect(() => {
    const storedNotes = localStorage.getItem(`notes-${subjectId}`);
    if (storedNotes) {
      try {
        const parsedNotes = JSON.parse(storedNotes);
        // Convert string dates back to Date objects
        const formattedNotes = parsedNotes.map((note: any) => ({
          ...note,
          createdAt: new Date(note.createdAt),
          updatedAt: new Date(note.updatedAt)
        }));
        setNotes(formattedNotes);
      } catch (error) {
        console.error("Failed to parse stored notes:", error);
      }
    }
  }, [subjectId]);

  // Save notes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(`notes-${subjectId}`, JSON.stringify(notes));
  }, [notes, subjectId]);

  // Create a new note
  const createNote = (): Note => {
    const now = new Date();
    const newNote: Note = {
      id: generateId(),
      title: "",
      content: "",
      createdAt: now,
      updatedAt: now,
      subjectId
    };
    
    setNotes(prevNotes => [...prevNotes, newNote]);
    return newNote;
  };

  // Update an existing note
  const updateNote = (updatedNote: Note) => {
    setNotes(prevNotes => 
      prevNotes.map(note => 
        note.id === updatedNote.id 
          ? { ...updatedNote, updatedAt: new Date() } 
          : note
      )
    );
  };

  // Delete a note
  const deleteNote = (noteId: string) => {
    setNotes(prevNotes => prevNotes.filter(note => note.id !== noteId));
  };

  // Create a new note with a specific title (for wiki-links)
  const createNoteWithTitle = (title: string): Note => {
    const now = new Date();
    const newNote: Note = {
      id: generateId(),
      title,
      content: "",
      createdAt: now,
      updatedAt: now,
      subjectId
    };
    
    setNotes(prevNotes => [...prevNotes, newNote]);
    return newNote;
  };

  // Extract all links from note content
  const extractLinks = (): NoteLink[] => {
    const links: NoteLink[] = [];
    
    notes.forEach(note => {
      const linkRegex = /\[\[(.*?)\]\]/g;
      const matches = [...note.content.matchAll(linkRegex)];
      
      matches.forEach(match => {
        const targetTitle = match[1].trim();
        let targetNote = notes.find(n => n.title.toLowerCase() === targetTitle.toLowerCase());
        
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

  // Find or create a note by title (for wiki-links)
  const findOrCreateNoteByTitle = (title: string): Note => {
    const existingNote = notes.find(
      note => note.title.toLowerCase() === title.toLowerCase()
    );
    
    if (existingNote) {
      return existingNote;
    }
    
    return createNoteWithTitle(title);
  };

  return {
    notes,
    createNote,
    updateNote,
    deleteNote,
    extractLinks,
    findOrCreateNoteByTitle
  };
}
