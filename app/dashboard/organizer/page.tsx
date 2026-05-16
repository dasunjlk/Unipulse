import Link from "next/link";
import type { ReactNode } from "react";
import type { OrganizerEventRowSerialized } from "@/app/components/organizer-events-panel";
import { OrganizerEventsPanel } from "@/app/components/organizer-events-panel";
import { WhatsappSettingsCard } from "@/app/components/whatsapp-settings";
import { MagicUploadForm } from "@/components/magic-upload-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { parseMerchItems } from "@/lib/merch";
import { storedWhatsappToDisplay } from "@/lib/auth/phone";
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

  const { data: appCfg } = await supabase.from("app_config").select("grid_n").eq("id", 1).single();
  const gridN = appCfg?.grid_n ?? 10;

  const { data: myEvents } = await supabase
    .from("events")
    .select(
      "id,title,description,is_draft,is_open_event,created_at,start_at,end_at,venue,ticket_capacity,grid_row,grid_col,location_id,merch_items,locations(code,name,grid_row,grid_col)",
    )
    .eq("organizer_id", user.id)
    .order("created_at", { ascending: false });
  const eventIds = (myEvents ?? []).map((e) => e.id);

  let registrationTotal = 0;
  const regCounts: Record<string, number> = {};
  if (eventIds.length > 0) {
    const { count } = await supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .in("event_id", eventIds);
    registrationTotal = count ?? 0;

    const { data: regRows } = await supabase
      .from("registrations")
      .select("event_id")
      .in("event_id", eventIds);
    for (const r of regRows ?? []) {
      const evId = r.event_id;
      regCounts[evId] = (regCounts[evId] ?? 0) + 1;
    }
  }

  const rows: OrganizerEventRowSerialized[] =
    myEvents?.map((e) => {
      const nested = (
        e as unknown as {
          locations?: {
            code: string;
            name: string;
            grid_row: number;
            grid_col: number;
          } | null;
        }
      ).locations;

      const locNested =
        nested && typeof nested === "object" && !Array.isArray(nested) ? nested : null;

      return {
        id: e.id,
        title: e.title,
        description: e.description ?? "",
        is_draft: e.is_draft,
        is_open_event: e.is_open_event,
        start_at: e.start_at,
        end_at: e.end_at,
        venue: e.venue,
        location_id: e.location_id as string,
        location_code: locNested?.code ?? null,
        location_name: locNested?.name ?? null,
        grid_row: e.grid_row,
        grid_col: e.grid_col,
        ticket_capacity: e.ticket_capacity,
        registrationCount: regCounts[e.id] ?? 0,
        merchItems: parseMerchItems(e.merch_items),
      };
    }) ?? [];

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
                Welcome back
                {profile.full_name ? `, ${profile.full_name}` : ""}
                {profile.club_name ? ` — ${profile.club_name}` : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="container mx-auto space-y-10 px-4 py-10">
          {!profile.whatsapp_number ? (
            <>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                Add your WhatsApp number to get instant updates when your events are published.{" "}
                <a href="#whatsapp-settings" className="font-medium text-amber-50 underline">
                  Update WhatsApp settings
                </a>
              </div>
              <WhatsappSettingsCard
                initialDisplay={storedWhatsappToDisplay(profile.whatsapp_number)}
                initialConsent={profile.whatsapp_consent}
              />
            </>
          ) : null}

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
              <CardTitle className="text-white">Magic upload (live OpenAI)</CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload an event PDF — n8n extracts structured fields and returns them instantly.
              </p>
            </CardHeader>
            <CardContent>
              <MagicUploadForm />
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-card/50 backdrop-blur-xl">
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
              <CardTitle className="text-white">My events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <OrganizerEventsPanel events={rows} gridN={gridN} />
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
