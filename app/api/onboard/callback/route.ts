import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyN8nSignature } from "@/lib/auth/hmac";
import type { Database, Json } from "@/lib/db/database.types";
import { jsonError } from "@/lib/http/json-error";

type CallbackBody = {
  organizer_id: string;
  title?: string;
  description?: string;
  proposal_file_url?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  venue?: string | null;
  location_id?: string;
  is_open_event?: boolean;
  ticket_capacity?: number;
  merch_items?: Json;
  social_caption_staging?: string | null;
};

export async function POST(request: Request) {
  try {
    const secret = process.env.N8N_SHARED_SECRET ?? "";
    const raw = Buffer.from(await request.arrayBuffer());
    const sig = request.headers.get("x-n8n-signature");

    if (!verifyN8nSignature(raw, sig, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(raw.toString("utf8")) as CallbackBody;

    if (!body.organizer_id) {
      return NextResponse.json({ error: "organizer_id required" }, { status: 400 });
    }

    const admin = createAdminClient();

    let locationId = body.location_id;
    if (!locationId) {
      const { data: firstLoc } = await admin
        .from("locations")
        .select("id")
        .order("grid_row", { ascending: true })
        .order("grid_col", { ascending: true })
        .limit(1)
        .maybeSingle();
      locationId = firstLoc?.id;
    }

    if (!locationId) {
      return NextResponse.json({ error: "location_id required (no locations in database)" }, { status: 400 });
    }

    const row: Database["public"]["Tables"]["events"]["Insert"] = {
      organizer_id: body.organizer_id,
      location_id: locationId,
      title: body.title ?? "",
      description: body.description ?? "",
      proposal_file_url: body.proposal_file_url ?? null,
      start_at: body.start_at ?? null,
      end_at: body.end_at ?? null,
      venue: body.venue ?? null,
      is_open_event: body.is_open_event ?? true,
      is_pinned: false,
      ticket_capacity: body.ticket_capacity ?? 0,
      merch_items: (body.merch_items ?? []) as Json,
      is_draft: true,
      social_caption_staging: body.social_caption_staging ?? null,
    };

    const { data, error } = await admin.from("events").insert(row).select("*").single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "insert failed" },
        { status: 400 },
      );
    }

    const { data: campusCat } = await admin
      .from("event_categories")
      .select("id")
      .eq("slug", "campus")
      .maybeSingle();

    if (campusCat?.id) {
      await admin.from("event_category_links").insert({
        event_id: data.id,
        category_id: campusCat.id,
      });
    }

    return NextResponse.json({ event: data });
  } catch (e) {
    return jsonError(e);
  }
}
