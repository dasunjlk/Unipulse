import Link from "next/link";
import { Calendar, Clock, MapPin, Share2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/db/database.types";
import {
  ExportManifestButton,
  MerchBuyButton,
  PublishEventButton,
  RegisterButton,
  UpvoteButton,
} from "@/app/components/scaffold-actions";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EVENT_CATEGORY_LINKS_SELECT, flattenLinkedCategories } from "@/lib/event-categories";

type PageProps = { params: { id: string } };

function merchList(raw: Json): { id: string; name: string; price: number }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      if (typeof x !== "object" || x === null || !("id" in x)) return null;
      const o = x as Record<string, Json>;
      const id = String(o.id ?? "");
      if (!id) return null;
      return {
        id,
        name: String(o.name ?? "Item"),
        price: Number(o.price ?? 0),
      };
    })
    .filter(Boolean) as { id: string; name: string; price: number }[];
}

export default async function EventDetailPage({ params }: PageProps) {
  const supabase = createClient();
  const { data: event, error } = await supabase
    .from("events")
    .select(`*, locations(code,name,grid_row,grid_col), ${EVENT_CATEGORY_LINKS_SELECT}`)
    .eq("id", params.id)
    .single();

  if (error || !event) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="container mx-auto flex-1 px-4 py-16 text-center">
          <p className="text-muted-foreground">Event not found.</p>
          <Link href="/" className="mt-4 inline-block text-purple-300 hover:underline">
            Back home
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const { data: organizer } = await supabase
    .from("profiles")
    .select("full_name, club_name")
    .eq("id", event.organizer_id)
    .maybeSingle();

  const { count: regCount } = await supabase
    .from("registrations")
    .select("*", { count: "exact", head: true })
    .eq("event_id", event.id);

  const registered = regCount ?? 0;
  const capacity = event.ticket_capacity ?? 0;
  const spotsLabel =
    capacity > 0 ? `${registered}/${capacity}` : `${registered} registered`;

  const merch = merchList(event.merch_items);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwner = user?.id === event.organizer_id;
  const categories = flattenLinkedCategories(
    event as unknown as Parameters<typeof flattenLinkedCategories>[0],
  );

  const locNestedRaw = (
    event as unknown as {
      locations?: { code: string; name: string; grid_row: number; grid_col: number } | null;
    }
  ).locations;
  const locationPin =
    locNestedRaw && typeof locNestedRaw === "object" && !Array.isArray(locNestedRaw)
      ? locNestedRaw
      : null;

  const start = event.start_at ? new Date(event.start_at) : null;
  const end = event.end_at ? new Date(event.end_at) : null;
  const dateStr =
    start && !Number.isNaN(start.getTime())
      ? start.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
      : "—";
  const timeStr =
    start && !Number.isNaN(start.getTime())
      ? `${start.toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })}${end && !Number.isNaN(end.getTime()) ? ` - ${end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}` : ""}`
      : "—";

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="border-b border-white/10 bg-card/30">
          <div className="container mx-auto px-4 py-6">
            <Link
              href="/"
              className="mb-4 inline-flex text-sm text-muted-foreground hover:text-white"
            >
              ← Back to events
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-0 bg-emerald-500/20 text-emerald-200">
                {event.is_open_event ? "Free Entry" : "Registration"}
              </Badge>
              {categories.length === 0 ? (
                <Badge variant="secondary" className="border-0 bg-white/10">
                  Campus
                </Badge>
              ) : (
                categories.map((c) => (
                  <Badge key={c.id} variant="secondary" className="border-0 bg-white/10">
                    {c.label}
                  </Badge>
                ))
              )}
            </div>
            <h1 className="mt-4 text-3xl font-bold text-white md:text-4xl">
              {event.title || "(untitled)"}
            </h1>
            <p className="mt-3 text-muted-foreground">
              {organizer?.full_name ?? "Organizer"} · {organizer?.club_name ?? "Event Organizer"}
            </p>
          </div>
        </div>

        <div className="container mx-auto grid gap-10 px-4 py-10 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card className="border-white/10 bg-card/40 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white">About This Event</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p className="whitespace-pre-wrap">{event.description || "No description."}</p>
              </CardContent>
            </Card>

            <section>
              <h3 className="mb-4 text-lg font-semibold text-white">Speakers</h3>
              <div className="flex flex-wrap gap-4">
                {["SC", "JM", "LP"].map((x) => (
                  <div key={x} className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border border-white/10">
                      <AvatarFallback>{x}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-white">TBA</p>
                      <p className="text-xs text-muted-foreground">Guest speaker</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Speaker list is illustrative — hook into your CMS when ready.
              </p>
            </section>

            <section>
              <h3 className="mb-4 text-lg font-semibold text-white">Gallery Preview</h3>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="aspect-video rounded-xl border border-white/10 bg-gradient-to-br from-purple-600/30 to-blue-600/20"
                  />
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <Card className="sticky top-24 border-white/10 bg-card/50 backdrop-blur-xl">
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-5 w-5 text-purple-400" />
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Date</p>
                    <p className="text-white">{dateStr}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 text-purple-400" />
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Time</p>
                    <p className="text-white">{timeStr}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-blue-400" />
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Venue</p>
                    <p className="text-white">{event.venue ?? "—"}</p>
                  </div>
                </div>

                <Separator className="bg-white/10" />

                <div>
                  <p className="text-xs text-muted-foreground">Pricing</p>
                  <p className="text-lg font-semibold text-white">
                    {event.is_open_event ? "Free" : "See checkout"}
                  </p>
                  <p className="text-xs text-muted-foreground">No payment required for open events</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Spots filled</p>
                  <p className="text-xl font-semibold text-white">{spotsLabel}</p>
                </div>

                <div className="space-y-3">
                  {event.is_open_event ? <UpvoteButton eventId={event.id} /> : <RegisterButton eventId={event.id} />}
                  <div className="flex gap-2">
                    <Button variant="secondary" type="button" className="flex-1" asChild>
                      <Link href={`/api/events/${event.id}/ics`}>.ics</Link>
                    </Button>
                    <Button variant="ghost" type="button" size="icon" aria-label="Save">
                      <span className="text-xs">Save</span>
                    </Button>
                    <Button variant="ghost" type="button" size="icon" aria-label="Share">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="link" className="h-auto p-0 text-purple-300" asChild>
                    <Link href={`/api/events/${event.id}/ics?format=google`}>Add to Google Calendar</Link>
                  </Button>
                </div>

                {merch.length > 0 ? (
                  <div className="space-y-2 border-t border-white/10 pt-4">
                    <p className="text-sm font-medium text-white">Merch (mock)</p>
                    <ul className="space-y-2">
                      {merch.map((m) => (
                        <li
                          key={m.id}
                          className="flex items-center justify-between text-sm text-muted-foreground"
                        >
                          <span>
                            {m.name} — ${m.price}
                          </span>
                          <MerchBuyButton eventId={event.id} itemId={m.id} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {isOwner ? (
                  <div className="space-y-2 border-t border-white/10 pt-4">
                    <p className="text-sm font-medium text-amber-100">Organizer tools</p>
                    <PublishEventButton eventId={event.id} />
                    <ExportManifestButton eventId={event.id} />
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-card/40">
              <CardHeader>
                <CardTitle className="text-base text-white">Event Location</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>{event.venue ?? "Campus venue"}</p>
                <p className="mt-1 text-xs">
                  Campus map:{" "}
                  {locationPin ? (
                    <>
                      <span className="font-medium text-purple-200">{locationPin.code}</span>
                      {" · "}
                      {locationPin.name} ({event.grid_row}, {event.grid_col})
                    </>
                  ) : (
                    <>
                      Pin ({event.grid_row}, {event.grid_col})
                    </>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
