import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/http/json-error";

export async function POST() {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
