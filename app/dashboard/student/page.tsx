import Link from "next/link";
import type { StudentMyEventCard } from "@/app/components/student-dashboard-tabs";
import { StudentDashboardTabs } from "@/app/components/student-dashboard-tabs";
import { WhatsappSettingsCard } from "@/app/components/whatsapp-settings";
import type { HomeEventCard } from "@/components/events-section";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";
import { storedWhatsappToDisplay } from "@/lib/auth/phone";

function eventSelectFields() {
  return "id,title,description,start_at,venue,upvote_count,is_open_event,is_pinned,is_draft" as const;
}

function rowsToCards(
  rows: {
    id: string;
    title: string | null;
    description: string | null;
    start_at: string | null;
    venue: string | null;
    upvote_count: number | null;
    is_open_event: boolean | null;
  }[],
): HomeEventCard[] {
  return rows.map((e) => ({
    id: e.id,
    title: e.title ?? "",
    description: e.description ?? "",
    start_at: e.start_at,
    venue: e.venue,
    upvote_count: e.upvote_count ?? 0,
    is_open_event: Boolean(e.is_open_event),
  }));
}

export default async function StudentDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="container mx-auto flex-1 px-4 py-16 text-center">
          <p className="text-muted-foreground">Log in as a student.</p>
          <Link href="/login/student" className="mt-4 inline-block text-purple-300 hover:underline">
            Student login
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

  if (!profile || profile.role !== "student") {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="container mx-auto flex-1 px-4 py-16 text-center">
          <p className="text-muted-foreground">Student role required.</p>
          <Link href="/" className="mt-4 inline-block text-purple-300 hover:underline">
            Home
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const fields = eventSelectFields();

  const { data: allRows } = await supabase
    .from("events")
    .select(fields)
    .eq("is_draft", false)
    .order("is_pinned", { ascending: false })
    .order("start_at", { ascending: true, nullsFirst: false });

  const allEvents = rowsToCards(allRows ?? []);

  const now = new Date();
  const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingRows =
    allRows?.filter((e) => {
      if (!e.start_at) return false;
      const t = new Date(e.start_at).getTime();
      return !Number.isNaN(t) && t >= now.getTime() && t <= horizon.getTime();
    }) ?? [];

  const upcomingEvents = rowsToCards(upcomingRows);

  const { data: regs } = await supabase
    .from("registrations")
    .select("event_id,created_at")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  let myRegisteredEvents: StudentMyEventCard[] = [];

  const regEventIds = Array.from(new Set((regs ?? []).map((r) => r.event_id)));
  if (regEventIds.length > 0) {
    const { data: myRows } = await supabase.from("events").select(fields).in("id", regEventIds);

    const regLatest = new Map<string, string>();
    for (const r of regs ?? []) {
      if (!regLatest.has(r.event_id)) regLatest.set(r.event_id, r.created_at);
    }

    myRegisteredEvents = (myRows ?? [])
      .filter((ev) => !ev.is_draft)
      .map((ev) => {
        const registeredAt = regLatest.get(ev.id) ?? "";
        return {
          id: ev.id,
          title: ev.title ?? "",
          description: ev.description ?? "",
          start_at: ev.start_at,
          venue: ev.venue,
          upvote_count: ev.upvote_count ?? 0,
          is_open_event: Boolean(ev.is_open_event),
          registeredAt,
        };
      })
      .sort((a, b) => {
        const ta = a.start_at ? new Date(a.start_at).getTime() : Number.POSITIVE_INFINITY;
        const tb = b.start_at ? new Date(b.start_at).getTime() : Number.POSITIVE_INFINITY;
        return ta - tb;
      });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="border-b border-white/10 bg-card/30">
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-white">Student dashboard</h1>
            <p className="mt-1 text-muted-foreground">
              Browse campus events you share with organizers
              {profile.full_name ? ` — ${profile.full_name}` : ""}.
            </p>
          </div>
        </div>

        <div className="container mx-auto space-y-6 px-4 py-10">
          {!profile.whatsapp_number ? (
            <>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                Add your WhatsApp number to get reminders for events you register for.{" "}
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
          <StudentDashboardTabs
            allEvents={allEvents}
            upcomingEvents={upcomingEvents}
            myRegisteredEvents={myRegisteredEvents}
          />
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
