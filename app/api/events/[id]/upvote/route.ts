import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/http/json-error";

type Ctx = { params: { id: string } };

export async function PATCH(_request: Request, context: Ctx) {
  try {
    const { id } = context.params;
    const supabase = createClient();
    const { error } = await supabase.rpc("increment_upvote", {
      p_event_id: id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
