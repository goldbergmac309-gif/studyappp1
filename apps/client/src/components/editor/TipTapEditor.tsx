"use client"

import React, { useEffect, useMemo, useState } from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Heading from "@tiptap/extension-heading"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"
import BulletList from "@tiptap/extension-bullet-list"
import OrderedList from "@tiptap/extension-ordered-list"
import ListItem from "@tiptap/extension-list-item"
import Code from "@tiptap/extension-code"
import Blockquote from "@tiptap/extension-blockquote"
import HorizontalRule from "@tiptap/extension-horizontal-rule"

import { Button } from "@/components/ui/button"

type TipTapEditorProps = {
  value: any
  onChange: (json: any) => void
  placeholder?: string
  className?: string
}

function FloatingToolbar({ editor, visible, pos, setVisible, setPos }: { editor: any; visible: boolean; pos: { left: number; top: number }; setVisible: (v: boolean) => void; setPos: (p: { left: number; top: number }) => void }) {
  useEffect(() => {
    if (!editor) return
    const update = () => {
      const { from, to } = editor.state.selection
      const hasSelection = from !== to
      if (!hasSelection) {
        setVisible(false)
        return
      }
      const start = editor.view.coordsAtPos(from)
      const end = editor.view.coordsAtPos(to)
      const left = (start.left + end.left) / 2
      const top = Math.min(start.top, end.top) - 8
      setPos({ left, top })
      setVisible(true)
    }
    update()
    editor.on('selectionUpdate', update)
    editor.on('transaction', update)
    return () => {
      editor.off('selectionUpdate', update)
      editor.off('transaction', update)
    }
  }, [editor, setVisible, setPos])

  if (!visible) return null
  return (
    <div style={{ position: 'fixed', left: pos.left, top: pos.top, transform: 'translate(-50%, -100%)', zIndex: 50 }}>
      <div className="rounded-md border bg-background p-1 shadow-subtle flex items-center gap-1">
        <ToolbarToggle active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>B</ToolbarToggle>
        <ToolbarToggle active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><span className="italic">I</span></ToolbarToggle>
        <ToolbarToggle active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><span className="underline">U</span></ToolbarToggle>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarToggle active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</ToolbarToggle>
        <ToolbarToggle active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</ToolbarToggle>
        <ToolbarToggle active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</ToolbarToggle>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarToggle active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</ToolbarToggle>
        <ToolbarToggle active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</ToolbarToggle>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarToggle active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>Code</ToolbarToggle>
        <ToolbarToggle active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>“”</ToolbarToggle>
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => editor.chain().focus().setHorizontalRule().run()}>HR</Button>
      </div>
    </div>
  )
}

export function TipTapEditor({ value, onChange, placeholder = "Start writing…", className }: TipTapEditorProps) {
  const [bubbleVisible, setBubbleVisible] = useState(false)
  const [bubblePos, setBubblePos] = useState<{ left: number; top: number }>({ left: 0, top: 0 })
  const [bootstrapped, setBootstrapped] = useState(false)
  const extensions = useMemo(() => [
    StarterKit.configure({
      codeBlock: false,
      heading: false,
    }),
    Heading.configure({ levels: [1, 2, 3] }),
    Underline,
    Link.configure({ openOnClick: false, autolink: true }),
    BulletList,
    OrderedList,
    ListItem,
    Code,
    Blockquote,
    HorizontalRule,
    Placeholder.configure({ placeholder }),
  ], [placeholder])

  const editor = useEditor({
    extensions,
    content: value || { type: 'doc', content: [{ type: 'paragraph' }] },
    editorProps: {
      attributes: {
        class: "prose prose-neutral dark:prose-invert max-w-none focus:outline-none",
      },
    },
    onUpdate: ({ editor }: { editor: any }) => {
      try {
        const json = editor.getJSON()
        onChange(json)
      } catch {}
    },
    // Avoid SSR hydration mismatch in Next.js by deferring initial rendering
    immediatelyRender: false,
  })

  useEffect(() => {
    if (!editor) return
    // Update content if external value changes (e.g., selecting a new note)
    const current = editor.getJSON()
    try {
      const nextStr = JSON.stringify(value ?? null)
      const currStr = JSON.stringify(current ?? null)
      if (nextStr !== currStr) {
        editor.commands.setContent(value || { type: 'doc', content: [{ type: 'paragraph' }] })
      }
    } catch {}
  }, [value, editor])

  // Ensure the editor view renders at least once when immediatelyRender=false
  useEffect(() => {
    if (editor && !bootstrapped) {
      try { editor.commands.focus('end') } catch {}
      setBootstrapped(true)
    }
  }, [editor, bootstrapped])

  return (
    <div className={className}>
      {/* Custom Bubble Menu (appears near selection) */}
      {editor && (
        <FloatingToolbar editor={editor} visible={bubbleVisible} pos={bubblePos} setVisible={setBubbleVisible} setPos={setBubblePos} />
      )}
      {editor ? (
        <EditorContent data-testid="tiptap-editor" editor={editor} className="min-h-[300px]" />
      ) : (
        <div data-testid="tiptap-editor" className="min-h-[300px]" />
      )}
    </div>
  )
}

function ToolbarToggle({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "ghost"}
      size="sm"
      className="h-7 px-2"
      onClick={onClick}
    >
      {children}
    </Button>
  )
}
