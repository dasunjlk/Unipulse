import Link from "next/link";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  ProposalUploadForm,
  PublishEventButton,
  ExportManifestButton,
} from "@/app/components/scaffold-actions";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, DollarSign, Ticket, TrendingUp } from "lucide-react";

export default async function OrganizerDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="container mx-auto flex-1 px-4 py-16 text-center">
          <p className="text-muted-foreground">Log in as an organizer.</p>
          <Link href="/login/organizer" className="mt-4 inline-block text-purple-300 hover:underline">
            Organizer login
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "organizer") {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="container mx-auto flex-1 px-4 py-16 text-center">
          <p className="text-muted-foreground">Organizer role required.</p>
          <Link href="/" className="mt-4 inline-block text-purple-300 hover:underline">
            Home
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (profile.account_status === "pending") {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="container mx-auto flex-1 px-4 py-16 text-center">
          <p className="text-muted-foreground">
            Your organizer account is pending. Go to{" "}
            <Link href="/dashboard/organizer/pending" className="text-purple-300 hover:underline">
              waiting room
            </Link>
            .
          </p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const { data: myEvents } = await supabase
    .from("events")
    .select("id,title,is_draft,is_open_event,created_at")
    .eq("organizer_id", user.id)
    .order("created_at", { ascending: false });

  const eventIds = (myEvents ?? []).map((e) => e.id);
  let registrationTotal = 0;
  if (eventIds.length > 0) {
    const { count } = await supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .in("event_id", eventIds);
    registrationTotal = count ?? 0;
  }

  const totalEvents = myEvents?.length ?? 0;
  const publishedEvents = (myEvents ?? []).filter((e) => !e.is_draft).length;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="border-b border-white/10 bg-card/30">
          <div className="container mx-auto px-4 py-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Organizer dashboard</h1>
              <p className="mt-1 text-muted-foreground">
                Welcome back{profile.full_name ? `, ${profile.full_name}` : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="container mx-auto space-y-10 px-4 py-10">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Events"
              value={String(totalEvents)}
              icon={<Activity className="h-5 w-5 text-purple-400" />}
            />
            <StatCard
              label="Published"
              value={String(publishedEvents)}
              icon={<TrendingUp className="h-5 w-5 text-emerald-400" />}
            />
            <StatCard
              label="Registrations"
              value={registrationTotal >= 1000 ? `${(registrationTotal / 1000).toFixed(1)}k` : String(registrationTotal)}
              icon={<Ticket className="h-5 w-5 text-blue-400" />}
            />
            <StatCard
              label="Revenue (mock)"
              value="$0"
              icon={<DollarSign className="h-5 w-5 text-amber-400" />}
            />
          </div>

          <Card className="border-white/10 bg-card/50 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-white">Magic onboarding</CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload a proposal — triggers n8n proposal-uploaded webhook.
              </p>
            </CardHeader>
            <CardContent>
              <ProposalUploadForm />
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-card/50 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-white">My events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(myEvents ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No events yet.</p>
              ) : (
                <ul className="space-y-4">
                  {(myEvents ?? []).map((e) => (
                    <li
                      key={e.id}
                      className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <Link
                          href={`/events/${e.id}`}
                          className="font-medium text-white hover:text-purple-300"
                        >
                          {e.title || e.id}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {e.is_open_event ? "Open / upvotes" : "Closed registration"} · Draft:{" "}
                          {String(e.is_draft)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <PublishEventButton eventId={e.id} />
                        <ExportManifestButton eventId={e.id} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

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

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <Card className="border-white/10 bg-card/50 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        {icon}
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold text-white">{value}</p>
      </CardContent>
    </Card>
  );
}
