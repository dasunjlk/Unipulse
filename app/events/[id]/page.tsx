import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  ExportManifestButton,
  MerchBuyButton,
  PublishEventButton,
  RegisterButton,
  UpvoteButton,
} from "@/app/components/scaffold-actions";
import type { Json } from "@/lib/db/database.types";

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
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !event) {
    return (
      <main>
        <p>Not found.</p>
        <Link href="/">Home</Link>
      </main>
    );
  }

  const merch = merchList(event.merch_items);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwner = user?.id === event.organizer_id;

  return (
    <main>
      {/* SCAFFOLD: replace markup with friend&apos;s UI */}
      <h1>{event.title || "(untitled)"}</h1>
      <p>{event.description}</p>
      <p>
        Venue: {event.venue ?? "—"} · Grid: ({event.grid_row},{event.grid_col}) · Draft:{" "}
        {String(event.is_draft)}
      </p>
      <p>
        <a href={`/api/events/${event.id}/ics`}>.ics download</a>
        {" · "}
        <a href={`/api/events/${event.id}/ics?format=google`}>Google Calendar</a>
      </p>

      {event.is_open_event ? (
        <UpvoteButton eventId={event.id} />
      ) : (
        <RegisterButton eventId={event.id} />
      )}

      <section>
        <h2>Merch (mock)</h2>
        {merch.length === 0 ? (
          <p>No merch items.</p>
        ) : (
          <ul>
            {merch.map((m) => (
              <li key={m.id}>
                {m.name} — ${m.price}{" "}
                <MerchBuyButton eventId={event.id} itemId={m.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {isOwner ? (
        <section>
          <h2>Organizer</h2>
          <PublishEventButton eventId={event.id} />
          <br />
          <ExportManifestButton eventId={event.id} />
        </section>
      ) : null}

      <p>
        <Link href="/">Home</Link>
      </p>
    </main>
  );
}
