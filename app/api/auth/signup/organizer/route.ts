import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { INVALID_PHONE_CODE, normalizeLkWhatsapp } from "@/lib/auth/phone";
import { jsonError } from "@/lib/http/json-error";

function looksLikeDuplicatePhone(message: string) {
  return (
    message.includes("profiles_whatsapp_number_uniq") ||
    message.includes("duplicate key") ||
    message.includes("already registered")
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      full_name?: string;
      club_name?: string;
      whatsapp_number?: string;
      whatsapp_consent?: boolean;
    };

    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    const full_name = body.full_name?.trim() ?? "";
    const club_name = body.club_name?.trim() ?? "";
    const rawWa = body.whatsapp_number?.trim();
    const wantsConsent = Boolean(body.whatsapp_consent);

    if (!email || password.length < 6 || !club_name || !rawWa) {
      return NextResponse.json(
        {
          error:
            "email, club_name, whatsapp_number, and password (min 6 chars) required",
        },
        { status: 400 },
      );
    }

    let whatsapp_number: string;
    try {
      whatsapp_number = normalizeLkWhatsapp(rawWa);
    } catch (e) {
      if (e instanceof Error && e.message === INVALID_PHONE_CODE) {
        return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
      }
      throw e;
    }

    const whatsapp_consent = wantsConsent;

    const admin = createAdminClient();
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: "organizer",
        full_name,
        club_name,
        whatsapp_number,
        whatsapp_consent,
      },
    });

    if (createError) {
      const msg = createError.message ?? "";
      if (looksLikeDuplicatePhone(msg)) {
        return NextResponse.json({ error: "phone_already_registered" }, { status: 409 });
      }
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    const supabase = createClient();
    const { error: signError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signError) {
      return NextResponse.json(
        { error: signError.message, hint: "Account created; awaiting approval." },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true, account_status: "pending" });
  } catch (e) {
    return jsonError(e);
  }
}
