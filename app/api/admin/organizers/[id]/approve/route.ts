import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { triggerWebhook } from "@/lib/n8n";
import { jsonError } from "@/lib/http/json-error";

type Ctx = { params: { id: string } };

export async function POST(_request: Request, context: Ctx) {
  try {
    const { id } = context.params;
    const supabase = createClient();
    await requireAdmin(supabase);

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .eq("role", "organizer")
      .single();

    if (pErr || !profile) {
      return NextResponse.json({ error: "Organizer not found" }, { status: 404 });
    }

    const { error: uErr } = await supabase
      .from("profiles")
      .update({ account_status: "approved" })
      .eq("id", id);

    if (uErr) {
      return NextResponse.json({ error: uErr.message }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: authUser } = await admin.auth.admin.getUserById(id);

    void triggerWebhook("organizer-approved", {
      organizer_id: id,
      email: authUser.user?.email ?? "",
      full_name: profile.full_name,
      club_name: profile.club_name,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
