import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/http/json-error";

/** Clears the Supabase session cookies for this browser (fast; does not revoke server-side tokens). */
async function clearSupabaseSession() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw error;
}

/** Browser navigation: clears cookies then sends user to `/`. */
export async function GET(request: Request) {
  try {
    await clearSupabaseSession();
  } catch {
    /* User asked to leave; still redirect — cookie clear is best-effort */
  }
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}

/** Programmatic / legacy clients: `{ ok: true }` JSON. */
export async function POST() {
  try {
    await clearSupabaseSession();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
