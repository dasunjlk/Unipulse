import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/guards";
import { jsonError } from "@/lib/http/json-error";

type Ctx = { params: { id: string } };

export async function POST(_request: Request, context: Ctx) {
  try {
    const { id } = context.params;
    const supabase = createClient();
    await requireAdmin(supabase);

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", id)
      .eq("role", "organizer")
      .single();

    if (pErr || !profile) {
      return NextResponse.json({ error: "Organizer not found" }, { status: 404 });
    }

    const { error: uErr } = await supabase
      .from("profiles")
      .update({ account_status: "rejected" })
      .eq("id", id);

    if (uErr) {
      return NextResponse.json({ error: uErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
