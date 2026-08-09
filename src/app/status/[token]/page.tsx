import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/logo";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: { absolute: "Status lamaran" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Portal status untuk pelamar — tanpa registrasi, cukup token rahasia.
 * Yang ditampilkan sengaja minimal: tahap saat ini saja. Tidak ada catatan
 * internal, skor, atau nama penilai.
 */
export default async function StatusPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!/^[a-f0-9]{48}$/.test(token)) notFound();

  const supabase = createAdminClient();

  const { data: application } = await supabase
    .from("applications")
    .select(
      `id, status, applied_at, stage_id, job_id,
       jobs!inner(title, slug, org_id),
       candidates!inner(full_name)`,
    )
    .eq("access_token", token)
    .maybeSingle();

  if (!application) notFound();

  const job = application.jobs as unknown as {
    title: string;
    slug: string;
    org_id: string;
  };
  const candidate = application.candidates as unknown as { full_name: string };

  const [orgRes, stagesRes] = await Promise.all([
    supabase
      .from("organizations")
      .select("name, slug")
      .eq("id", job.org_id)
      .maybeSingle(),
    supabase
      .from("job_stages")
      .select("id, name, position, kind")
      .eq("job_id", application.job_id)
      .order("position"),
  ]);

  const stages = (stagesRes.data ?? []).filter((s) => s.kind !== "rejected");
  const currentIndex = stages.findIndex((s) => s.id === application.stage_id);
  const rejected = application.status === "rejected";
  const hired = application.status === "hired";

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div aria-hidden className="rule-gold h-px" />

      <main className="mx-auto w-full max-w-lg flex-1 px-6 py-16">
        <p className="text-label uppercase tracking-[0.16em] text-gold-700">
          Status lamaran
        </p>
        <h1 className="mt-4 text-title text-ink">
          {job.title}
        </h1>
        <p className="mt-3 text-body text-muted">
          {orgRes.data?.name ?? "Perusahaan"} · atas nama {candidate.full_name}
        </p>
        <p className="mt-1.5 text-small text-subtle">
          Dikirim {formatDate(application.applied_at)}
        </p>

        {rejected ? (
          <div className="mt-10 rounded-surface border border-line px-5 py-6">
            <p className="text-body font-semibold text-ink">
              Lamaran belum bisa dilanjutkan
            </p>
            <p className="mt-2.5 text-small leading-relaxed text-muted">
              Terima kasih sudah meluangkan waktu. Kami menyimpan datamu dan
              akan menghubungi jika ada posisi yang lebih cocok.
            </p>
          </div>
        ) : (
          <ol className="mt-10">
            {stages.map((stage, i) => {
              const done = currentIndex >= 0 && i < currentIndex;
              const current = i === currentIndex;
              const complete = done || (hired && i === stages.length - 1);
              const isLast = i === stages.length - 1;

              return (
                <li key={stage.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full border transition-colors",
                        complete
                          ? "border-gold-400 bg-gold-400 text-ink"
                          : current
                            ? "border-gold-400 bg-white"
                            : "border-line bg-white",
                      )}
                    >
                      {complete ? (
                        <Check className="size-3.5" aria-hidden strokeWidth={3} />
                      ) : (
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            current ? "bg-gold-400" : "bg-stone-300",
                          )}
                          aria-hidden
                        />
                      )}
                    </span>
                    {!isLast && (
                      <span
                        className={cn(
                          "my-1 w-px flex-1",
                          complete ? "bg-gold-300" : "bg-line",
                        )}
                      />
                    )}
                  </div>

                  <div className={cn("pb-8", isLast && "pb-0")}>
                    <p
                      className={cn(
                        "text-body leading-6",
                        current
                          ? "font-semibold text-ink"
                          : complete
                            ? "text-ink-soft"
                            : "text-stone-400",
                      )}
                    >
                      {stage.name}
                    </p>
                    {current && (
                      <p className="mt-1 text-caption font-medium text-gold-700">
                        Tahap kamu saat ini
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <p className="mt-12 border-t border-line pt-5 text-caption leading-relaxed text-muted">
          Simpan tautan halaman ini untuk mengecek status kapan saja. Tautan ini
          bersifat pribadi — jangan dibagikan ke orang lain.
        </p>
      </main>

      {/* "Didukung oleh" dihapus: aplikasi ini milik satu perusahaan, jadi
          logonya sendiri di footer adalah tanda tangan halaman, bukan iklan
          penyedia layanan. */}
      <footer className="border-t border-line py-10">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-3 px-6">
          <Logo size="sm" />
          <p className="text-caption text-muted">
            {orgRes.data?.name.trim() ?? "Perusahaan"}
          </p>
        </div>
      </footer>
    </div>
  );
}
