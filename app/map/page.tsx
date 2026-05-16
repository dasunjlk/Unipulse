import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function MapPage() {
  const supabase = createClient();
  const { data: cfg } = await supabase.from("app_config").select("grid_n").eq("id", 1).single();
  const n = cfg?.grid_n ?? 10;

  const { data: events } = await supabase
    .from("events")
    .select("id,title,grid_row,grid_col,start_at")
    .eq("is_draft", false);

  const cells = Array.from({ length: n * n }, (_, i) => ({
    row: Math.floor(i / n),
    col: i % n,
  }));

  return (
    <main>
      {/* SCAFFOLD: replace markup with friend&apos;s UI */}
      <h1>Campus grid ({n}×{n})</h1>
      <p>
        Multiple events same cell: UI should sort by start time (closest upcoming on top). This page
        lists one label per cell for testing.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${n}, minmax(48px, 1fr))`,
          gap: 4,
          maxWidth: 720,
        }}
      >
        {cells.map(({ row, col }) => {
          const atCell = (events ?? []).filter((e) => e.grid_row === row && e.grid_col === col);
          const sorted = [...atCell].sort((a, b) => {
            const ta = a.start_at ? new Date(a.start_at).getTime() : Infinity;
            const tb = b.start_at ? new Date(b.start_at).getTime() : Infinity;
            return ta - tb;
          });
          const top = sorted[0];

          return (
            <div
              key={`${row}-${col}`}
              style={{
                border: "1px solid #ccc",
                minHeight: 48,
                fontSize: 10,
                padding: 2,
              }}
              title={top?.title ?? ""}
            >
              <div>
                {row},{col}
              </div>
              {top ? (
                <Link href={`/events/${top.id}`}>{top.title?.slice(0, 12) ?? "evt"}</Link>
              ) : (
                <span>—</span>
              )}
            </div>
          );
        })}
      </div>
      <p>
        <Link href="/">Home</Link>
      </p>
    </main>
  );
}
