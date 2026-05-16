import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/http/json-error";

const WHATSAPP_E164 = /^\+[1-9]\d{7,14}$/;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      full_name?: string;
      club_name?: string;
      whatsapp_number?: string;
      whatsapp_notifications_opt_in?: boolean;
    };

    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    const full_name = body.full_name?.trim() ?? "";
    const club_name = body.club_name?.trim() ?? "";
    const whatsapp_number = body.whatsapp_number?.trim() ?? "";

    if (!email || password.length < 6 || !club_name) {
      return NextResponse.json(
        { error: "email, club_name, and password (min 6 chars) required" },
        { status: 400 },
      );
    }

    if (!WHATSAPP_E164.test(whatsapp_number)) {
      return NextResponse.json(
        {
          error:
            "whatsapp_number must be E.164 with country code (e.g. +919876543210)",
        },
        { status: 400 },
      );
    }

    if (body.whatsapp_notifications_opt_in !== true) {
      return NextResponse.json(
        { error: "WhatsApp notifications opt-in is required for organizers" },
        { status: 400 },
      );
    }

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
        whatsapp_opt_in_at: new Date().toISOString(),
      },
    });

    if (createError) {
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
