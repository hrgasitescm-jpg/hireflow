import Image from "next/image";
import { cn } from "@/lib/utils";

/* ==========================================================================
   Logo CKB
   --------------------------------------------------------------------------
   Aset asli perusahaan, bukan gambar buatan. Dipotong rapat dari berkas yang
   diberikan (607×405 dengan padding transparan) menjadi:

     public/logo-ckb.png   576×162  lockup penuh — mark + wordmark
     public/mark-ckb.png   228×162  mark saja — untuk ruang sempit

   Ukuran diatur lewat prop `size`, dan tingginya yang dikunci: rasio lockup
   3,56:1 membuat pengaturan berbasis lebar mudah meleset di sidebar sempit.

   Catatan kontras: wordmark emas di atas putih hanya sekitar 1,7:1. Untuk
   teks itu tidak layak, tapi logo dikecualikan dari syarat kontras WCAG dan
   ini memang warna merek. Yang tidak boleh adalah meniru warna itu untuk
   teks biasa — lihat DESIGN.md.
   ========================================================================== */

const LOCKUP = { src: "/logo-ckb.png", width: 576, height: 162 };
const MARK = { src: "/mark-ckb.png", width: 228, height: 162 };

const SIZE_CLASS = {
  sm: "h-5",
  md: "h-6",
  lg: "h-8",
  xl: "h-10",
} as const;

export type LogoSize = keyof typeof SIZE_CLASS;

/** Mark saja — favicon, ruang sempit, halaman 404. */
export function LogoMark({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={MARK.src}
      alt="CKB"
      width={MARK.width}
      height={MARK.height}
      style={{ height: size, width: "auto" }}
      className={cn("shrink-0", className)}
    />
  );
}

/** Lockup penuh — sidebar, halaman auth, footer. */
export function Logo({
  size = "md",
  className,
  priority = false,
}: {
  size?: LogoSize;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={LOCKUP.src}
      alt="CKB"
      width={LOCKUP.width}
      height={LOCKUP.height}
      priority={priority}
      className={cn("w-auto", SIZE_CLASS[size], className)}
    />
  );
}
