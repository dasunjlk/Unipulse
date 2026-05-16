import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedOrganizer } from "@/lib/auth/guards";
import { triggerWebhook } from "@/lib/n8n";
import { jsonError } from "@/lib/http/json-error";

type Ctx = { params: { id: string } };

export async function POST(_request: Request, context: Ctx) {
  try {
    const { id } = context.params;
    const supabase = createClient();
    const { user } = await requireApprovedOrganizer(supabase);

    const { data: event, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !event) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (event.organizer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    void triggerWebhook("merch-manifest-export", {
      event_id: event.id,
      title: event.title,
      organizer_id: event.organizer_id,
    });

    return NextResponse.json({ ok: true, queued: true });
  } catch (e) {
    return jsonError(e);
  }
}
