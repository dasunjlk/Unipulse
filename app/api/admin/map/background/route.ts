import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/guards";
import { jsonError } from "@/lib/http/json-error";

const BUCKET = "campus-map";
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    await requireAdmin(supabase);

    const fd = await request.formData();
    const file = fd.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "JPEG, PNG, WebP, or GIF only" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Max file size is 8MB" }, { status: 400 });
    }

    const ext =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : file.type === "image/gif"
            ? "gif"
            : "jpg";

    const path = `backgrounds/${randomBytes(12).toString("hex")}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, buf, {
      contentType: file.type,
      upsert: false,
    });

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 400 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(path);

    const { data: cfgRow, error: cfgErr } = await supabase
      .from("app_config")
      .update({
        map_background_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1)
      .select("map_background_url")
      .single();

    if (cfgErr || !cfgRow) {
      return NextResponse.json({ error: cfgErr?.message ?? "config update failed" }, { status: 400 });
    }

    return NextResponse.json({ map_background_url: cfgRow.map_background_url });
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE() {
  try {
    const supabase = createClient();
    await requireAdmin(supabase);

    const { error } = await supabase
      .from("app_config")
      .update({
        map_background_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
