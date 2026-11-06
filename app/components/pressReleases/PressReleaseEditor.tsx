"use client";

import { useEffect, useId, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { pressReleaseHtml } from "../../lib/pressReleases/richText";

export default function PressReleaseEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const id = useId();
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const editor = useEditor({
    extensions: [StarterKit.configure({
      heading: { levels: [2, 3] },
      code: false, codeBlock: false, horizontalRule: false,
      link: { openOnClick: false, autolink: true, linkOnPaste: true, defaultProtocol: "https", protocols: ["http", "https", "mailto"] },
    })],
    immediatelyRender: false,
    content: pressReleaseHtml(value),
    editorProps: { attributes: { role: "textbox", "aria-multiline": "true", "aria-labelledby": `${id}-label`, "aria-describedby": `${id}-help`, class: "press-release-rich-text min-h-80 p-4 outline-none" } },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });
  const state = useEditorState({ editor, selector: ({ editor }) => editor ? {
    bold: editor.isActive("bold"), italic: editor.isActive("italic"), underline: editor.isActive("underline"), strike: editor.isActive("strike"),
    h2: editor.isActive("heading", { level: 2 }), h3: editor.isActive("heading", { level: 3 }),
    bullet: editor.isActive("bulletList"), ordered: editor.isActive("orderedList"), quote: editor.isActive("blockquote"), link: editor.isActive("link"),
    undo: editor.can().undo(), redo: editor.can().redo(),
  } : null });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      const html = pressReleaseHtml(value);
      if (html !== editor.getHTML()) editor.commands.setContent(html, { emitUpdate: false });
    }
  }, [editor, value]);

  const button = (label: string, action: () => void, active?: boolean, disabled = false) => (
    <button key={label} type="button" title={label} aria-pressed={active} disabled={!editor || disabled}
      onMouseDown={(event) => event.preventDefault()} onClick={action}
      className={`rounded-lg border px-3 py-2 text-sm font-bold disabled:opacity-40 ${active ? "border-pink-600 bg-pink-100 text-pink-900" : "border-slate-200 bg-white hover:bg-slate-100"}`}>{label}</button>
  );
  function saveLink() {
    let href = url.trim();
    if (!href) { editor?.chain().focus().extendMarkRange("link").unsetLink().run(); setLinkOpen(false); return; }
    if (!/^[a-z][a-z0-9+.-]*:/i.test(href)) href = `https://${href}`;
    try {
      const parsed = new URL(href);
      if (!["http:", "https:", "mailto:"].includes(parsed.protocol)) throw new Error();
    } catch { setError("Enter a valid web address or mailto: email link."); return; }
    if (editor?.state.selection.empty && !editor.isActive("link")) {
      editor.chain().focus().insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] }).run();
    } else editor?.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setError(""); setLinkOpen(false);
  }
  return (
    <div className="grid gap-2 md:col-span-2">
      <p id={`${id}-label`} className="font-bold">Full press release *</p>
      <div className="overflow-hidden rounded-xl border bg-white focus-within:ring-2 focus-within:ring-pink-500">
        <div role="group" aria-label="Text formatting" className="flex flex-wrap gap-2 border-b bg-slate-50 p-3">
          {button("Bold", () => editor?.chain().focus().toggleBold().run(), state?.bold)}
          {button("Italic", () => editor?.chain().focus().toggleItalic().run(), state?.italic)}
          {button("Underline", () => editor?.chain().focus().toggleUnderline().run(), state?.underline)}
          {button("Strikethrough", () => editor?.chain().focus().toggleStrike().run(), state?.strike)}
          {button("Heading", () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), state?.h2)}
          {button("Subheading", () => editor?.chain().focus().toggleHeading({ level: 3 }).run(), state?.h3)}
          {button("Bullets", () => editor?.chain().focus().toggleBulletList().run(), state?.bullet)}
          {button("Numbered list", () => editor?.chain().focus().toggleOrderedList().run(), state?.ordered)}
          {button("Quote", () => editor?.chain().focus().toggleBlockquote().run(), state?.quote)}
          {button("Link", () => { setUrl(editor?.getAttributes("link").href || ""); setError(""); setLinkOpen(true); }, state?.link)}
          {button("Remove link", () => editor?.chain().focus().extendMarkRange("link").unsetLink().run(), undefined, !state?.link)}
          {button("Clear formatting", () => editor?.chain().focus().unsetAllMarks().clearNodes().run())}
          {button("Undo", () => editor?.chain().focus().undo().run(), undefined, !state?.undo)}
          {button("Redo", () => editor?.chain().focus().redo().run(), undefined, !state?.redo)}
        </div>
        {linkOpen && <div className="grid gap-2 border-b bg-pink-50 p-3">
          <label htmlFor={`${id}-url`} className="text-sm font-bold">Link address</label>
          <input id={`${id}-url`} type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" className="rounded-lg border p-2"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveLink(); } if (e.key === "Escape") setLinkOpen(false); }} />
          {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
          <div className="flex gap-2"><button type="button" onClick={saveLink} className="rounded-lg bg-pink-600 px-3 py-2 font-bold text-white">Apply link</button>
            <button type="button" onClick={() => { setLinkOpen(false); editor?.commands.focus(); }} className="rounded-lg border px-3 py-2">Cancel</button></div>
        </div>}
        {editor ? <EditorContent editor={editor} /> : <p className="min-h-80 p-4 text-slate-500">Loading editor…</p>}
      </div>
      <p id={`${id}-help`} className="text-xs text-slate-500">Write or paste your press release. Select text to format it or add a link. Web addresses become clickable links. At least 100 characters of text are required.</p>
    </div>
  );
}
