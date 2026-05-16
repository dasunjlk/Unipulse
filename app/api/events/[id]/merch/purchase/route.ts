import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireStudent } from "@/lib/auth/guards";
import { jsonError } from "@/lib/http/json-error";

type Ctx = { params: { id: string } };

export async function POST(request: Request, context: Ctx) {
  try {
    const { id } = context.params;
    const body = (await request.json()) as {
      item_id?: string;
      quantity?: number;
    };

    const item_id = body.item_id?.trim();
    const quantity = body.quantity ?? 1;

    if (!item_id) {
      return NextResponse.json({ error: "item_id required" }, { status: 400 });
    }

    const supabase = createClient();
    await requireStudent(supabase);

    const { data, error } = await supabase.rpc("purchase_merch", {
      p_event_id: id,
      p_item_id: item_id,
      p_quantity: quantity,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // TODO(v2): Stripe checkout + inventory limits.
    return NextResponse.json({ result: data });
  } catch (e) {
    return jsonError(e);
  }
}
