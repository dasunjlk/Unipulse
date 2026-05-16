import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedOrganizer } from "@/lib/auth/guards";
import { jsonError } from "@/lib/http/json-error";
import { normalizeMagicUploadResponse } from "@/lib/magic-upload-extract";

export const runtime = "nodejs";
export const maxDuration = 60;

const N8N_URL =
  process.env.N8N_MAGIC_UPLOAD_URL ??
  "https://dasunjlk.app.n8n.cloud/webhook/magic-upload";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    await requireApprovedOrganizer(createClient());

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "file too large (max 10MB)" },
        { status: 413 },
      );
    }
    if (!/pdf/i.test(file.type) && !/\.pdf$/i.test(file.name)) {
      return NextResponse.json({ error: "PDF required" }, { status: 415 });
    }

    const out = new FormData();
    out.append(
      "file",
      new Blob([await file.arrayBuffer()], {
        type: file.type || "application/pdf",
      }),
      file.name,
    );

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 55_000);

    const res = await fetch(N8N_URL, {
      method: "POST",
      body: out,
      signal: ctrl.signal,
    });

    clearTimeout(timer);

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        {
          error: "n8n webhook failed",
          status: res.status,
          body: text.slice(0, 500),
        },
        { status: 502 },
      );
    }

    try {
      return NextResponse.json(normalizeMagicUploadResponse(JSON.parse(text)));
    } catch {
      return NextResponse.json({ raw: text });
    }
  } catch (e) {
    return jsonError(e);
  }
}
