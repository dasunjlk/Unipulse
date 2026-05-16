import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/guards";
import { jsonError } from "@/lib/http/json-error";
import type { Database } from "@/lib/db/database.types";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    await requireAdmin(supabase);

    const body = (await request.json()) as Partial<
      Pick<Database["public"]["Tables"]["event_categories"]["Insert"], "slug" | "label" | "gradient" | "sort_order">
    >;

    const slugRaw = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
    const label = typeof body.label === "string" ? body.label.trim() : "";
    if (!slugRaw || !label) {
      return NextResponse.json({ error: "slug and label are required" }, { status: 400 });
    }

    const gradient =
      typeof body.gradient === "string" && body.gradient.trim() ? body.gradient.trim() : undefined;
    const sort_order =
      typeof body.sort_order === "number" && Number.isFinite(body.sort_order)
        ? body.sort_order
        : undefined;

    const row: Database["public"]["Tables"]["event_categories"]["Insert"] = {
      slug: slugRaw,
      label,
      gradient: gradient ?? "from-blue-600 to-cyan-600",
      sort_order: sort_order ?? 0,
    };

    const { data, error } = await supabase.from("event_categories").insert(row).select("*").single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 400 });
    }

    return NextResponse.json({ category: data });
  } catch (e) {
    return jsonError(e);
  }
}
