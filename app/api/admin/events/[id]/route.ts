import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { jsonError } from "@/lib/http/json-error";
import { triggerWebhook } from "@/lib/n8n";
import { createClient } from "@/lib/supabase/server";

type Ctx = { params: { id: string } };

type PatchBody = {
  is_draft?: boolean;
  is_pinned?: boolean;
};

export async function PATCH(request: Request, context: Ctx) {
  try {
    const { id } = context.params;
    const supabase = createClient();
    await requireAdmin(supabase);

    const body = (await request.json()) as PatchBody;
    const patch: Record<string, boolean> = {};
    if (typeof body.is_draft === "boolean") patch.is_draft = body.is_draft;
    if (typeof body.is_pinned === "boolean") patch.is_pinned = body.is_pinned;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No allowed fields provided" }, { status: 400 });
    }

    const { data: existing, error: loadErr } = await supabase
      .from("events")
      .select("id,title,organizer_id,is_draft")
      .eq("id", id)
      .maybeSingle();

    if (loadErr || !existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data, error } = await supabase.from("events").update(patch).eq("id", id).select("*").single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "update failed" }, { status: 400 });
    }

    if (existing.is_draft && !data.is_draft) {
      void triggerWebhook("event-published", {
        event_id: data.id,
        title: data.title,
        organizer_id: data.organizer_id,
      });
    }

    return NextResponse.json({ event: data });
  } catch (e) {
    return jsonError(e);
  }
}
