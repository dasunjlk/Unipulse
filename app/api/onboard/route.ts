import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedOrganizer } from "@/lib/auth/guards";
import { triggerWebhook } from "@/lib/n8n";
import { jsonError } from "@/lib/http/json-error";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { user } = await requireApprovedOrganizer(supabase);

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }

    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${user.id}/${Date.now()}-${safeName}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    const { error: upErr } = await supabase.storage
      .from("proposals")
      .upload(path, bytes, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 400 });
    }

    const { data: signed, error: signErr } = await supabase.storage
      .from("proposals")
      .createSignedUrl(path, 60 * 60 * 24 * 7);

    if (signErr || !signed?.signedUrl) {
      return NextResponse.json(
        { error: signErr?.message ?? "could not sign URL" },
        { status: 400 },
      );
    }

    void triggerWebhook("proposal-uploaded", {
      organizer_id: user.id,
      storage_path: path,
      file_url: signed.signedUrl,
      filename: file.name,
    });

    return NextResponse.json({ ok: true, storage_path: path });
  } catch (e) {
    return jsonError(e);
  }
}
