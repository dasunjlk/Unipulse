"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";

export type CampusMapEvent = {
  id: string;
  title: string;
  venue: string | null;
  grid_row: number;
  grid_col: number;
  start_at: string | null;
};

function lineFromIndex(i: number, n: number) {
  return Math.min(n, Math.max(1, i + 1));
}

function sortUpcoming(a: CampusMapEvent, b: CampusMapEvent) {
  const ta = a.start_at ? new Date(a.start_at).getTime() : Number.POSITIVE_INFINITY;
  const tb = b.start_at ? new Date(b.start_at).getTime() : Number.POSITIVE_INFINITY;
  return ta - tb;
}

export function CampusMap({
  gridN,
  events,
}: {
  gridN: number;
  events: CampusMapEvent[];
}) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const cells = gridN * gridN;

  const pinsByCoord = useMemo(() => {
    const map = new Map<string, CampusMapEvent[]>();
    for (const e of events) {
      const row = Number(e.grid_row);
      const col = Number(e.grid_col);
      if (
        Number.isNaN(row) ||
        Number.isNaN(col) ||
        row < 0 ||
        col < 0 ||
        row >= gridN ||
        col >= gridN
      ) {
        continue;
      }
      const key = `${row}-${col}`;
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    Array.from(map.entries()).forEach(([key, list]) => {
      list.sort(sortUpcoming);
      map.set(key, list);
    });
    return map;
  }, [events, gridN]);

  const gridStyle = {
    gridTemplateColumns: `repeat(${gridN}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${gridN}, minmax(0, 1fr))`,
  } as const;

  return (
    <section>
      <h2 className="mb-6 text-2xl font-bold text-white">Campus Map</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Active events · Hover pins to see details ·{" "}
        <Link href="/map" className="text-purple-300 hover:underline">
          Open grid view
        </Link>
      </p>
      <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-1 backdrop-blur-xl">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-500/20 via-transparent to-blue-500/20 opacity-50" />

        <div className="relative rounded-[1.4rem] bg-background/80 p-6 backdrop-blur-xl">
          <div
            className="grid aspect-[3/2] gap-2 sm:aspect-[2/1]"
            style={gridStyle}
          >
            {Array.from({ length: cells }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-white/5 bg-white/[0.02] transition-colors hover:bg-white/5"
              />
            ))}
          </div>

          <div
            className="pointer-events-none absolute inset-6 grid gap-2"
            style={gridStyle}
          >
            {Array.from(pinsByCoord.entries()).map(([coord, list]) => {
              const [rowStr, colStr] = coord.split("-");
              const row = Number(rowStr);
              const col = Number(colStr);
              const top = list[0];
              if (!top) return null;
              const extra = list.length - 1;
              const hoverKey = coord;
              return (
                <div
                  key={coord}
                  className="pointer-events-auto relative"
                  style={{
                    gridRow: lineFromIndex(row, gridN),
                    gridColumn: lineFromIndex(col, gridN),
                  }}
                  onMouseEnter={() => setHoveredKey(hoverKey)}
                  onMouseLeave={() => setHoveredKey(null)}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                      <div className="absolute inset-0 h-8 w-8 animate-pulse-glow rounded-full bg-purple-500/50 blur-md" />
                      <div className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 shadow-lg shadow-purple-500/30 transition-transform hover:scale-110">
                        <MapPin className="h-4 w-4 text-white" />
                      </div>

                      {hoveredKey === hoverKey && (
                        <div className="absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[min(16rem,calc(100vw-2rem))] -translate-x-1/2 whitespace-normal rounded-lg border border-white/10 bg-card/95 px-3 py-2 text-left text-sm shadow-xl backdrop-blur-xl">
                          <p className="font-semibold text-white">
                            <Link href={`/events/${top.id}`} className="hover:underline">
                              {top.title}
                            </Link>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {top.venue ?? "Campus"}
                          </p>
                          {extra > 0 ? (
                            <p className="mt-1 text-xs text-purple-300">+{extra} more here</p>
                          ) : null}
                          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-card/95" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-gradient-to-br from-purple-500 to-blue-500" />
              <span>Active Events</span>
            </div>
            <span className="text-white/20">|</span>
            <span>Hover pins to see details</span>
          </div>
        </div>
      </div>
    </section>
  );
}
