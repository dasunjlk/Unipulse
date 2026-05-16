import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { jsonError } from "@/lib/http/json-error";

export async function GET() {
  try {
    const supabase = createClient();
    await requireAdmin(supabase);

    const [{ data: profiles, error }, { data: usersPage }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, created_at")
        .eq("role", "student")
        .order("created_at", { ascending: false }),
      createAdminClient().auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const meta = new Map<
      string,
      { email: string | null; last_sign_in_at: string | null; banned_until: string | null }
    >();
    for (const u of usersPage?.users ?? []) {
      const bannedUntil =
        "banned_until" in u && typeof (u as { banned_until?: unknown }).banned_until === "string"
          ? (u as { banned_until: string }).banned_until
          : null;
      meta.set(u.id, {
        email: u.email ?? null,
        last_sign_in_at: u.last_sign_in_at ?? null,
        banned_until: bannedUntil,
      });
    }

    const students = (profiles ?? []).map((p) => {
      const m = meta.get(p.id);
      const bannedUntil = m?.banned_until ?? null;
      const isSuspended = bannedUntil != null && new Date(bannedUntil).getTime() > Date.now();
      return {
        id: p.id,
        full_name: p.full_name,
        email: m?.email ?? null,
        last_sign_in_at: m?.last_sign_in_at ?? null,
        banned_until: bannedUntil,
        status: isSuspended ? "suspended" : "active",
        created_at: p.created_at,
      };
    });

    return NextResponse.json({ students });
  } catch (e) {
    return jsonError(e);
  }
}
