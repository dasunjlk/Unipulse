import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedOrganizer } from "@/lib/auth/guards";
import { jsonError } from "@/lib/http/json-error";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { user } = await requireApprovedOrganizer(supabase);

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image must be 5MB or smaller" }, { status: 400 });
    }

    const mime = file.type || "application/octet-stream";
    if (!mime.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${user.id}/${randomUUID()}-${safeName}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    const { error: upErr } = await supabase.storage
      .from("event-covers")
      .upload(path, bytes, {
        contentType: mime,
        upsert: false,
      });

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 400 });
    }

    const { data: pub } = supabase.storage.from("event-covers").getPublicUrl(path);
    const cover_image_url = pub?.publicUrl;
    if (!cover_image_url) {
      return NextResponse.json({ error: "Could not build public URL" }, { status: 400 });
    }

    return NextResponse.json({ cover_image_url });
  } catch (e) {
    return jsonError(e);
  }
}
