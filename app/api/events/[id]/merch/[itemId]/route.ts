import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedOrganizer } from "@/lib/auth/guards";
import type { Json } from "@/lib/db/database.types";
import { jsonError } from "@/lib/http/json-error";
import { isWearable, merchItemInputPatchSchema, merchItemSchema, parseMerchItems, type MerchItem } from "@/lib/merch";

type Ctx = { params: { id: string; itemId: string } };

const patchSchema = merchItemInputPatchSchema;

export async function PATCH(request: Request, context: Ctx) {
  try {
    const { id: eventId, itemId } = context.params;
    const supabase = createClient();
    const { user } = await requireApprovedOrganizer(supabase);

    const { data: existing, error: loadErr } = await supabase
      .from("events")
      .select("id, organizer_id, merch_items")
      .eq("id", eventId)
      .single();

    if (loadErr || !existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (existing.organizer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: unknown = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const items = parseMerchItems(existing.merch_items);
    const idx = items.findIndex((i) => i.id === itemId);
    if (idx === -1) {
      return NextResponse.json({ error: "Merch item not found" }, { status: 404 });
    }

    const cur = items[idx]!;
    const patch = parsed.data;
    let nextItem: MerchItem = { ...cur };

    if (patch.name !== undefined) nextItem.name = patch.name;
    if (patch.price !== undefined) nextItem.price = patch.price;
    if (patch.item_type !== undefined) nextItem.item_type = patch.item_type;
    if (patch.sizes !== undefined) nextItem.sizes = patch.sizes;
    if (patch.image_url !== undefined) nextItem.image_url = patch.image_url;

    if (!isWearable(nextItem.item_type)) nextItem.sizes = [];
    else if (patch.sizes === undefined && patch.item_type !== undefined && isWearable(patch.item_type)) {
      nextItem.sizes = cur.sizes;
    }

    merchItemSchema.parse(nextItem);

    const next = items.map((i) => (i.id === itemId ? nextItem : i));

    const { error: updateErr } = await supabase
      .from("events")
      .update({ merch_items: next as unknown as Json })
      .eq("id", eventId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({ item: nextItem });
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  try {
    const { id: eventId, itemId } = context.params;
    const supabase = createClient();
    const { user } = await requireApprovedOrganizer(supabase);

    const { data: existing, error: loadErr } = await supabase
      .from("events")
      .select("id, organizer_id, merch_items")
      .eq("id", eventId)
      .single();

    if (loadErr || !existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (existing.organizer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const items = parseMerchItems(existing.merch_items);
    const next = items.filter((i) => i.id !== itemId);
    if (next.length === items.length) {
      return NextResponse.json({ error: "Merch item not found" }, { status: 404 });
    }

    const { error: updateErr } = await supabase
      .from("events")
      .update({ merch_items: next as unknown as Json })
      .eq("id", eventId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
