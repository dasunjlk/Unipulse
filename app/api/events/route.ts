import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedOrganizer } from "@/lib/auth/guards";
import { buildEventPublishedPayload, triggerWebhook } from "@/lib/n8n";
import type { Database, Json } from "@/lib/db/database.types";
import { jsonError } from "@/lib/http/json-error";
import { EVENT_CATEGORY_LINKS_SELECT } from "@/lib/event-categories";
import { validateCategoryIds, replaceEventCategoryLinks } from "@/lib/event-category-write";

export async function GET() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("events")
      .select(`*, ${EVENT_CATEGORY_LINKS_SELECT}`)
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
> & { category_ids?: string[] };

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

    const catCheck = await validateCategoryIds(supabase, body.category_ids);
    if (!catCheck.ok) {
      return NextResponse.json({ error: catCheck.error }, { status: 400 });
    }

    const row: Database["public"]["Tables"]["events"]["Insert"] = {
      organizer_id: user.id,
      location_id: body.location_id,
      title: body.title ?? "",
      description: body.description ?? "",
      proposal_file_url: body.proposal_file_url ?? null,
      cover_image_url: body.cover_image_url ?? null,
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
      .select(`*, ${EVENT_CATEGORY_LINKS_SELECT}`)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "insert failed" },
        { status: 400 },
      );
    }

    const linkRes = await replaceEventCategoryLinks(supabase, data.id, catCheck.ids);
    if (!linkRes.ok) {
      await supabase.from("events").delete().eq("id", data.id);
      return NextResponse.json({ error: linkRes.error }, { status: 400 });
    }

    const { data: withCats, error: reloadErr } = await supabase
      .from("events")
      .select(`*, ${EVENT_CATEGORY_LINKS_SELECT}`)
      .eq("id", data.id)
      .single();

    const out = withCats ?? data;

    if (!data.is_draft) {
      void triggerWebhook(
        "event-published",
        await buildEventPublishedPayload(supabase, {
          id: out.id,
          title: out.title,
          organizer_id: out.organizer_id,
        }),
      );
    }

    if (reloadErr) {
      return NextResponse.json({ event: data });
    }

    return NextResponse.json({ event: out });
  } catch (e) {
    return jsonError(e);
  }
}
