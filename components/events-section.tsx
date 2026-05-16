"use client";

import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EventCardActions } from "@/components/event-card-actions";
import { categoryGradient, formatEventDateTime } from "@/lib/event-display";
import type { EventCategoryLite } from "@/lib/event-categories";

export type HomeEventCard = {
  id: string;
  title: string;
  description: string;
  start_at: string | null;
  venue: string | null;
  upvote_count: number;
  is_open_event: boolean;
  categories: EventCategoryLite[];
};

function headerGradient(categories: EventCategoryLite[]): string {
  const g = categories[0]?.gradient;
  if (g) {
    return g;
  }
  const label = categories[0]?.label ?? "";
  return categoryGradient(label);
}

export function EventsSection({ events }: { events: HomeEventCard[] }) {
  return (
    <section>
      <h2 className="mb-6 text-2xl font-bold text-white">Upcoming Events</h2>
      {events.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-card/30 py-16 text-center text-sm text-muted-foreground backdrop-blur-xl">
          No events match the selected filters.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  );
}

function EventCard({ event }: { event: HomeEventCard }) {
  const gradient = headerGradient(event.categories);
  const { date, time } = formatEventDateTime(event.start_at);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-card/50 transition-all duration-300 hover:-translate-y-1 hover:border-purple-500/30 hover:shadow-xl hover:shadow-purple-500/10">
      <div className={`relative h-32 overflow-hidden bg-gradient-to-br ${gradient}`}>
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
        <div className="absolute right-3 top-3 flex max-w-[85%] flex-wrap justify-end gap-1">
          {event.categories.length === 0 ? (
            <Badge
              variant="secondary"
              className="border-0 bg-black/30 text-white backdrop-blur-sm"
            >
              Campus
            </Badge>
          ) : (
            event.categories.map((c) => (
              <Badge
                key={c.id}
                variant="secondary"
                className="border-0 bg-black/30 text-white backdrop-blur-sm"
              >
                {c.label}
              </Badge>
            ))
          )}
        </div>
      </div>

      <div className="p-5">
        <Link href={`/events/${event.id}`}>
          <h3 className="text-lg font-semibold text-white transition-colors group-hover:text-purple-300">
            {event.title || "Untitled event"}
          </h3>
        </Link>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {event.description || "No description yet."}
        </p>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 text-purple-400" />
            <span>
              {date}
              {time ? ` at ${time}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-blue-400" />
            <span>{event.venue ?? "Venue TBA"}</span>
          </div>
        </div>

        <EventCardActions
          eventId={event.id}
          isOpenEvent={event.is_open_event}
          initialUpvotes={event.upvote_count}
        />
      </div>
    </div>
  );
}
