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
      size?: string | null;
    };

    const item_id = body.item_id?.trim();
    const quantity = body.quantity ?? 1;
    const size =
      typeof body.size === "string"
        ? body.size.trim() || null
        : body.size === null
          ? null
          : undefined;

    if (!item_id) {
      return NextResponse.json({ error: "item_id required" }, { status: 400 });
    }

    const supabase = createClient();
    await requireStudent(supabase);

    const { data, error } = await supabase.rpc("purchase_merch", {
      p_event_id: id,
      p_item_id: item_id,
      p_quantity: quantity,
      p_size: size ?? null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const result = data as { ok?: boolean; error?: string } | null;
    if (result && typeof result === "object" && result.ok === false) {
      return NextResponse.json(
        { error: result.error ?? "purchase_failed", result },
        { status: 400 },
      );
    }

    // TODO(v2): Stripe checkout + inventory limits.
    return NextResponse.json({ result: data });
  } catch (e) {
    return jsonError(e);
  }
}
