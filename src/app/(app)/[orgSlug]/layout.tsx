import { requireMembership, getMemberships } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  // Melempar ke "/" kalau user bukan anggota organisasi ini.
  const membership = await requireMembership(orgSlug);
  const memberships = await getMemberships();

  return (
    <AppShell membership={membership} memberships={memberships}>
      {children}
    </AppShell>
  );
}
