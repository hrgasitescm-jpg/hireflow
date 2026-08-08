import { redirect } from "next/navigation";
import { getMemberships, getUser } from "@/lib/auth";

/**
 * Titik masuk. Belum login -> /login. Belum punya organisasi -> /onboarding.
 * Sudah punya -> dashboard organisasi pertama.
 */
export default async function HomePage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const memberships = await getMemberships();
  if (memberships.length === 0) redirect("/onboarding");

  redirect(`/${memberships[0]!.org.slug}/dashboard`);
}
