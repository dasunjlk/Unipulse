import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireStudent } from "@/lib/auth/guards";
import { jsonError } from "@/lib/http/json-error";
import type { Json } from "@/lib/db/database.types";
import { notifyMerchCheckout } from "@/lib/n8n-merch-checkout";

type Ctx = { params: { id: string } };

function findMerchItem(
  merchItems: Json,
  itemId: string,
): { name: string; price: number } | null {
  if (!Array.isArray(merchItems)) return null;
  for (const x of merchItems) {
    if (typeof x !== "object" || x === null || !("id" in x)) continue;
    const o = x as Record<string, Json>;
    if (String(o.id ?? "") !== itemId) continue;
    return {
      name: String(o.name ?? "Item"),
      price: Number(o.price ?? 0),
    };
  }
  return null;
}

export async function POST(request: Request, context: Ctx) {
  try {
    const { id: eventId } = context.params;
    const body = (await request.json()) as {
      item_id?: string;
      quantity?: number;
      size?: string;
    };

    const item_id = body.item_id?.trim();
    const quantity = body.quantity ?? 1;
    const size = (body.size ?? "").trim() || "One size";

    if (!item_id) {
      return NextResponse.json({ error: "item_id required" }, { status: 400 });
    }

    const supabase = createClient();
    const { user, profile } = await requireStudent(supabase);

    const { data, error } = await supabase.rpc("purchase_merch", {
      p_event_id: eventId,
      p_item_id: item_id,
      p_quantity: quantity,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const result = data as { ok?: boolean; error?: string } | null;
    if (!result || result.ok !== true) {
      return NextResponse.json(
        { error: result?.error ?? "Purchase failed" },
        { status: 400 },
      );
    }

    const { data: eventRow } = await supabase
      .from("events")
      .select("title, merch_items")
      .eq("id", eventId)
      .single();

    const itemMeta = findMerchItem(eventRow?.merch_items ?? null, item_id);
    const itemName = itemMeta?.name ?? "Item";
    const unitPrice = itemMeta?.price ?? 0;
    const q = Math.max(1, quantity);
    const totalPrice = Math.round(unitPrice * q * 100) / 100;

    notifyMerchCheckout({
      eventId,
      eventTitle: eventRow?.title ?? "",
      buyerName: profile.full_name ?? "",
      buyerEmail: user.email ?? "",
      item: itemName,
      size,
      quantity: q,
      totalPrice,
      orderedAt: new Date().toISOString(),
    });

    // TODO(v2): Stripe checkout + inventory limits.
    return NextResponse.json({ result: data });
  } catch (e) {
    return jsonError(e);
  }
}
