
import { useMemo } from "react";
import { Note } from "@/hooks/use-notes";

interface NotePreviewerProps {
  note: Note;
  onLinkClick: (title: string) => void;
}

const NotePreviewer = ({ note, onLinkClick }: NotePreviewerProps) => {
  const formattedContent = useMemo(() => {
    if (!note.content) return <p className="text-muted-foreground">No content</p>;
    
    // Replace wiki links with actual links
    let content = note.content;
    
    // Process Markdown-style formatting
    content = content
      // Headers
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold my-4">$1</h1>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold my-3">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold my-2">$1</h3>')
      // Bold and italic
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Lists
      .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4">$2</li>')
      // Wiki links
      .replace(/\[\[(.+?)\]\]/g, '<a class="text-primary underline cursor-pointer" data-link="$1">$1</a>')
      // Paragraphs
      .replace(/^(?!<[hl][1-3]|<li|<\/ul|<\/ol)(.+)$/gm, '<p class="my-2">$1</p>')
      // Group list items
      .replace(/<li class="ml-4">(.+)<\/li>\s*<li class="ml-4">(.+)<\/li>/g, '<ul class="list-disc my-2"><li class="ml-4">$1</li><li class="ml-4">$2</li></ul>');
    
    return <div dangerouslySetInnerHTML={{ __html: content }} onClick={handleLinkClick} />;
  }, [note.content]);
  
  const handleLinkClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A' && target.dataset.link) {
      e.preventDefault();
      onLinkClick(target.dataset.link);
    }
  };
  
  return (
    <div className="prose max-w-none">
      {formattedContent}
    </div>
  );
};

export default NotePreviewer;
