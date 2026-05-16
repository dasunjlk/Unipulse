import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedOrganizer } from "@/lib/auth/guards";
import type { Json } from "@/lib/db/database.types";
import { jsonError } from "@/lib/http/json-error";
import {
  isWearable,
  merchItemInputSchema,
  merchItemSchema,
  parseMerchItems,
  type MerchItem,
} from "@/lib/merch";

type Ctx = { params: { id: string } };

export async function POST(request: Request, context: Ctx) {
  try {
    const { id: eventId } = context.params;
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
    const parsed = merchItemInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const current = parseMerchItems(existing.merch_items);
    const input = parsed.data;
    const newItem: MerchItem = {
      id: randomUUID(),
      name: input.name,
      price: input.price,
      item_type: input.item_type,
      sizes: isWearable(input.item_type) ? input.sizes : [],
      image_url: input.image_url ?? null,
    };
    merchItemSchema.parse(newItem);

    const next = [...current, newItem];

    const { error: updateErr } = await supabase
      .from("events")
      .update({ merch_items: next as unknown as Json })
      .eq("id", eventId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({ item: newItem });
  } catch (e) {
    return jsonError(e);
  }
}
