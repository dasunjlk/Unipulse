import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminOrganizersPanel, GridConfigForm } from "@/app/components/admin-panel";
import { LogoutButton } from "@/app/components/scaffold-actions";

export default async function AdminDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main>
        <p>Log in as admin (seed user).</p>
        <Link href="/login/admin">Login</Link>
      </main>
    );
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!profile || profile.role !== "admin") {
    return (
      <main>
        <p>Admin role required.</p>
        <Link href="/">Home</Link>
      </main>
    );
  }

  return (
    <main>
      {/* SCAFFOLD: replace markup with friend&apos;s UI */}
      <h1>Admin</h1>
      <LogoutButton />
      <AdminOrganizersPanel />
      <GridConfigForm />
      <p>
        <Link href="/">Home</Link>
      </p>
    </main>
  );
}
