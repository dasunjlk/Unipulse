import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyN8nSignature } from "@/lib/auth/hmac";
import { jsonError } from "@/lib/http/json-error";

type Ctx = { params: { id: string } };

type CallbackBody = {
  ok?: boolean;
  provider?: string;
  provider_message_id?: string;
  error?: string;
};

export async function POST(request: Request, context: Ctx) {
  try {
    const { id: eventId } = context.params;
    const secret = process.env.N8N_SHARED_SECRET ?? "";
    const raw = Buffer.from(await request.arrayBuffer());
    const sig = request.headers.get("x-n8n-signature");

    if (!verifyN8nSignature(raw, sig, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(raw.toString("utf8")) as CallbackBody;

    if (!eventId || body.ok !== true) {
      return NextResponse.json(
        { ok: false, ignored: body.ok !== true, error: body.error },
        { status: 200 },
      );
    }

    const admin = createAdminClient();
    const { data: updated, error } = await admin
      .from("events")
      .update({ whatsapp_notified_at: new Date().toISOString() })
      .eq("id", eventId)
      .is("whatsapp_notified_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      updated: !!updated,
      provider: body.provider,
      provider_message_id: body.provider_message_id,
    });
  } catch (e) {
    return jsonError(e);
  }
}
