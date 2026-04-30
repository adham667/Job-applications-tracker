import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { useEffect } from "react";

export default function CVEditor({ content, onContentChange, onEditorReady, onImproveSelectedBullet }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TextStyle,
      Color,
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder: "Write or improve your CV content...",
      }),
    ],
    content,
    onUpdate: ({ editor: editorInstance }) => {
      onContentChange(editorInstance.getText(), editorInstance.getJSON(), editorInstance.getHTML());
    },
  });

  useEffect(() => {
    if (editor) {
      onEditorReady(editor);
      onContentChange(editor.getText(), editor.getJSON(), editor.getHTML());
    }
  }, [editor, onEditorReady, onContentChange]);

  useEffect(() => {
    if (!editor || !content) return;
    editor.commands.setContent(content, { emitUpdate: true });
  }, [editor, content]);

  const improveSelection = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ").trim();
    if (!selectedText) return;
    onImproveSelectedBullet(selectedText);
  };

  return (
    <section className="editor-pane">
      <div className="editor-toolbar">
        <button onClick={() => editor?.chain().focus().toggleBold().run()}>Bold</button>
        <button onClick={() => editor?.chain().focus().toggleItalic().run()}>Italic</button>
        <button onClick={() => editor?.chain().focus().toggleBulletList().run()}>Bullet</button>
        <button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>Heading</button>
        <button onClick={improveSelection}>Improve with AI</button>
      </div>
      <EditorContent editor={editor} className="editor-surface" />
    </section>
  );
}
