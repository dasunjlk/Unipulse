/** Fields returned by the n8n magic-upload workflow (OpenAI extraction). */
export type MagicUploadFields = {
  eventTitle?: string;
  date?: string;
  time?: string;
  venue?: string;
  agenda?: string;
  organizerName?: string;
  eventType?: string;
  category?: string;
  description?: string;
};

function pickString(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const v = record[key];
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return undefined;
}

function unwrapPayload(payload: unknown): Record<string, unknown> {
  if (payload == null || typeof payload !== "object") {
    return {};
  }

  if (Array.isArray(payload)) {
    const first = payload[0];
    if (first && typeof first === "object") {
      const row = first as Record<string, unknown>;
      return (row.json as Record<string, unknown>) ?? row;
    }
    return {};
  }

  const o = payload as Record<string, unknown>;

  if (o.json && typeof o.json === "object" && !Array.isArray(o.json)) {
    return o.json as Record<string, unknown>;
  }

  if (o.data && typeof o.data === "object" && !Array.isArray(o.data)) {
    const nested = o.data as Record<string, unknown>;
    if (
      nested.eventTitle ||
      nested.title ||
      nested.description ||
      nested.category ||
      nested.date
    ) {
      return nested;
    }
  }

  return o;
}

/** Flatten common n8n response shapes into a single fields object. */
export function normalizeMagicUploadResponse(payload: unknown): MagicUploadFields {
  const root = unwrapPayload(payload);

  return {
    eventTitle: pickString(root, "eventTitle", "title", "event_title"),
    date: pickString(root, "date"),
    time: pickString(root, "time"),
    venue: pickString(root, "venue"),
    agenda: pickString(root, "agenda"),
    organizerName: pickString(root, "organizerName", "organizer_name", "organizer"),
    eventType: pickString(root, "eventType", "event_type", "type"),
    category: pickString(root, "category"),
    description: pickString(root, "description"),
  };
}

export function hasMagicUploadFields(fields: MagicUploadFields): boolean {
  return Object.values(fields).some(Boolean);
}

/** Store category in description so event cards can infer the right badge. */
export function buildEventDescription(fields: MagicUploadFields): string {
  const parts: string[] = [];
  if (fields.category) {
    parts.push(`Category: ${fields.category}`);
  }
  if (fields.description) {
    parts.push(fields.description);
  }
  if (fields.agenda && fields.agenda !== fields.description) {
    parts.push(fields.agenda);
  }
  return parts.join("\n\n").trim();
}
