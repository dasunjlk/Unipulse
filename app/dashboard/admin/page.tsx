import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminOrganizersPanel, GridConfigForm } from "@/app/components/admin-panel";
import { LogoutButton } from "@/app/components/scaffold-actions";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default async function AdminDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="container mx-auto flex-1 px-4 py-16 text-center">
          <p className="text-muted-foreground">Log in as admin (seed user).</p>
          <Link href="/login/admin" className="mt-4 inline-block text-purple-300 hover:underline">
            Admin login
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!profile || profile.role !== "admin") {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="container mx-auto flex-1 px-4 py-16 text-center">
          <p className="text-muted-foreground">Admin role required.</p>
          <Link href="/" className="mt-4 inline-block text-purple-300 hover:underline">
            Home
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="border-b border-white/10 bg-card/30">
          <div className="container mx-auto flex flex-wrap items-center justify-between gap-4 px-4 py-8">
            <h1 className="text-3xl font-bold text-white">Admin</h1>
            <LogoutButton />
          </div>
        </div>
        <div className="container mx-auto space-y-8 px-4 py-10">
          <AdminOrganizersPanel />
          <GridConfigForm />
          <div className="text-center">
            <Link href="/" className="text-sm text-purple-300 hover:underline">
              Back to home
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
