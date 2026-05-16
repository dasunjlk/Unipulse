import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function OrganizerPendingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="container mx-auto flex-1 px-4 py-16 text-center">
          <p className="text-muted-foreground">Log in first.</p>
          <Link href="/login" className="mt-4 inline-block text-purple-300 hover:underline">
            Login
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,account_status,club_name")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container mx-auto max-w-lg flex-1 px-4 py-12">
        <Card className="border-white/10 bg-card/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white">Organizer waiting room</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              An admin must approve your account before you can create events.
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Club:</span>{" "}
              <span className="text-white">{profile?.club_name ?? "—"}</span>
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Status:</span>{" "}
              <span className="text-white">{profile?.account_status ?? "unknown"}</span>
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <Link href="/dashboard/organizer" className="text-purple-300 hover:underline">
                Try dashboard
              </Link>
              <Link href="/" className="text-muted-foreground hover:text-white">
                Home
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
