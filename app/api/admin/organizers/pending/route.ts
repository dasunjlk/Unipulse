import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/guards";
import { jsonError } from "@/lib/http/json-error";

export async function GET() {
  try {
    const supabase = createClient();
    await requireAdmin(supabase);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "organizer")
      .eq("account_status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ organizers: data ?? [] });
  } catch (e) {
    return jsonError(e);
  }
}
