import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/guards";
import { jsonError } from "@/lib/http/json-error";

export async function GET() {
  try {
    const supabase = createClient();
    await requireAdmin(supabase);

    const { data, error } = await supabase.from("app_config").select("*").eq("id", 1).single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "missing config" }, { status: 400 });
    }

    return NextResponse.json({ config: data });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createClient();
    await requireAdmin(supabase);

    const body = (await request.json()) as { grid_n?: number };
    const grid_n = body.grid_n;

    if (typeof grid_n !== "number" || grid_n < 1 || grid_n > 99) {
      return NextResponse.json({ error: "grid_n must be 1–99" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("app_config")
      .update({ grid_n })
      .eq("id", 1)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "update failed" }, { status: 400 });
    }

    return NextResponse.json({ config: data });
  } catch (e) {
    return jsonError(e);
  }
}
