import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { jsonError } from "@/lib/http/json-error";

type Ctx = { params: { id: string } };

export async function POST(_request: Request, context: Ctx) {
  try {
    const { id } = context.params;
    const supabase = createClient();
    await requireAdmin(supabase);

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", id)
      .eq("role", "student")
      .single();

    if (pErr || !profile) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(id, {
      ban_duration: "none",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
