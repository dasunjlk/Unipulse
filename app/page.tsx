import { CampusMap } from "@/components/campus-map";
import { EventsSection } from "@/components/events-section";
import { HeroSection } from "@/components/hero-section";
import { SidebarFilters } from "@/components/sidebar-filters";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = createClient();
  const { data: cfg } = await supabase
    .from("app_config")
    .select("grid_n, map_background_url")
    .eq("id", 1)
    .single();
  const gridN = cfg?.grid_n ?? 10;

  const { data: locRows } = await supabase
    .from("locations")
    .select("id,name,code,grid_row,grid_col")
    .order("grid_row", { ascending: true })
    .order("grid_col", { ascending: true });

  const { data: events } = await supabase
    .from("events")
    .select(
      "id,title,description,start_at,venue,upvote_count,is_open_event,grid_row,grid_col,is_pinned",
    )
    .eq("is_draft", false)
    .order("is_pinned", { ascending: false })
    .order("start_at", { ascending: true, nullsFirst: false });

  const list = events ?? [];

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <HeroSection />
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col gap-8 lg:flex-row">
            <SidebarFilters />
            <div className="flex-1 space-y-12">
              <CampusMap
                gridN={gridN}
                locations={locRows ?? []}
                events={list}
                mapBackgroundUrl={cfg?.map_background_url ?? null}
              />
              <EventsSection events={list} />
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
