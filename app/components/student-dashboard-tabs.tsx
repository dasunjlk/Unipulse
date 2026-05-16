"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";
import { UnregisterButton } from "@/app/components/scaffold-actions";
import type { HomeEventCard } from "@/components/events-section";
import { EventsSection } from "@/components/events-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  categoryGradient,
  formatEventDateTime,
  inferEventCategory,
} from "@/lib/event-display";
import { MERCH_ITEM_TYPES, merchTypeLabel, type MerchItemType } from "@/lib/merch";
import { categoryGradient, formatEventDateTime } from "@/lib/event-display";

export type StudentMyEventCard = HomeEventCard & {
  registeredAt: string;
};

export type StudentMerchPurchaseRow = {
  id: string;
  event_id: string;
  event_title: string;
  item_name: string;
  item_type: string | null;
  item_image_url: string | null;
  price: string;
  quantity: number;
  size: string | null;
  purchase_date: string;
};
function cardGradient(event: Pick<HomeEventCard, "categories">): string {
  const g = event.categories[0]?.gradient;
  if (g) return g;
  const label = event.categories[0]?.label ?? "";
  return categoryGradient(label || "Campus");
}

export function StudentDashboardTabs({
  allEvents,
  myRegisteredEvents,
  upcomingEvents,
  myPurchases,
}: {
  allEvents: HomeEventCard[];
  myRegisteredEvents: StudentMyEventCard[];
  upcomingEvents: HomeEventCard[];
  myPurchases: StudentMerchPurchaseRow[];
}) {
  return (
    <Tabs defaultValue="all" className="w-full">
      <TabsList className="border border-white/10 bg-white/5">
        <TabsTrigger value="all" className="data-[state=active]:bg-white/10">
          All events
        </TabsTrigger>
        <TabsTrigger value="mine" className="data-[state=active]:bg-white/10">
          My events
        </TabsTrigger>
        <TabsTrigger value="upcoming" className="data-[state=active]:bg-white/10">
          Upcoming (7 days)
        </TabsTrigger>
        <TabsTrigger value="purchases" className="data-[state=active]:bg-white/10">
          My purchases
        </TabsTrigger>
      </TabsList>
      <TabsContent value="all" className="mt-6">
        {allEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No published events yet.</p>
        ) : (
          <EventsSection events={allEvents} />
        )}
      </TabsContent>
      <TabsContent value="mine" className="mt-6">
        {myRegisteredEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You haven&apos;t registered for any events yet. Browse{" "}
            <strong className="text-white">All events</strong> above.
          </p>
        ) : (
          <section>
            <h2 className="mb-6 text-xl font-bold text-white">Your registrations</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {myRegisteredEvents.map((event) => (
                <RegisteredEventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        )}
      </TabsContent>
      <TabsContent value="upcoming" className="mt-6">
        {upcomingEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing starting in the next 7 days.</p>
        ) : (
          <EventsSection events={upcomingEvents} />
        )}
      </TabsContent>
      <TabsContent value="purchases" className="mt-6">
        {myPurchases.length === 0 ? (
          <p className="text-sm text-muted-foreground">No merch purchases yet.</p>
        ) : (
          <ul className="space-y-3">
            {myPurchases.map((p) => {
              const when = new Date(p.purchase_date);
              const whenStr = Number.isNaN(when.getTime())
                ? p.purchase_date
                : when.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
              const line = Number(p.price) * p.quantity;
              const money = line.toLocaleString(undefined, { style: "currency", currency: "USD" });
              const unit = Number(p.price).toLocaleString(undefined, {
                style: "currency",
                currency: "USD",
              });

              return (
                <li
                  key={p.id}
                  className="flex flex-wrap gap-3 rounded-lg border border-white/10 bg-card/50 p-4 text-sm"
                >
                  {p.item_image_url ? (
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-white/10">
                      <Image
                        src={p.item_image_url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-medium text-white">{p.item_name}</p>
                    <p className="text-xs text-muted-foreground">
                      <Link href={`/events/${p.event_id}`} className="text-purple-300 hover:underline">
                        {p.event_title || "Event"}
                      </Link>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.quantity} × {unit}
                      {p.size ? ` · Size ${p.size}` : ""} · {money}
                    </p>
                    {p.item_type && MERCH_ITEM_TYPES.includes(p.item_type as MerchItemType) ? (
                      <Badge variant="outline" className="border-white/20 text-xs">
                        {merchTypeLabel(p.item_type as MerchItemType)}
                      </Badge>
                    ) : p.item_type ? (
                      <Badge variant="outline" className="border-white/20 text-xs">
                        {p.item_type}
                      </Badge>
                    ) : null}
                    <p className="text-xs text-muted-foreground">{whenStr}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </TabsContent>
    </Tabs>
  );
}

function RegisteredEventCard({ event }: { event: StudentMyEventCard }) {
  const gradient = cardGradient(event);
  const { date, time } = formatEventDateTime(event.start_at);
  const registered = new Date(event.registeredAt);
  const registeredStr = Number.isNaN(registered.getTime())
    ? "—"
    : registered.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-card/50 transition-all duration-300 hover:border-purple-500/30 hover:shadow-lg">
      <div className={`relative h-24 overflow-hidden bg-gradient-to-br ${gradient}`}>
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
        <Badge
          variant="secondary"
          className="absolute right-3 top-3 border-0 bg-black/30 text-white backdrop-blur-sm"
        >
          Registered
        </Badge>
      </div>
      <div className="space-y-3 p-5">
        <Link href={`/events/${event.id}`}>
          <h3 className="text-lg font-semibold text-white transition-colors hover:text-purple-300">
            {event.title || "Untitled event"}
          </h3>
        </Link>
        {event.categories.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {event.categories.map((c) => (
              <Badge
                key={c.id}
                variant="outline"
                className="border-white/20 text-xs text-muted-foreground"
              >
                {c.label}
              </Badge>
            ))}
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground">Registered at: {registeredStr}</p>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0 text-purple-400" />
            <span>
              {date}
              {time ? ` at ${time}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-blue-400" />
            <span>{event.venue ?? "Venue TBA"}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/events/${event.id}`}>Details</Link>
          </Button>
          <UnregisterButton eventId={event.id} />
        </div>
      </div>
    </div>
  );
}
