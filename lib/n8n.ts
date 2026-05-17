import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Outbound n8n webhooks (Next.js → n8n).
 *
 * Expected workflow paths on your n8n instance (relative to `N8N_BASE_URL`):
 * - POST `/webhook/proposal-uploaded` — organizer uploaded a proposal file URL
 * - POST `/webhook/organizer-approved` — admin approved a pending organizer
 * - POST `/webhook/event-published` — event left draft / became visible to students (payload includes optional `organizer_full_name`, `organizer_whatsapp` when consent + number present)
 * - POST `/webhook/merch-manifest-export` — compile merch sheet → PDF email
 *
 * Inbound callbacks (n8n → Next.js) live under `/api/onboard/callback` with header `X-N8N-Signature`.
 */

export type N8nWebhookName =
  | "proposal-uploaded"
  | "organizer-approved"
  | "event-published"
  | "merch-manifest-export";

function webhookPath(name: N8nWebhookName): string {
  return `/webhook/${name}`;
}

function signBody(secret: string, body: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

/** Fire-and-forget: logs errors but never throws (slow/unreachable n8n must not break UX). */
export async function triggerWebhook(
  name: N8nWebhookName,
  payload: Record<string, unknown>,
): Promise<void> {
  const base = process.env.N8N_BASE_URL?.replace(/\/+$/, "");
  const secret = process.env.N8N_SHARED_SECRET;

  if (!base || !secret) {
    console.warn(`[n8n] skip ${name}: missing N8N_BASE_URL or N8N_SHARED_SECRET`);
    return;
  }

  const body = JSON.stringify(payload);
  const signature = signBody(secret, body);
  const url = `${base}${webhookPath(name)}`;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15_000);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-N8N-Signature": signature,
      },
      body,
      signal: ctrl.signal,
    });

    clearTimeout(t);

    if (!res.ok) {
      console.warn(`[n8n] ${name} HTTP ${res.status} ${res.statusText}`);
    }
  } catch (e) {
    console.warn(`[n8n] ${name} failed (non-fatal)`, e);
  }
}

export async function buildEventPublishedPayload(
  supabase: SupabaseClient,
  event: { id: string; title: string; organizer_id: string },
): Promise<Record<string, unknown>> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, whatsapp_number, whatsapp_consent")
    .eq("id", event.organizer_id)
    .single();

  return {
    event_id: event.id,
    title: event.title,
    organizer_id: event.organizer_id,
    organizer_full_name: profile?.full_name ?? null,
    organizer_whatsapp:
      profile?.whatsapp_consent && profile?.whatsapp_number
        ? profile.whatsapp_number
        : null,
  };
}
