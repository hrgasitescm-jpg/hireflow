import type { Metadata } from "next";
import { requireMembership, canAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Alert, Avatar, Badge, Card, PageHeader } from "@/components/ui";
import { ROLE_LABEL, formatDate } from "@/lib/utils";
import { OrgProfileForm } from "./org-profile-form";
import { CareerPageLink } from "./career-page-link";

export const metadata: Metadata = { title: "Pengaturan" };

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const membership = await requireMembership(orgSlug);
  const supabase = await createClient();

  const [orgRes, membersRes] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, slug, about, website, brand_color")
      .eq("id", membership.org.id)
      .single(),
    supabase
      .from("org_members")
      .select("id, role, status, created_at, profiles!inner(id, full_name)")
      .eq("org_id", membership.org.id)
      .order("created_at"),
  ]);

  const org = orgRes.data;
  const isAdmin = canAdmin(membership.role);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Pengaturan"
        description="Profil organisasi, career page, dan anggota tim."
      />

      <div className="space-y-6">
        <Card className="p-5">
          <h2 className="mb-1 text-sm font-semibold text-ink">
            Career page
          </h2>
          <p className="mb-4 text-sm text-muted">
            Bagikan tautan ini di media sosial, tanda tangan email, atau grup
            komunitas.
          </p>
          <CareerPageLink orgSlug={orgSlug} />
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 text-sm font-semibold text-ink">
            Profil organisasi
          </h2>
          <p className="mb-4 text-sm text-muted">
            Tampil di halaman karier publik.
          </p>
          {org && isAdmin ? (
            <OrgProfileForm
              orgSlug={orgSlug}
              initial={{
                name: org.name,
                about: org.about ?? "",
                website: org.website ?? "",
                brandColor: org.brand_color,
              }}
            />
          ) : (
            <Alert tone="info">
              Hanya Pemilik dan Admin yang bisa mengubah profil organisasi.
            </Alert>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink">
                Anggota tim
              </h2>
              <p className="text-sm text-muted">
                {membersRes.data?.length ?? 0} anggota
              </p>
            </div>
          </div>

          <ul className="divide-y divide-line">
            {(membersRes.data ?? []).map((m) => {
              const profile = m.profiles as unknown as {
                id: string;
                full_name: string;
              };
              return (
                <li key={m.id} className="flex items-center gap-3 py-3">
                  <Avatar name={profile.full_name || "?"} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {profile.full_name || "Tanpa nama"}
                    </p>
                    <p className="text-xs text-muted">
                      Bergabung {formatDate(m.created_at)}
                    </p>
                  </div>
                  <Badge tone={m.role === "owner" ? "gold" : "neutral"}>
                    {ROLE_LABEL[m.role]}
                  </Badge>
                </li>
              );
            })}
          </ul>

          <Alert tone="info">
            Undangan anggota lewat email hadir di Fase 2. Untuk sekarang, minta
            rekanmu mendaftar lalu tambahkan lewat SQL editor Supabase (tabel{" "}
            <code className="rounded bg-white/60 px-1">org_members</code>).
          </Alert>
        </Card>
      </div>
    </div>
  );
}
