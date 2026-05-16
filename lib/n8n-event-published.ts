import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import { triggerWebhook } from "@/lib/n8n";

export type EventPublishedPayloadSource = Pick<
  Database["public"]["Tables"]["events"]["Row"],
  | "id"
  | "title"
  | "description"
  | "organizer_id"
  | "start_at"
  | "end_at"
  | "venue"
  | "location_id"
  | "is_open_event"
>;

export function siteUrlBase(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
}

/** Fire-and-forget `event-published` with organizer + public URL for Meta/n8n templates. */
export async function triggerEnrichedEventPublishedWebhook(
  supabase: SupabaseClient<Database>,
  event: EventPublishedPayloadSource,
): Promise<void> {
  const base = siteUrlBase();
  const public_url = base ? `${base}/events/${event.id}` : `/events/${event.id}`;

  const { data: org } = await supabase
    .from("profiles")
    .select("full_name, club_name, whatsapp_number")
    .eq("id", event.organizer_id)
    .maybeSingle();

  const organizer = {
    id: event.organizer_id,
    full_name: org?.full_name ?? "",
    club_name: org?.club_name ?? "",
    whatsapp_number: org?.whatsapp_number ?? null,
  };

  void triggerWebhook("event-published", {
    event_id: event.id,
    title: event.title,
    description: event.description,
    start_at: event.start_at,
    end_at: event.end_at,
    venue: event.venue,
    location_id: event.location_id,
    is_open_event: event.is_open_event,
    public_url,
    organizer,
  });
}
