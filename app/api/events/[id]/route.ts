import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedOrganizer } from "@/lib/auth/guards";
import { triggerWebhook } from "@/lib/n8n";
import type { Database, Json } from "@/lib/db/database.types";
import { jsonError } from "@/lib/http/json-error";

type Ctx = { params: { id: string } };

export async function GET(_request: Request, context: Ctx) {
  try {
    const { id } = context.params;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ event: data });
  } catch (e) {
    return jsonError(e);
  }
}

type PatchBody = Partial<
  Omit<
    Database["public"]["Tables"]["events"]["Update"],
    "organizer_id" | "id" | "created_at"
  >
>;

export async function PATCH(request: Request, context: Ctx) {
  try {
    const { id } = context.params;
    const supabase = createClient();
    const { user } = await requireApprovedOrganizer(supabase);

    const { data: existing, error: loadErr } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (loadErr || !existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (existing.organizer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as PatchBody;

    const patch: Database["public"]["Tables"]["events"]["Update"] = {};

    if (body.title !== undefined) patch.title = body.title;
    if (body.description !== undefined) patch.description = body.description;
    if (body.proposal_file_url !== undefined)
      patch.proposal_file_url = body.proposal_file_url;
    if (body.start_at !== undefined) patch.start_at = body.start_at;
    if (body.end_at !== undefined) patch.end_at = body.end_at;
    if (body.venue !== undefined) patch.venue = body.venue;
    if (body.location_id !== undefined) {
      if (typeof body.location_id !== "string" || body.location_id.length === 0) {
        return NextResponse.json({ error: "invalid location_id" }, { status: 400 });
      }
      patch.location_id = body.location_id;
    }
    if (body.is_open_event !== undefined) patch.is_open_event = body.is_open_event;
    if (body.is_pinned !== undefined) patch.is_pinned = body.is_pinned;
    if (body.ticket_capacity !== undefined) patch.ticket_capacity = body.ticket_capacity;
    if (body.merch_items !== undefined) patch.merch_items = body.merch_items as Json;
    if (body.is_draft !== undefined) patch.is_draft = body.is_draft;
    if (body.social_caption_staging !== undefined)
      patch.social_caption_staging = body.social_caption_staging;

    const { data, error } = await supabase
      .from("events")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "update failed" },
        { status: 400 },
      );
    }

    if (existing.is_draft && data.is_draft === false) {
      const { data: organizerProfile } = await supabase
        .from("profiles")
        .select("full_name, whatsapp_number, whatsapp_consent")
        .eq("id", data.organizer_id)
        .single();

      void triggerWebhook("event-published", {
        event_id: data.id,
        title: data.title,
        organizer_id: data.organizer_id,
        organizer_full_name: organizerProfile?.full_name ?? null,
        organizer_whatsapp:
          organizerProfile?.whatsapp_consent && organizerProfile?.whatsapp_number
            ? organizerProfile.whatsapp_number
            : null,
      });
    }

    return NextResponse.json({ event: data });
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  try {
    const { id } = context.params;
    const supabase = createClient();
    const { user } = await requireApprovedOrganizer(supabase);

    const { data: existing, error: loadErr } = await supabase
      .from("events")
      .select("organizer_id")
      .eq("id", id)
      .single();

    if (loadErr || !existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (existing.organizer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase.from("events").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
