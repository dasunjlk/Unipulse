/**
 * One-shot: assign each event one category from inferEventCategory(title, description),
 * or "campus" when no match. Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL.
 *
 * Run: npx tsx scripts/backfill-event-categories.ts
 */

import { createAdminClient } from "../lib/supabase/admin";
import { inferEventCategory } from "../lib/event-display";

async function main() {
  const admin = createAdminClient();

  const { data: cats, error: catErr } = await admin.from("event_categories").select("id,slug,label");

  if (catErr || !cats?.length) {
    console.error("Failed to load event_categories:", catErr?.message);
    process.exit(1);
  }

  const bySlug = new Map<string, string>();
  const byLabel = new Map<string, string>();
  for (const c of cats) {
    bySlug.set(c.slug.toLowerCase(), c.id);
    byLabel.set(c.label.trim().toLowerCase(), c.id);
  }

  function resolveCategoryId(inferred: string): string {
    const t = inferred.trim();
    if (!t) return bySlug.get("campus")!;
    const lower = t.toLowerCase();
    if (bySlug.has(lower)) return bySlug.get(lower)!;
    if (byLabel.has(lower)) return byLabel.get(lower)!;
    const dashed = lower.replace(/\s+/g, "-");
    if (bySlug.has(dashed)) return bySlug.get(dashed)!;
    return bySlug.get("campus")!;
  }

  const { data: events, error: evErr } = await admin
    .from("events")
    .select("id,title,description");

  if (evErr) {
    console.error("Failed to load events:", evErr.message);
    process.exit(1);
  }

  const { data: existingLinks } = await admin.from("event_category_links").select("event_id");

  const hasLink = new Set((existingLinks ?? []).map((r) => r.event_id));

  let inserted = 0;
  let skipped = 0;

  for (const ev of events ?? []) {
    if (hasLink.has(ev.id)) {
      skipped++;
      continue;
    }
    const inferred = inferEventCategory(ev.title ?? "", ev.description ?? "");
    const categoryId = resolveCategoryId(inferred);

    const { error: insErr } = await admin.from("event_category_links").insert({
      event_id: ev.id,
      category_id: categoryId,
    });

    if (insErr) {
      console.error(`Insert failed for event ${ev.id}:`, insErr.message);
      process.exit(1);
    }
    inserted++;
  }

  console.log(`Backfill done: inserted ${inserted}, skipped (already linked) ${skipped}.`);
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
