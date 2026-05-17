import { NextResponse } from "next/server";
import { INVALID_PHONE_CODE, normalizeLkWhatsapp } from "@/lib/auth/phone";
import { jsonError } from "@/lib/http/json-error";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      whatsapp_number?: string;
      whatsapp_consent?: boolean;
    };

    const raw = body.whatsapp_number?.trim() ?? "";
    const wantsConsent = Boolean(body.whatsapp_consent);

    let normalized: string | null = null;
    if (raw.length > 0) {
      try {
        normalized = normalizeLkWhatsapp(raw);
      } catch (e) {
        if (e instanceof Error && e.message === INVALID_PHONE_CODE) {
          return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
        }
        throw e;
      }
    }

    const whatsapp_consent = normalized ? wantsConsent : false;

    const { error } = await supabase
      .from("profiles")
      .update({
        whatsapp_number: normalized,
        whatsapp_consent,
      })
      .eq("id", user.id);

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "phone_already_registered" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
