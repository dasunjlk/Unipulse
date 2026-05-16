import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { AdminEventsPanel } from "@/app/components/admin-events-panel";
import { AdminOrganizersPanel, GridConfigForm } from "@/app/components/admin-panel";
import { AdminUsersPanel } from "@/app/components/admin-users-panel";
import { LocationsAdminPanel } from "@/app/components/locations-admin-panel";
import { LogoutButton } from "@/app/components/scaffold-actions";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  Bell,
  CalendarDays,
  LayoutDashboard,
  Map as MapIcon,
  PieChart,
  Search,
  Settings,
  Users,
  UserCog,
  FileBarChart,
} from "lucide-react";

const navItems = [
  { href: "#dashboard-overview", label: "Dashboard", icon: LayoutDashboard },
  { href: "#organizer-requests", label: "Organizer Requests", icon: Users },
  { href: "#events-management", label: "Events Management", icon: CalendarDays },
  { href: "#campus-map", label: "Campus Map Controls", icon: MapIcon },
  { href: "#user-management", label: "User Management", icon: UserCog },
  { href: "#reports", label: "Reports", icon: FileBarChart },
  { href: "#analytics", label: "Analytics", icon: BarChart3 },
  { href: "#notifications", label: "Notifications", icon: Bell },
  { href: "#settings", label: "Settings", icon: Settings },
] as const;

const approvalTrend = [
  { month: "Jan", value: 42 },
  { month: "Feb", value: 55 },
  { month: "Mar", value: 38 },
  { month: "Apr", value: 62 },
  { month: "May", value: 58 },
  { month: "Jun", value: 71 },
] as const;

const categories = [
  { name: "Tech", pct: 35 },
  { name: "Music", pct: 25 },
  { name: "Sports", pct: 20 },
  { name: "Career", pct: 15 },
  { name: "Art", pct: 5 },
] as const;

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "pending")
    return (
      <Badge variant="outline" className="border-amber-500/40 text-amber-200">
        pending
      </Badge>
    );
  if (s === "approved")
    return (
      <Badge variant="outline" className="border-emerald-500/40 text-emerald-200">
        approved
      </Badge>
    );
  if (s === "rejected")
    return (
      <Badge variant="outline" className="border-red-500/40 text-red-200">
        rejected
      </Badge>
    );
  return (
    <Badge variant="outline" className="border-white/20">
      {status}
    </Badge>
  );
}

