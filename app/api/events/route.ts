import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedOrganizer } from "@/lib/auth/guards";
import { triggerWebhook } from "@/lib/n8n";
import type { Database, Json } from "@/lib/db/database.types";
import { jsonError } from "@/lib/http/json-error";

export async function GET() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("start_at", { ascending: true, nullsFirst: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ events: data ?? [] });
  } catch (e) {
    return jsonError(e);
  }
}

type EventInsertBody = Partial<
  Omit<
    Database["public"]["Tables"]["events"]["Insert"],
    "organizer_id" | "id" | "created_at"
  >
>;

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { user } = await requireApprovedOrganizer(supabase);

    const body = (await request.json()) as EventInsertBody;

    if (
      typeof body.location_id !== "string" ||
      body.location_id.length === 0
    ) {
      return NextResponse.json({ error: "location_id required" }, { status: 400 });
    }

    const row: Database["public"]["Tables"]["events"]["Insert"] = {
      organizer_id: user.id,
      location_id: body.location_id,
      title: body.title ?? "",
      description: body.description ?? "",
      proposal_file_url: body.proposal_file_url ?? null,
      start_at: body.start_at ?? null,
      end_at: body.end_at ?? null,
      venue: body.venue ?? null,
      is_open_event: body.is_open_event ?? true,
      is_pinned: body.is_pinned ?? false,
      ticket_capacity: body.ticket_capacity ?? 0,
      merch_items: (body.merch_items ?? []) as Json,
      is_draft: body.is_draft ?? false,
      social_caption_staging: body.social_caption_staging ?? null,
    };

    const { data, error } = await supabase
      .from("events")
      .insert(row)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "insert failed" },
        { status: 400 },
      );
    }

    if (!data.is_draft) {
      void triggerWebhook("event-published", {
        event_id: data.id,
        title: data.title,
        organizer_id: data.organizer_id,
      });
    }

    return NextResponse.json({ event: data });
  } catch (e) {
    return jsonError(e);
  }
}
