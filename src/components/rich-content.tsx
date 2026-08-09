import { Fragment } from "react";
import type { RichDoc, RichNode } from "@/lib/rich-text";
import { parseStoredDoc } from "@/lib/rich-text";

/* ==========================================================================
   Penampil teks kaya
   --------------------------------------------------------------------------
   Membangun elemen React langsung dari node dokumen. TIDAK memakai
   dangerouslySetInnerHTML di titik mana pun — itulah alasan seluruh model
   dokumen ini ada.

   Sebagian isi datang dari pelamar anonim di internet. Kalau isinya dirender
   sebagai HTML mentah, satu tag <script> atau atribut onerror sudah cukup
   untuk menjalankan kode di browser recruiter yang membukanya. Dengan cara
   ini, node yang tidak dikenal tidak punya jalan untuk menjadi apa pun —
   ia hanya diabaikan.
   ========================================================================== */

function renderNodes(nodes: RichNode[] | undefined): React.ReactNode {
  if (!nodes?.length) return null;

  return nodes.map((node, i) => {
    switch (node.type) {
      case "text": {
        let el: React.ReactNode = node.text;
        // Urutannya tidak penting; keduanya hanya membungkus.
        for (const mark of node.marks ?? []) {
          if (mark.type === "bold") el = <strong className="font-semibold">{el}</strong>;
          if (mark.type === "italic") el = <em>{el}</em>;
        }
        return <Fragment key={i}>{el}</Fragment>;
      }

      case "hardBreak":
        return <br key={i} />;

      case "paragraph":
        return (
          <p key={i} className="my-3 first:mt-0 last:mb-0">
            {renderNodes(node.content)}
          </p>
        );

      case "heading": {
        const level = node.attrs?.level === 3 ? 3 : 2;
        const Tag = level === 3 ? "h4" : "h3";
        return (
          <Tag
            key={i}
            className={
              level === 3
                ? "mt-6 mb-2 text-body font-semibold text-ink first:mt-0"
                : "mt-8 mb-3 text-heading text-ink first:mt-0"
            }
          >
            {renderNodes(node.content)}
          </Tag>
        );
      }

      case "bulletList":
        return (
          <ul key={i} className="my-3 space-y-1.5 pl-5 marker:text-gold-500">
            {renderNodes(node.content)}
          </ul>
        );

      case "orderedList":
        return (
          <ol key={i} className="my-3 list-decimal space-y-1.5 pl-5 marker:text-muted">
            {renderNodes(node.content)}
          </ol>
        );

      case "listItem":
        return (
          <li key={i} className="list-disc [ol_&]:list-decimal">
            {renderNodes(node.content)}
          </li>
        );

      default:
        /* Node yang tidak dikenal diabaikan diam-diam. Pembersih di server
           seharusnya sudah membuangnya; ini lapisan kedua. */
        return null;
    }
  });
}

export function RichContent({
  value,
  className,
}: {
  /** Nilai tersimpan: JSON, atau teks polos dari data lama. */
  value: string | RichDoc | null | undefined;
  className?: string;
}) {
  const doc: RichDoc =
    typeof value === "string" || value == null ? parseStoredDoc(value) : value;

  if (!doc.content?.length) return null;
  return <div className={className}>{renderNodes(doc.content)}</div>;
}
