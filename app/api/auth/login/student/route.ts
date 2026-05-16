import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { studentSyntheticEmail } from "@/lib/auth/student-email";
import { jsonError } from "@/lib/http/json-error";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      university_id?: string;
      password?: string;
    };

    const university_id = body.university_id?.trim();
    const password = body.password ?? "";

    if (!university_id || !password) {
      return NextResponse.json(
        { error: "university_id and password required" },
        { status: 400 },
      );
    }

    const email = studentSyntheticEmail(university_id);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
