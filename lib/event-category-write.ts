import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";

type Client = SupabaseClient<Database>;

export async function validateCategoryIds(
  client: Client,
  ids: unknown,
): Promise<{ ok: true; ids: string[] } | { ok: false; error: string }> {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { ok: false, error: "category_ids must be a non-empty array" };
  }
  const unique = Array.from(new Set(ids.map((x) => String(x)).filter((s) => s.length > 0)));
  if (unique.length === 0) {
    return { ok: false, error: "category_ids must be a non-empty array" };
  }
  const { data, error } = await client.from("event_categories").select("id").in("id", unique);
  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data || data.length !== unique.length) {
    return { ok: false, error: "one or more category_ids are invalid" };
  }
  return { ok: true, ids: unique };
}

export async function replaceEventCategoryLinks(
  client: Client,
  eventId: string,
  categoryIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const v = await validateCategoryIds(client, categoryIds);
  if (!v.ok) {
    return v;
  }
  const { error: delErr } = await client.from("event_category_links").delete().eq("event_id", eventId);
  if (delErr) {
    return { ok: false, error: delErr.message };
  }
  const rows = v.ids.map((category_id) => ({ event_id: eventId, category_id }));
  const { error: insErr } = await client.from("event_category_links").insert(rows);
  if (insErr) {
    return { ok: false, error: insErr.message };
  }
  return { ok: true };
}
