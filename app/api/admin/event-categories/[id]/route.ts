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

    const body = (await request.json()) as Partial<
      Pick<Database["public"]["Tables"]["event_categories"]["Update"], "slug" | "label" | "gradient" | "sort_order">
    >;

    const patch: Database["public"]["Tables"]["event_categories"]["Update"] = {};

    if (body.slug !== undefined) {
      const s = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
      if (!s) {
        return NextResponse.json({ error: "slug cannot be empty" }, { status: 400 });
      }
      patch.slug = s;
    }
    if (body.label !== undefined) {
      const label = typeof body.label === "string" ? body.label.trim() : "";
      if (!label) {
        return NextResponse.json({ error: "label cannot be empty" }, { status: 400 });
      }
      patch.label = label;
    }
    if (body.gradient !== undefined) {
      const g = typeof body.gradient === "string" ? body.gradient.trim() : "";
      if (!g) {
        return NextResponse.json({ error: "gradient cannot be empty" }, { status: 400 });
      }
      patch.gradient = g;
    }
    if (body.sort_order !== undefined) {
      const so = typeof body.sort_order === "number" ? body.sort_order : Number.NaN;
      if (!Number.isFinite(so)) {
        return NextResponse.json({ error: "invalid sort_order" }, { status: 400 });
      }
      patch.sort_order = so;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "no fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("event_categories")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "update failed" }, { status: 400 });
    }

    return NextResponse.json({ category: data });
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

    const { count: linkCountRaw, error: countErr } = await supabase
      .from("event_category_links")
      .select("*", { count: "exact", head: true })
      .eq("category_id", id);

    if (countErr) {
      return NextResponse.json({ error: countErr.message }, { status: 400 });
    }

    const linkCount = linkCountRaw ?? 0;

    if (linkCount > 0) {
      if (!reassignTo) {
        return NextResponse.json(
          { error: "reassignTo query param required when category has linked events" },
          { status: 400 },
        );
      }
      if (reassignTo === id) {
        return NextResponse.json({ error: "reassignTo must be a different category" }, { status: 400 });
      }

      const { data: replacement, error: repErr } = await supabase
        .from("event_categories")
        .select("id")
        .eq("id", reassignTo)
        .maybeSingle();

      if (repErr || !replacement) {
        return NextResponse.json({ error: "invalid reassignTo category" }, { status: 400 });
      }

      const { data: affectedRows, error: affErr } = await supabase
        .from("event_category_links")
        .select("event_id")
        .eq("category_id", id);

      if (affErr) {
        return NextResponse.json({ error: affErr.message }, { status: 400 });
      }

      const eventIds = Array.from(new Set((affectedRows ?? []).map((r) => r.event_id)));

      const { error: delLinksErr } = await supabase.from("event_category_links").delete().eq("category_id", id);

      if (delLinksErr) {
        return NextResponse.json({ error: delLinksErr.message }, { status: 400 });
      }

      for (const event_id of eventIds) {
        const { count: hasTargetRaw } = await supabase
          .from("event_category_links")
          .select("*", { count: "exact", head: true })
          .eq("event_id", event_id)
          .eq("category_id", reassignTo);

        const hasTarget = (hasTargetRaw ?? 0) > 0;
        if (!hasTarget) {
          const { error: insErr } = await supabase
            .from("event_category_links")
            .insert({ event_id, category_id: reassignTo });
          if (insErr) {
            return NextResponse.json({ error: insErr.message }, { status: 400 });
          }
        }
      }
    }

    const { error: delErr } = await supabase.from("event_categories").delete().eq("id", id);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
