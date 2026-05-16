import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { studentSyntheticEmail } from "@/lib/auth/student-email";
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
      university_id?: string;
      password?: string;
      full_name?: string;
      whatsapp_number?: string;
      whatsapp_consent?: boolean;
    };

    const university_id = body.university_id?.trim();
    const password = body.password ?? "";
    const full_name = body.full_name?.trim() ?? "";
    const rawWa = body.whatsapp_number?.trim();
    const wantsConsent = Boolean(body.whatsapp_consent);

    let whatsapp_number: string | undefined;
    if (rawWa) {
      try {
        whatsapp_number = normalizeLkWhatsapp(rawWa);
      } catch (e) {
        if (e instanceof Error && e.message === INVALID_PHONE_CODE) {
          return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
        }
        throw e;
      }
    }

    const whatsapp_consent = whatsapp_number ? wantsConsent : false;

    if (!university_id || password.length < 6) {
      return NextResponse.json(
        { error: "university_id and password (min 6 chars) required" },
        { status: 400 },
      );
    }

    const email = studentSyntheticEmail(university_id);

    const admin = createAdminClient();
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: "student",
        full_name,
        university_id,
        ...(whatsapp_number ? { whatsapp_number } : {}),
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
        { error: signError.message, hint: "Account created; login separately." },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
