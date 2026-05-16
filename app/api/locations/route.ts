import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/http/json-error";

/** Public list for map + organizer location picker */
export async function GET() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("locations")
      .select("id,name,code,grid_row,grid_col")
      .order("grid_row", { ascending: true })
      .order("grid_col", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ locations: data ?? [] });
  } catch (e) {
    return jsonError(e);
  }
}
