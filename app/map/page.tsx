import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CampusMap } from "@/components/campus-map";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default async function MapPage() {
  const supabase = createClient();
  const { data: cfg } = await supabase
    .from("app_config")
    .select("grid_n, map_background_url")
    .eq("id", 1)
    .single();
  const n = cfg?.grid_n ?? 10;

  const { data: locations } = await supabase
    .from("locations")
    .select("id,name,code,grid_row,grid_col")
    .order("grid_row", { ascending: true })
    .order("grid_col", { ascending: true });

  const locList = locations ?? [];

  const { data: events } = await supabase
    .from("events")
    .select("id,title,venue,grid_row,grid_col,start_at")
    .eq("is_draft", false);

  const sortedLocs = [...locList].sort(
    (a, b) => a.grid_row - b.grid_row || a.grid_col - b.grid_col,
  );

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container mx-auto flex-1 px-4 py-10">
        <h1 className="mb-2 text-2xl font-bold text-white">Campus grid ({n}×{n})</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Official locations only · Top upcoming event per pin (same order as home).{" "}
          <Link href="/" className="text-purple-300 hover:underline">
            Home
          </Link>
        </p>
        <CampusMap hideHeading gridN={n} locations={locList} events={events ?? []} mapBackgroundUrl={cfg?.map_background_url ?? null} />
        <div className="mt-10 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-muted-foreground">
                <th className="py-2 pr-4">Code</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Cell</th>
                <th className="py-2">Top event</th>
              </tr>
            </thead>
            <tbody>
              {sortedLocs.map((loc) => {
                const atCell = (events ?? []).filter(
                  (e) => e.grid_row === loc.grid_row && e.grid_col === loc.grid_col,
                );
                const sortedEv = [...atCell].sort((a, b) => {
                  const ta = a.start_at ? new Date(a.start_at).getTime() : Infinity;
                  const tb = b.start_at ? new Date(b.start_at).getTime() : Infinity;
                  return ta - tb;
                });
                const top = sortedEv[0];
                return (
                  <tr key={loc.id} className="border-b border-white/5">
                    <td className="py-2 pr-4 font-mono text-purple-200">{loc.code}</td>
                    <td className="py-2 pr-4 text-white">{loc.name}</td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {loc.grid_row},{loc.grid_col}
                    </td>
                    <td className="py-2">
                      {top ? (
                        <Link href={`/events/${top.id}`} className="text-purple-300 hover:underline">
                          {top.title ?? top.id}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
