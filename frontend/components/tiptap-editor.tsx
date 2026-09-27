'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  IconBold,
  IconItalic,
  IconUnderline,
  IconStrikethrough,
  IconCode,
  IconH1,
  IconH2,
  IconH3,
  IconList,
  IconListNumbers,
  IconQuote,
  IconSeparator,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconTable,
  IconLink,
  IconPhoto,
  IconFileCode,
} from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

interface MenuBarProps {
  editor: Editor | null;
  showSource: boolean;
  onToggleSource: () => void;
}

// Clean empty paragraphs and normalize spacing
const cleanEmptyParagraphs = (html: string): string => {
  let cleaned = html;
  let previous = '';
  
  // Keep cleaning until no more changes occur
  while (cleaned !== previous) {
    previous = cleaned;
    cleaned = cleaned
      .replace(/<p><\/p>/gi, '')                    // Empty <p></p>
      .replace(/<p>\s*<\/p>/gi, '')                 // <p> with whitespace </p>
      .replace(/<p><br><\/p>/gi, '')                // <p><br></p>
      .replace(/<p><br\/><\/p>/gi, '')              // <p><br/></p>
      .replace(/<p><br \/><\/p>/gi, '')             // <p><br /></p>
      .replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '')    // Any variation of <p> <br> </p>
      .replace(/<p>&nbsp;<\/p>/gi, '')              // <p>&nbsp;</p>
      .replace(/<p>\s*&nbsp;\s*<\/p>/gi, '');       // <p> &nbsp; </p>
  }
  
  return cleaned.trim();
};

const MenuBar = ({ editor, showSource, onToggleSource }: MenuBarProps) => {
  const addImage = useCallback(() => {
    const url = window.prompt('Enter image URL:');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const setLink = useCallback(() => {
    const previousUrl = editor?.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '' && editor) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    if (editor) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  }, [editor]);

  const addTable = useCallback(() => {
    if (editor) {
      const rows = window.prompt('Number of rows:', '3');
      const cols = window.prompt('Number of columns:', '3');
      
      if (rows && cols) {
        const numRows = parseInt(rows);
        const numCols = parseInt(cols);
        
        if (numRows > 0 && numCols > 0) {
          editor.chain().focus().insertTable({ 
            rows: numRows, 
            cols: numCols, 
            withHeaderRow: true 
          }).run();
        }
      }
    }
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="border-b border-gray-300 flex flex-wrap gap-1 p-2 bg-gray-50">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'bg-gray-200' : ''}
        disabled={showSource}
      >
        <IconBold className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'bg-gray-200' : ''}
        disabled={showSource}
      >
        <IconItalic className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={editor.isActive('underline') ? 'bg-gray-200' : ''}
        disabled={showSource}
      >
        <IconUnderline className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={editor.isActive('strike') ? 'bg-gray-200' : ''}
        disabled={showSource}
      >
        <IconStrikethrough className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={editor.isActive('code') ? 'bg-gray-200' : ''}
        disabled={showSource}
      >
        <IconCode className="h-4 w-4" />
      </Button>

      <div className="h-6 w-px bg-gray-300 mx-1" />

      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''}
        disabled={showSource}
      >
        <IconH1 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}
        disabled={showSource}
      >
        <IconH2 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={editor.isActive('heading', { level: 3 }) ? 'bg-gray-200' : ''}
        disabled={showSource}
      >
        <IconH3 className="h-4 w-4" />
      </Button>

      <div className="h-6 w-px bg-gray-300 mx-1" />

      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive('bulletList') ? 'bg-gray-200' : ''}
        disabled={showSource}
      >
        <IconList className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive('orderedList') ? 'bg-gray-200' : ''}
        disabled={showSource}
      >
        <IconListNumbers className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={editor.isActive('blockquote') ? 'bg-gray-200' : ''}
        disabled={showSource}
      >
        <IconQuote className="h-4 w-4" />
      </Button>

      <div className="h-6 w-px bg-gray-300 mx-1" />

      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200' : ''}
        disabled={showSource}
      >
        <IconAlignLeft className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200' : ''}
        disabled={showSource}
      >
        <IconAlignCenter className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200' : ''}
        disabled={showSource}
      >
        <IconAlignRight className="h-4 w-4" />
      </Button>

      <div className="h-6 w-px bg-gray-300 mx-1" />

      <Button type="button" size="sm" variant="ghost" onClick={setLink} disabled={showSource}>
        <IconLink className="h-4 w-4" />
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={addImage} disabled={showSource}>
        <IconPhoto className="h-4 w-4" />
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={addTable} disabled={showSource}>
        <IconTable className="h-4 w-4" />
      </Button>

      <div className="h-6 w-px bg-gray-300 mx-1" />

      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        disabled={showSource}
      >
        <IconSeparator className="h-4 w-4" />
      </Button>

      <div className="h-6 w-px bg-gray-300 mx-1" />

      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo() || showSource}
      >
        <IconArrowBackUp className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo() || showSource}
      >
        <IconArrowForwardUp className="h-4 w-4" />
      </Button>

      <div className="h-6 w-px bg-gray-300 mx-1" />

      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={onToggleSource}
        className={showSource ? 'bg-gray-200' : ''}
      >
        <IconFileCode className="h-4 w-4" />
      </Button>
    </div>
  );
};

export const TiptapEditor = ({ content, onChange, placeholder = 'Start writing...' }: TiptapEditorProps) => {
  const [showSource, setShowSource] = useState(false);
  const [sourceCode, setSourceCode] = useState('');

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        hardBreak: false, // Force proper paragraphs instead of <br> tags
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 underline hover:text-blue-700',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full my-4',
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 bg-gray-100 px-4 py-2 font-bold text-left',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 px-4 py-2',
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const cleanedHtml = cleanEmptyParagraphs(html);
      onChange(cleanedHtml);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[300px] max-w-none p-4 [&_h1]:text-4xl [&_h1]:font-bold [&_h2]:text-3xl [&_h2]:font-bold [&_h3]:text-2xl [&_h3]:font-bold [&_h4]:text-xl [&_h4]:font-bold [&_h5]:text-lg [&_h5]:font-bold [&_h6]:text-base [&_h6]:font-bold',
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const handleToggleSource = () => {
    if (!editor) return;

    if (!showSource) {
      // Switching to source view
      setSourceCode(editor.getHTML());
    } else {
      // Switching back to editor view
      const cleanedSource = cleanEmptyParagraphs(sourceCode);
      editor.commands.setContent(cleanedSource);
      onChange(cleanedSource);
    }
    setShowSource(!showSource);
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <MenuBar editor={editor} showSource={showSource} onToggleSource={handleToggleSource} />
      {showSource ? (
        <div className="p-4">
          <Textarea
            value={sourceCode}
            onChange={(e) => setSourceCode(e.target.value)}
            className="font-mono text-sm min-h-[300px]"
            placeholder="HTML source code..."
          />
        </div>
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  );
};
