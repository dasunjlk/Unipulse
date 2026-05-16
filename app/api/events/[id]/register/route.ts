import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireStudent } from "@/lib/auth/guards";
import { jsonError } from "@/lib/http/json-error";

type Ctx = { params: { id: string } };

export async function POST(_request: Request, context: Ctx) {
  try {
    const { id } = context.params;
    const supabase = createClient();
    await requireStudent(supabase);

    const { data, error } = await supabase.rpc("register_for_event", {
      p_event_id: id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ result: data });
  } catch (e) {
    return jsonError(e);
  }
}
