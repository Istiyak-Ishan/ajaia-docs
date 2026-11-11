"use client";

import React, { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  List,
  ListOrdered,
  Undo2,
  Redo2,
  Lock,
} from "lucide-react";

interface EditorProps {
  content: string;
  onChange: (html: string) => void;
  editable?: boolean;
  placeholder?: string;
}

export function Editor({
  content,
  onChange,
  editable = true,
  placeholder = "Write your document content here...",
}: EditorProps) {
  const isLocalChangeRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class:
          "prose prose-slate max-w-none focus:outline-none min-h-[450px] p-6 sm:p-8 bg-white",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      isLocalChangeRef.current = true;
      onChange(currentEditor.getHTML());
    },
  });

  // Keep TipTap editability in sync with role changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  // Synchronize external content changes (e.g. file import, version restoration)
  useEffect(() => {
    if (!editor) return;

    if (isLocalChangeRef.current) {
      isLocalChangeRef.current = false;
      return;
    }

    if (editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return (
      <div className="w-full h-96 bg-white rounded-2xl border border-slate-200 animate-pulse p-8">
        <div className="h-6 bg-slate-100 rounded w-1/3 mb-4" />
        <div className="h-4 bg-slate-100 rounded w-full mb-2" />
        <div className="h-4 bg-slate-100 rounded w-5/6 mb-2" />
        <div className="h-4 bg-slate-100 rounded w-2/3" />
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Rich-Text Formatting Toolbar */}
      <div className="no-print sticky top-16 z-30 flex flex-wrap items-center gap-1 p-2 sm:px-4 sm:py-2.5 border-b border-slate-200 bg-slate-50/95 backdrop-blur">
        {/* Paragraph & Headings */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setParagraph().run()}
          disabled={!editable}
          title="Normal Paragraph"
          className={`p-1.5 sm:px-2 sm:py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
            editor.isActive("paragraph") && !editor.isActive("heading")
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-700 hover:bg-slate-200/80 disabled:opacity-40 disabled:pointer-events-none"
          }`}
        >
          <Pilcrow className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Text</span>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          disabled={!editable}
          title="Heading 1"
          className={`p-1.5 sm:px-2 sm:py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
            editor.isActive("heading", { level: 1 })
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-700 hover:bg-slate-200/80 disabled:opacity-40 disabled:pointer-events-none"
          }`}
        >
          <Heading1 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">H1</span>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={!editable}
          title="Heading 2"
          className={`p-1.5 sm:px-2 sm:py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
            editor.isActive("heading", { level: 2 })
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-700 hover:bg-slate-200/80 disabled:opacity-40 disabled:pointer-events-none"
          }`}
        >
          <Heading2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">H2</span>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          disabled={!editable}
          title="Heading 3"
          className={`p-1.5 sm:px-2 sm:py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
            editor.isActive("heading", { level: 3 })
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-700 hover:bg-slate-200/80 disabled:opacity-40 disabled:pointer-events-none"
          }`}
        >
          <Heading3 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">H3</span>
        </button>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Inline Formatting: Bold, Italic, Underline */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editable}
          title="Bold (Cmd+B)"
          className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
            editor.isActive("bold")
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-700 hover:bg-slate-200/80 disabled:opacity-40 disabled:pointer-events-none"
          }`}
        >
          <Bold className="w-4 h-4 stroke-[2.5]" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editable}
          title="Italic (Cmd+I)"
          className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
            editor.isActive("italic")
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-700 hover:bg-slate-200/80 disabled:opacity-40 disabled:pointer-events-none"
          }`}
        >
          <Italic className="w-4 h-4 stroke-[2.5]" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          disabled={!editable}
          title="Underline (Cmd+U)"
          className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
            editor.isActive("underline")
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-700 hover:bg-slate-200/80 disabled:opacity-40 disabled:pointer-events-none"
          }`}
        >
          <UnderlineIcon className="w-4 h-4 stroke-[2.5]" />
        </button>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Lists */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={!editable}
          title="Bullet List"
          className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
            editor.isActive("bulletList")
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-700 hover:bg-slate-200/80 disabled:opacity-40 disabled:pointer-events-none"
          }`}
        >
          <List className="w-4 h-4 stroke-[2.2]" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={!editable}
          title="Numbered List"
          className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
            editor.isActive("orderedList")
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-700 hover:bg-slate-200/80 disabled:opacity-40 disabled:pointer-events-none"
          }`}
        >
          <ListOrdered className="w-4 h-4 stroke-[2.2]" />
        </button>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* History: Undo / Redo */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editable || !editor.can().undo()}
          title="Undo (Cmd+Z)"
          className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-200/80 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editable || !editor.can().redo()}
          title="Redo (Cmd+Shift+Z)"
          className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-200/80 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        {/* Read-Only Notice Indicator */}
        {!editable && (
          <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Read-Only Mode</span>
          </div>
        )}
      </div>

      {/* Editor Content Area */}
      <div className="relative flex-1 cursor-text" onClick={() => editor.commands.focus()}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

