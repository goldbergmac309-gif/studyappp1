
import { useState, useEffect, useRef } from "react";
import { Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, Save, MessageSquare, ZapIcon, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Note } from "@/hooks/use-notes";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

interface NoteEditorProps {
  note: Note;
  notes: Note[];
  onSave: (note: Note) => void;
  onDelete: () => void;
}

const NoteEditor = ({ note, notes, onSave, onDelete }: NoteEditorProps) => {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionPos, setSuggestionPos] = useState({ start: 0, end: 0 });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectionRange, setSelectionRange] = useState<[number, number] | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Save note when content changes (auto-save)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (note.title !== title || note.content !== content) {
        onSave({
          ...note,
          title,
          content
        });
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [title, content, note, onSave]);

  // Handle wiki-style link detection
  useEffect(() => {
    if (!content) return;

    const lastBracketPair = findLastIncompleteBracketPair(content);
    if (lastBracketPair) {
      const { start, end, query } = lastBracketPair;
      
      // Filter existing note titles that match the query
      const filtered = notes
        .filter(n => n.id !== note.id && n.title.toLowerCase().includes(query.toLowerCase()))
        .map(n => n.title)
        .slice(0, 5);
      
      setSuggestions(filtered);
      setSuggestionPos({ start, end });
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [content, notes, note.id]);

  const findLastIncompleteBracketPair = (text: string) => {
    const matches = [...text.matchAll(/\[\[([^\[\]]*?)(?=\]\]|$)/g)];
    if (matches.length === 0) return null;
    
    const lastMatch = matches[matches.length - 1];
    const query = lastMatch[1] || "";
    const start = lastMatch.index || 0;
    const end = start + lastMatch[0].length;
    
    return { start, end, query };
  };

  const insertTextAtCursor = (textToInsert: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const before = content.substring(0, suggestionPos.start);
    const after = content.substring(suggestionPos.end);
    const newText = `${before}[[${textToInsert}]]${after}`;
    
    setContent(newText);
    setShowSuggestions(false);
    
    // Focus back on textarea and set cursor position after the inserted text
    setTimeout(() => {
      textarea.focus();
      const newPosition = before.length + textToInsert.length + 4; // +4 for the [[ and ]]
      textarea.selectionStart = textarea.selectionEnd = newPosition;
    }, 0);
  };

  const handleTextSelection = () => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    
    if (start !== end) {
      setSelectionRange([start, end]);
    } else {
      setSelectionRange(null);
    }
  };

  const applyFormatting = (format: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    let formattedText = "";
    let newCursorPos = end;
    
    switch (format) {
      case "bold":
        formattedText = `**${selectedText}**`;
        newCursorPos = end + 4;
        break;
      case "italic":
        formattedText = `*${selectedText}*`;
        newCursorPos = end + 2;
        break;
      case "h1":
        formattedText = `# ${selectedText}`;
        newCursorPos = end + 2;
        break;
      case "h2":
        formattedText = `## ${selectedText}`;
        newCursorPos = end + 3;
        break;
      case "h3":
        formattedText = `### ${selectedText}`;
        newCursorPos = end + 4;
        break;
      case "ul":
        formattedText = `- ${selectedText}`;
        newCursorPos = end + 2;
        break;
      case "ol":
        formattedText = `1. ${selectedText}`;
        newCursorPos = end + 3;
        break;
      case "link":
        formattedText = `[[${selectedText}]]`;
        newCursorPos = end + 4;
        break;
      default:
        return;
    }
    
    const newContent = content.substring(0, start) + formattedText + content.substring(end);
    setContent(newContent);
    
    // Set cursor position after the inserted formatting
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + formattedText.length;
    }, 0);
  };

  const handleAiAction = (action: string) => {
    if (!textareaRef.current || !selectionRange) return;
    
    const [start, end] = selectionRange;
    const selectedText = content.substring(start, end);
    
    // In a real app, this would call an AI API
    toast.success(`AI would ${action}: "${selectedText}"`);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <div className="flex space-x-1 border rounded-md p-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => applyFormatting("bold")}
            className="h-8 w-8 p-0"
          >
            <Bold className="h-4 w-4" />
            <span className="sr-only">Bold</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => applyFormatting("italic")}
            className="h-8 w-8 p-0"
          >
            <Italic className="h-4 w-4" />
            <span className="sr-only">Italic</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => applyFormatting("h1")}
            className="h-8 w-8 p-0"
          >
            <Heading1 className="h-4 w-4" />
            <span className="sr-only">Heading 1</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => applyFormatting("h2")}
            className="h-8 w-8 p-0"
          >
            <Heading2 className="h-4 w-4" />
            <span className="sr-only">Heading 2</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => applyFormatting("h3")}
            className="h-8 w-8 p-0"
          >
            <Heading3 className="h-4 w-4" />
            <span className="sr-only">Heading 3</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => applyFormatting("ul")}
            className="h-8 w-8 p-0"
          >
            <List className="h-4 w-4" />
            <span className="sr-only">Bullet List</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => applyFormatting("ol")}
            className="h-8 w-8 p-0"
          >
            <ListOrdered className="h-4 w-4" />
            <span className="sr-only">Numbered List</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => applyFormatting("link")}
            className="h-8 w-8 p-0"
          >
            <span className="text-xs font-bold">[[]]</span>
            <span className="sr-only">Wiki Link</span>
          </Button>
        </div>
        
        <div className="flex space-x-2">
          {selectionRange && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <ZapIcon className="h-4 w-4 mr-2" />
                  AI Actions
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48">
                <div className="space-y-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => handleAiAction("summarize")}
                  >
                    <ZapIcon className="h-4 w-4 mr-2" />
                    Summarize
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => handleAiAction("explain")}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Explain Term
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => handleAiAction("create flashcards")}
                  >
                    <ZapIcon className="h-4 w-4 mr-2" />
                    Create Flashcards
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
          
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={onDelete}
          >
            <Trash className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>
      
      <Input
        placeholder="Note title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="text-lg font-medium"
      />
      
      <div className="relative">
        <Textarea
          ref={textareaRef}
          placeholder="Start typing your note here... Use [[brackets]] for wiki-style links"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onSelect={handleTextSelection}
          className="min-h-[400px] font-mono text-sm"
        />
        
        {showSuggestions && (
          <div className="absolute z-10 bg-background border rounded-md shadow-md mt-1 w-48">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground text-sm"
                onClick={() => insertTextAtCursor(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
      
      <div className="text-sm text-muted-foreground">
        <p>
          Use <strong>[[double brackets]]</strong> to create wiki-style links. 
          If the note doesn't exist, it will be created automatically when you click on the link.
        </p>
      </div>
    </div>
  );
};

export default NoteEditor;
