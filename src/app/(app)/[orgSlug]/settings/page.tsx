import type { Metadata } from "next";
import {
  requireMembership,
  requireUser,
  canAdmin,
  canManage,
} from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Alert, Card, PageHeader } from "@/components/ui";
import { OrgProfileForm } from "./org-profile-form";
import { CareerPageLink } from "./career-page-link";
import { TermManager } from "./term-manager";
import { MemberManager } from "./member-manager";

export const metadata: Metadata = { title: "Pengaturan" };

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const membership = await requireMembership(orgSlug);
  const user = await requireUser();
  const supabase = await createClient();

  const [orgRes, membersRes, departmentsRes, locationsRes, workModesRes] =
    await Promise.all([
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
    supabase
      .from("departments")
      .select("id, name")
      .eq("org_id", membership.org.id)
      .order("name"),
    supabase
      .from("locations")
      .select("id, name")
      .eq("org_id", membership.org.id)
      .order("name"),
    supabase
      .from("work_modes")
      .select("id, name, is_remote")
      .eq("org_id", membership.org.id)
      .order("position"),
  ]);

  const org = orgRes.data;
  const isAdmin = canAdmin(membership.role);
  const isManager = canManage(membership.role);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Pengaturan"
        description="Profil organisasi, career page, dan anggota tim."
      />

      <div className="space-y-6">
        <Card className="p-5">
          <h2 className="mb-1 text-heading text-ink">
            Career page
          </h2>
          <p className="mb-4 text-sm text-muted">
            Bagikan tautan ini di media sosial, tanda tangan email, atau grup
            komunitas.
          </p>
          <CareerPageLink orgSlug={orgSlug} />
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 text-heading text-ink">
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

        {/* ----------------------------------------------------------------
            Mode kerja

            Dulu nilainya dikunci di database, utils.ts, dan form sekaligus —
            berisi istilah pekerjaan kantoran yang tidak cocok untuk
            pertambangan. Sekarang dikelola di sini.
            ---------------------------------------------------------------- */}
        <Card className="p-5">
          <h2 className="mb-1 text-heading text-ink">Mode kerja</h2>
          <p className="mb-4 text-small text-muted">
            Mengisi dropdown Mode kerja saat membuat lowongan. Tandai{" "}
            <strong className="font-semibold text-ink-soft">Jarak jauh</strong>{" "}
            pada mode yang benar-benar bekerja dari mana saja — penanda itu
            dipakai Google Jobs untuk mengenali lowongan remote.
          </p>
          <TermManager
            orgSlug={orgSlug}
            kind="work_modes"
            terms={workModesRes.data ?? []}
            canEdit={isManager}
            withRemoteFlag
            emptyHint="Belum ada mode kerja. Tambahkan supaya bisa dipilih di form lowongan."
          />
        </Card>

        {/* ----------------------------------------------------------------
            Departemen & Lokasi

            Keduanya mengisi dropdown di form lowongan. Sebelum ini tidak ada
            layar mana pun yang bisa menambahkannya, sehingga dropdown-nya
            selalu kosong dan terlihat seperti fitur yang rusak.
            ---------------------------------------------------------------- */}
        <div className="grid gap-6 sm:grid-cols-2">
          <Card className="p-5">
            <h2 className="mb-1 text-heading text-ink">Departemen</h2>
            <p className="mb-4 text-small text-muted">
              Mengisi dropdown Departemen saat membuat lowongan.
            </p>
            <TermManager
              orgSlug={orgSlug}
              kind="departments"
              terms={departmentsRes.data ?? []}
              canEdit={isManager}
              emptyHint="Belum ada departemen. Tambahkan supaya bisa dipilih di form lowongan."
            />
          </Card>

          <Card className="p-5">
            <h2 className="mb-1 text-heading text-ink">Lokasi</h2>
            <p className="mb-4 text-small text-muted">
              Mengisi dropdown Lokasi saat membuat lowongan, dan tampil di
              career page.
            </p>
            <TermManager
              orgSlug={orgSlug}
              kind="locations"
              terms={locationsRes.data ?? []}
              canEdit={isManager}
              emptyHint="Belum ada lokasi. Tambahkan supaya bisa dipilih di form lowongan."
            />
          </Card>
        </div>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-heading text-ink">
                Anggota tim
              </h2>
              <p className="text-sm text-muted">
                {membersRes.data?.length ?? 0} anggota
              </p>
            </div>
          </div>

          <MemberManager
            orgSlug={orgSlug}
            canEdit={isAdmin}
            members={(membersRes.data ?? []).map((m) => {
              const profile = m.profiles as unknown as {
                id: string;
                full_name: string;
              };
              return {
                id: m.id,
                role: m.role,
                createdAt: m.created_at,
                fullName: profile.full_name,
                isSelf: profile.id === user.id,
              };
            })}
          />
        </Card>
      </div>
    </div>
  );
}
