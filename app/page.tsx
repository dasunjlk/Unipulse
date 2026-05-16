import { HomeDiscoveryRoot } from "@/components/home-discovery-root";
import type { EventsBrowserRow } from "@/components/events-browser";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";
import { flattenLinkedCategories, EVENT_CATEGORY_LINKS_SELECT } from "@/lib/event-categories";

export default async function HomePage() {
  const supabase = createClient();
  const { data: cfg } = await supabase
    .from("app_config")
    .select("grid_n, map_background_url")
    .eq("id", 1)
    .single();
  const gridN = cfg?.grid_n ?? 10;

  const [{ data: catRows }, { data: locRows }, { data: events }] = await Promise.all([
    supabase
      .from("event_categories")
      .select("slug,label,sort_order")
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true }),
    supabase
      .from("locations")
      .select("id,name,code,grid_row,grid_col")
      .order("grid_row", { ascending: true })
      .order("grid_col", { ascending: true }),
    supabase
      .from("events")
      .select(
        `id,title,description,start_at,venue,upvote_count,is_open_event,grid_row,grid_col,is_pinned,${EVENT_CATEGORY_LINKS_SELECT}`,
      )
      .eq("is_draft", false)
      .order("is_pinned", { ascending: false })
      .order("start_at", { ascending: true, nullsFirst: false }),
  ]);

  const filterCategories =
    (catRows ?? []).map((c) => ({
      id: c.slug,
      label: c.label,
    })) ?? [];

  const list: EventsBrowserRow[] = (events ?? []).map((raw) => {
    const e = raw as {
      id: string;
      title: string | null;
      description: string | null;
      start_at: string | null;
      venue: string | null;
      upvote_count: number | null;
      is_open_event: boolean | null;
      grid_row: number | null;
      grid_col: number | null;
    };
    return {
      id: e.id,
      title: e.title ?? "",
      description: e.description ?? "",
      start_at: e.start_at,
      venue: e.venue,
      upvote_count: e.upvote_count ?? 0,
      is_open_event: Boolean(e.is_open_event),
      grid_row: Number(e.grid_row ?? 0),
      grid_col: Number(e.grid_col ?? 0),
      categories: flattenLinkedCategories(raw as Parameters<typeof flattenLinkedCategories>[0]),
    };
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <HomeDiscoveryRoot
          gridN={gridN}
          locations={locRows ?? []}
          events={list}
          mapBackgroundUrl={cfg?.map_background_url ?? null}
          filterCategories={filterCategories}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
