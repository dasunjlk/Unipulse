import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CampusMap } from "@/components/campus-map";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default async function MapPage() {
  const supabase = createClient();
  const { data: cfg } = await supabase.from("app_config").select("grid_n").eq("id", 1).single();
  const n = cfg?.grid_n ?? 10;

  const { data: events } = await supabase
    .from("events")
    .select("id,title,venue,grid_row,grid_col,start_at")
    .eq("is_draft", false);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container mx-auto flex-1 px-4 py-10">
        <h1 className="mb-2 text-2xl font-bold text-white">Campus grid ({n}×{n})</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Cells list the top upcoming event per block (same ordering as the home map).{" "}
          <Link href="/" className="text-purple-300 hover:underline">
            Home
          </Link>
        </p>
        <CampusMap gridN={n} events={events ?? []} />
        <div className="mt-10 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-muted-foreground">
                <th className="py-2 pr-4">Cell</th>
                <th className="py-2">Top event</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: n * n }, (_, i) => {
                const row = Math.floor(i / n);
                const col = i % n;
                const atCell = (events ?? []).filter((e) => e.grid_row === row && e.grid_col === col);
                const sorted = [...atCell].sort((a, b) => {
                  const ta = a.start_at ? new Date(a.start_at).getTime() : Infinity;
                  const tb = b.start_at ? new Date(b.start_at).getTime() : Infinity;
                  return ta - tb;
                });
                const top = sorted[0];
                return (
                  <tr key={`${row}-${col}`} className="border-b border-white/5">
                    <td className="py-2 pr-4 text-muted-foreground">
                      {row},{col}
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
