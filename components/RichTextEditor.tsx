"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export default function RichTextEditor({ content, onChange }: { content: string, onChange: (value: string) => void }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-slate-200 rounded-lg p-2 min-h-[300px]">
      <div className="flex gap-2 mb-2 p-2 border-b border-slate-100">
        <button onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'font-bold' : ''}>B</button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'italic' : ''}>I</button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor.isActive('heading', { level: 1 }) ? 'font-bold' : ''}>H1</button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
