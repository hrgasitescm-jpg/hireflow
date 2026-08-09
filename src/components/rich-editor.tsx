"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Undo2,
  Redo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parseStoredDoc } from "@/lib/rich-text";

/* ==========================================================================
   Editor teks kaya
   --------------------------------------------------------------------------
   Isinya disimpan sebagai JSON di input tersembunyi, bukan HTML. Server
   membersihkan JSON itu terhadap daftar node yang diizinkan sebelum menyimpan,
   dan penampilnya membangun elemen React satu per satu — tidak ada
   dangerouslySetInnerHTML di jalur mana pun.

   Fitur sengaja dipangkas: tanpa blok kode, kutipan, tabel, gambar, atau
   tautan. Setiap jenis blok yang diizinkan harus punya penampil dan
   pembersihnya sendiri, jadi menambah tombol berarti menambah permukaan yang
   harus dijaga. Untuk deskripsi lowongan, yang dibutuhkan cuma judul, daftar,
   dan penebalan.
   ========================================================================== */

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "flex size-8 items-center justify-center rounded-[6px] transition-colors",
        "disabled:pointer-events-none disabled:opacity-35",
        active
          ? "bg-ink text-white"
          : "text-ink-soft hover:bg-line-soft hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-line bg-line-soft/60 px-2 py-1.5">
      <ToolbarButton
        label="Tebal"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="size-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton
        label="Miring"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="size-4" aria-hidden />
      </ToolbarButton>

      <span aria-hidden className="mx-1 h-5 w-px bg-line" />

      <ToolbarButton
        label="Judul besar"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="size-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton
        label="Judul kecil"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="size-4" aria-hidden />
      </ToolbarButton>

      <span aria-hidden className="mx-1 h-5 w-px bg-line" />

      <ToolbarButton
        label="Daftar bertitik"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="size-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton
        label="Daftar bernomor"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="size-4" aria-hidden />
      </ToolbarButton>

      <span aria-hidden className="mx-1 h-5 w-px bg-line" />

      <ToolbarButton
        label="Batalkan"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 className="size-4" aria-hidden />
      </ToolbarButton>
      <ToolbarButton
        label="Ulangi"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 className="size-4" aria-hidden />
      </ToolbarButton>
    </div>
  );
}

export function RichEditor({
  name,
  defaultValue,
  placeholder,
  minHeight = "10rem",
}: {
  /** Nama input tersembunyi yang membawa JSON ke Server Action. */
  name: string;
  /** Nilai tersimpan: JSON, atau teks polos dari data lama. */
  defaultValue?: string | null;
  placeholder?: string;
  minHeight?: string;
}) {
  const editor = useEditor({
    /* Wajib false. Tanpa ini TipTap merender di server dan hasilnya berbeda
       dengan render pertama di browser, sehingga React melaporkan hydration
       mismatch. */
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        code: false,
        strike: false,
      }),
    ],
    content: parseStoredDoc(defaultValue),
    editorProps: {
      attributes: {
        class: cn(
          "prose-editor px-4 py-3 text-body leading-relaxed text-ink outline-none",
        ),
        style: `min-height:${minHeight}`,
      },
    },
  });

  return (
    <div className="overflow-hidden rounded-control bg-surface shadow-xs ring-1 ring-inset ring-line focus-within:ring-2 focus-within:ring-ink">
      {editor && <Toolbar editor={editor} />}

      {/* Nilai dikirim lewat input tersembunyi, bukan state React, supaya
          form tetap bekerja dengan Server Action tanpa JavaScript tambahan
          untuk mengumpulkan datanya. */}
      <input
        type="hidden"
        name={name}
        value={editor ? JSON.stringify(editor.getJSON()) : ""}
        readOnly
      />

      <EditorContent editor={editor} />

      {placeholder && editor?.isEmpty && (
        <p className="pointer-events-none -mt-9 px-4 text-body text-subtle">
          {placeholder}
        </p>
      )}
    </div>
  );
}
