import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { studentSyntheticEmail } from "@/lib/auth/student-email";
import { jsonError } from "@/lib/http/json-error";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      university_id?: string;
      password?: string;
      full_name?: string;
    };

    const university_id = body.university_id?.trim();
    const password = body.password ?? "";
    const full_name = body.full_name?.trim() ?? "";

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
        { error: signError.message, hint: "Account created; login separately." },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
