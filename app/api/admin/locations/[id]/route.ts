import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/guards";
import { jsonError } from "@/lib/http/json-error";
import type { Database } from "@/lib/db/database.types";

type Ctx = { params: { id: string } };

export async function PATCH(request: Request, context: Ctx) {
  try {
    const { id } = context.params;
    const supabase = createClient();
    await requireAdmin(supabase);

    const body = (await request.json()) as Partial<Database["public"]["Tables"]["locations"]["Update"]>;

    const patch: Database["public"]["Tables"]["locations"]["Update"] = {};

    if (body.name !== undefined) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) {
        return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
      }
      patch.name = name;
    }
    if (body.code !== undefined) {
      const code = typeof body.code === "string" ? body.code.trim() : "";
      if (!code) {
        return NextResponse.json({ error: "code cannot be empty" }, { status: 400 });
      }
      patch.code = code;
    }
    if (body.grid_row !== undefined) {
      const r = typeof body.grid_row === "number" ? body.grid_row : Number.NaN;
      if (!Number.isFinite(r) || r < 0) {
        return NextResponse.json({ error: "invalid grid_row" }, { status: 400 });
      }
      patch.grid_row = r;
    }
    if (body.grid_col !== undefined) {
      const c = typeof body.grid_col === "number" ? body.grid_col : Number.NaN;
      if (!Number.isFinite(c) || c < 0) {
        return NextResponse.json({ error: "invalid grid_col" }, { status: 400 });
      }
      patch.grid_col = c;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "no fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase.from("locations").update(patch).eq("id", id).select("*").single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "update failed" }, { status: 400 });
    }

    return NextResponse.json({ location: data });
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(request: Request, context: Ctx) {
  try {
    const { id } = context.params;
    const supabase = createClient();
    await requireAdmin(supabase);

    const reassignParam = new URL(request.url).searchParams.get("reassignTo");
    const reassignTo = reassignParam && reassignParam.length > 0 ? reassignParam : null;

    const { count: evtCountRaw, error: countErr } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("location_id", id);

    if (countErr) {
      return NextResponse.json({ error: countErr.message }, { status: 400 });
    }

    const evtCount = evtCountRaw ?? 0;

    if (evtCount > 0) {
      if (!reassignTo) {
        return NextResponse.json(
          { error: "reassignTo query param required when location has events" },
          { status: 400 },
        );
      }
      if (reassignTo === id) {
        return NextResponse.json({ error: "reassignTo must be a different location" }, { status: 400 });
      }

      const { data: replacement, error: repErr } = await supabase
        .from("locations")
        .select("id")
        .eq("id", reassignTo)
        .maybeSingle();

      if (repErr || !replacement) {
        return NextResponse.json({ error: "invalid reassignTo location" }, { status: 400 });
      }

      const { error: moveErr } = await supabase.from("events").update({ location_id: reassignTo }).eq("location_id", id);

      if (moveErr) {
        return NextResponse.json({ error: moveErr.message }, { status: 400 });
      }
    }

    const { error: delErr } = await supabase.from("locations").delete().eq("id", id);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
