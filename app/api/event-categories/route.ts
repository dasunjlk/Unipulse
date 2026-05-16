import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/http/json-error";

/** Public list for filters and event forms */
export async function GET() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("event_categories")
      .select("id,slug,label,gradient,sort_order")
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ categories: data ?? [] });
  } catch (e) {
    return jsonError(e);
  }
}