function StatCard({
  delta,
  deltaPositive,
  value,
  label,
}: {
  delta?: string;
  deltaPositive?: boolean;
  value: string;
  label: string;
}) {
  return (
    <Card className="border-white/10 bg-card/50">
      <CardContent className="p-5">
        {delta != null ? (
          <div className="flex items-start justify-between gap-2">
            <p
              className={`text-sm font-medium ${deltaPositive === false ? "text-red-400" : "text-emerald-400"}`}
            >
              {delta}
            </p>
          </div>
        ) : null}
        <p className={`${delta != null ? "mt-2 " : ""}text-2xl font-bold tracking-tight text-white`}>
          {value}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

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

  const adminInitial =
    user.email?.slice(0, 2).toUpperCase() ??
    (typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.slice(0, 2).toUpperCase()
      : null) ??
    "AD";

  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  const fmt = new Intl.NumberFormat("en-US").format;
  const nowIso = new Date().toISOString();

  const adminClient = createAdminClient();

  const [
    { count: totalOrganizers },
    { count: pendingOrganizerRequests },
    { count: activeEventsCount },
    { count: totalStudents },
    { data: organizerProfiles },
    { data: usersPage },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "organizer")
      .eq("account_status", "approved"),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "organizer")
      .eq("account_status", "pending"),
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("is_draft", false)
      .gte("start_at", nowIso),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "student"),
    supabase
      .from("profiles")
      .select("id, full_name, club_name, university_id, account_status, created_at")
      .eq("role", "organizer")
      .order("created_at", { ascending: false }),
    adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const emailById = new Map<string, string>();
  for (const u of usersPage?.users ?? []) {
    if (u.email) emailById.set(u.id, u.email);
  }

  const dateFmt = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const organizerSnapshotRows = (organizerProfiles ?? []).map((p) => ({
    id: p.id,
    organizer: p.full_name?.trim() || "Organizer",
    university: p.club_name ?? p.university_id ?? "—",
    email: emailById.get(p.id) ?? "—",
    date: p.created_at ? dateFmt.format(new Date(p.created_at)) : "—",
    status: p.account_status as "pending" | "approved" | "rejected",
  }));

  const { data: eventsRows } = await supabase
    .from("events")
    .select("id,title,start_at,venue,is_draft,is_pinned,organizer_id")
    .order("created_at", { ascending: false });

  const organizerIds = Array.from(
    new Set((eventsRows ?? []).map((e) => e.organizer_id)),
  );
  const profilesById = new Map<string, { full_name: string; club_name: string | null }>();
  if (organizerIds.length > 0) {
    const { data: profRows } = await supabase
      .from("profiles")
      .select("id,full_name,club_name")
      .in("id", organizerIds);
    for (const p of profRows ?? []) {
      profilesById.set(p.id, { full_name: p.full_name, club_name: p.club_name });
    }
  }

  const evIdsList = (eventsRows ?? []).map((e) => e.id);
  const registrationCountByEvent: Record<string, number> = {};
  if (evIdsList.length > 0) {
    const { data: regRows } = await supabase
      .from("registrations")
      .select("event_id")
      .in("event_id", evIdsList);
    for (const r of regRows ?? []) {
      registrationCountByEvent[r.event_id] = (registrationCountByEvent[r.event_id] ?? 0) + 1;
    }
  }

  const { data: appCfgRow } = await supabase.from("app_config").select("grid_n").eq("id", 1).single();
  const gridNConfigured = appCfgRow?.grid_n ?? 10;

  const adminEventRows =
    eventsRows?.map((e) => {
      const prof = profilesById.get(e.organizer_id);
      return {
        id: e.id,
        title: e.title ?? "",
        organizerName: prof?.full_name ?? "Organizer",
        organizerClub: prof?.club_name ?? null,
        start_at: e.start_at,
        venue: e.venue,
        is_draft: e.is_draft,
        is_pinned: e.is_pinned,
        registration_count: registrationCountByEvent[e.id] ?? 0,
      };
    }) ?? [];

  return (
    <div className="flex min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-950/40 via-background to-background">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-white/10 bg-card/30 backdrop-blur-xl md:flex lg:w-64">
        <div className="flex flex-col gap-1 border-b border-white/10 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-300">UniPulse</p>
          <p className="text-lg font-bold text-white">Admin Panel</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {navItems.map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-white"
            >
              <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              {label}
            </a>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs">
            <p className="font-semibold text-emerald-300">System</p>
            <p className="text-emerald-100/90">Active</p>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{today}</p>
          <Separator className="my-4 bg-white/10" />
          <LogoutButton />
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-white/10 bg-background/80 backdrop-blur-md">
          <div className="flex flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between lg:px-8">
            <div id="dashboard-overview">
              <h1 className="text-xl font-bold text-white md:text-2xl">Dashboard Overview</h1>
              <p className="text-sm text-muted-foreground">
                Monitor and manage your campus platform
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" size="sm" asChild>
                <Link href="/dashboard/admin">Refresh Data</Link>
              </Button>
              <div className="relative flex-1 md:max-w-xs lg:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  readOnly
                  placeholder="Search events, organizers..."
                  className="border-white/10 bg-card/40 pl-9"
                  aria-label="Search (preview)"
                />
              </div>
              <Button variant="ghost" size="icon" className="relative shrink-0 text-muted-foreground">
                <Bell className="h-5 w-5" />
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-purple-600 px-1 text-[10px] font-bold text-white">
                  5
                </span>
              </Button>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-card/40 py-1 pl-1 pr-3">
                <Avatar className="h-9 w-9 border border-white/10">
                  <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-xs font-semibold text-white">
                    {adminInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-left text-xs sm:block">
                  <p className="font-medium text-white">Admin</p>
                  <p className="max-w-[140px] truncate text-muted-foreground">{user.email ?? "—"}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 space-y-10 px-4 py-8 lg:px-8">
          {/* KPI row */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard delta="+12%" value={fmt(totalOrganizers ?? 0)} label="Total Organizers" />
            <StatCard delta="+5" value={fmt(pendingOrganizerRequests ?? 0)} label="Pending Requests" />
            <StatCard delta="+8%" value={fmt(activeEventsCount ?? 0)} label="Active Events" />
            <StatCard delta="+342" value={fmt(totalStudents ?? 0)} label="Total Students" />
            <StatCard delta="+18%" value="$24,580" label="Revenue Overview" />
            <StatCard delta="-2%" deltaPositive={false} value="78.5%" label="Engagement Rate" />
          </section>

          {/* Charts row */}
          <section id="analytics" className="grid gap-6 lg:grid-cols-5">
            <Card className="border-white/10 bg-card/50 lg:col-span-3">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
                <CardTitle className="text-base font-semibold text-white">
                  Organizer Approval Requests
                </CardTitle>
                <Badge variant="secondary" className="bg-amber-500/15 text-amber-100">
                  Live pipeline
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="flex h-44 items-end justify-between gap-2 border-b border-white/10 pb-2 pt-4">
                  {approvalTrend.map(({ month, value }) => (
                    <div key={month} className="flex flex-1 flex-col items-center gap-2">
                      <div
                        className="w-full max-w-[40px] rounded-t-md bg-gradient-to-t from-purple-900/80 to-purple-500"
                        style={{ height: `${(value / 80) * 100}%`, minHeight: "28%" }}
                        title={`${month}: ${value}`}
                      />
                      <span className="text-[10px] text-muted-foreground">{month}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-between text-xs text-muted-foreground">
                  <span>0</span>
                  <span>20</span>
                  <span>40</span>
                  <span>60</span>
                  <span>80</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-card/50 lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
                  <PieChart className="h-4 w-4 text-purple-400" aria-hidden />
                  Popular Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {categories.map(({ name, pct }) => (
                  <div key={name} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{name}</span>
                      <span className="text-white">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-2 bg-white/10 [&>div]:bg-purple-500" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          {/* Organizer snapshot + Event Performance (PDF layout) */}
          <section id="reports" className="grid gap-6 lg:grid-cols-2">
            <Card className="border-white/10 bg-card/50">
              <CardHeader>
                <CardTitle className="text-white">Organizer snapshot</CardTitle>
                <p className="text-sm text-muted-foreground">
                  All organizers ordered by signup date — cross-check with live pending queue below.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[420px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead>Organizer</TableHead>
                        <TableHead className="hidden md:table-cell">University / Club</TableHead>
                        <TableHead className="hidden lg:table-cell">Email</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {organizerSnapshotRows.length === 0 ? (
                        <TableRow className="border-white/10">
                          <TableCell
                            colSpan={5}
                            className="py-6 text-center text-sm text-muted-foreground"
                          >
                            No organizers yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        organizerSnapshotRows.map((row) => (
                          <TableRow key={row.id} className="border-white/10">
                            <TableCell className="font-medium text-white">{row.organizer}</TableCell>
                            <TableCell className="hidden max-w-[140px] truncate text-muted-foreground md:table-cell">
                              {row.university}
                            </TableCell>
                            <TableCell className="hidden text-muted-foreground lg:table-cell">
                              {row.email}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{row.date}</TableCell>
                            <TableCell>{statusBadge(row.status)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <BarChart3 className="h-5 w-5 text-purple-400" aria-hidden />
                  Event Performance
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Mock KPI mix for layout — tune against real analytics later.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Registrations", pct: 82 },
                  { label: "Check-ins", pct: 64 },
                  { label: "Feedback", pct: 41 },
                ].map((row) => (
                  <div key={row.label} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="text-white">{row.pct}%</span>
                    </div>
                    <Progress value={row.pct} className="h-2 bg-white/10 [&>div]:bg-blue-500" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          {/* Live organizer queue */}
          <section id="organizer-requests">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Pending approvals</h2>
                <p className="text-sm text-muted-foreground">
                  Approve or reject organizer applications connected to your database.
                </p>
              </div>
            </div>
            <AdminOrganizersPanel />
          </section>

          {/* Events */}
          <section id="events-management">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">Event Management</h2>
              <p className="text-sm text-muted-foreground">
                Organizers publish events; you can hide or feature them for the campus feed.
              </p>
            </div>
            <AdminEventsPanel rows={adminEventRows} />
          </section>

          {/* Campus map */}
          <section id="campus-map">
            <div className="mb-4 space-y-1">
              <h2 className="text-lg font-semibold text-white">Campus Map Controls</h2>
              <p className="text-sm text-muted-foreground">
                Define labeled grid cells organizers can attach events to — grid size persists in app config.
              </p>
            </div>
            <div className="mb-6 max-w-xl">
              <GridConfigForm />
            </div>
            <LocationsAdminPanel gridN={gridNConfigured} />
          </section>

          {/* Users */}
          <section id="user-management">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">User Management</h2>
              <Badge variant="outline" className="border-white/20">
                Students
              </Badge>
            </div>
            <AdminUsersPanel />
          </section>

          {/* Placeholders for remaining nav targets */}
          <section id="notifications" className="grid gap-4 md:grid-cols-2">
            <Card className="border-white/10 bg-card/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Bell className="h-4 w-4" aria-hidden />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Configure delivery channels and escalation rules in a future sprint — no backend yet.
              </CardContent>
            </Card>
            <Card id="settings" className="border-white/10 bg-card/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Settings className="h-4 w-4" aria-hidden />
                  Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Platform branding, SSO, and audit retention — placeholders only for now.
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 pb-8 md:grid-cols-2">
            <Card className="border-white/10 bg-card/40">
              <CardHeader>
                <CardTitle className="text-white">Attendance Overview</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Summary charts hook here once attendance telemetry lands.
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-card/40">
              <CardHeader>
                <CardTitle className="text-white">Organizer Growth</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Week-over-week trend widgets align with your CRM exports when connected.
              </CardContent>
            </Card>
          </section>

          <div className="flex justify-center border-t border-white/10 pt-8 md:hidden">
            <LogoutButton />
          </div>
          <div className="flex justify-center pb-8 md:hidden">
            <Link href="/" className="text-sm text-purple-300 hover:underline">
              Back to home
            </Link>
          </div>
          <div className="hidden justify-center pb-8 md:flex">
            <Link href="/" className="text-sm text-muted-foreground hover:text-purple-300">
              ← Back to UniPulse Home
            </Link>
          </div>
        </main>
      </div>

      {/* Mobile nav strip */}
      <div className="fixed bottom-0 left-0 right-0 z-20 flex border-t border-white/10 bg-background/95 p-2 backdrop-blur-md md:hidden">
        <div className="flex w-full justify-around gap-1 overflow-x-auto">
          {navItems.slice(0, 5).map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[10px] text-muted-foreground"
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span className="max-w-[56px] truncate">{label.split(" ")[0]}</span>
            </a>
          ))}
        </div>
      </div>
      <div className="h-14 md:hidden" aria-hidden />
    </div>
  );
}
