import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/guards";
import { jsonError } from "@/lib/http/json-error";
import type { Database } from "@/lib/db/database.types";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    await requireAdmin(supabase);

    const body = (await request.json()) as Partial<Database["public"]["Tables"]["locations"]["Insert"]>;

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const grid_row = typeof body.grid_row === "number" ? body.grid_row : Number.NaN;
    const grid_col = typeof body.grid_col === "number" ? body.grid_col : Number.NaN;

    if (!name || !code) {
      return NextResponse.json({ error: "name and code are required" }, { status: 400 });
    }

    if (!Number.isFinite(grid_row) || !Number.isFinite(grid_col) || grid_row < 0 || grid_col < 0) {
      return NextResponse.json({ error: "grid_row and grid_col must be non-negative numbers" }, { status: 400 });
    }

    const row: Database["public"]["Tables"]["locations"]["Insert"] = {
      name,
      code,
      grid_row,
      grid_col,
    };

    const { data, error } = await supabase.from("locations").insert(row).select("*").single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 400 });
    }

    return NextResponse.json({ location: data });
  } catch (e) {
    return jsonError(e);
  }
}
