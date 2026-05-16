"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Map as MapIcon } from "lucide-react";

import type { CampusMapLocation } from "@/components/campus-map";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

async function fetchLocationsJson(): Promise<CampusMapLocation[]> {
  const res = await fetch("/api/locations");
  const body = (await res.json()) as { locations?: CampusMapLocation[]; error?: string };
  if (!res.ok || !body.locations) {
    throw new Error(body.error ?? "Failed to load locations");
  }
  return body.locations;
}

type LocationPickerProps = {
  gridN: number;
  locationId: string;
  /** Called whenever user selects a location (picker + mini-map) */
  onLocationIdChange: (id: string) => void;
};

export function LocationPicker({ gridN, locationId, onLocationIdChange }: LocationPickerProps) {
  const [locations, setLocations] = useState<CampusMapLocation[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [comboOpen, setComboOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await fetchLocationsJson();
        if (!cancelled) {
          setLocations(rows);
          setLoadErr(null);
        }
      } catch (e) {
        if (!cancelled)
          setLoadErr(e instanceof Error ? e.message : "Could not load map locations.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const locationsByCoord = useMemo(() => {
    const m = new Map<string, CampusMapLocation>();
    for (const loc of locations) {
      const { grid_row: r, grid_col: c } = loc;
      if (
        typeof r !== "number" ||
        typeof c !== "number" ||
        Number.isNaN(r) ||
        Number.isNaN(c) ||
        r < 0 ||
        c < 0 ||
        r >= gridN ||
        c >= gridN
      ) {
        continue;
      }
      m.set(`${r}-${c}`, loc);
    }
    return m;
  }, [locations, gridN]);

  const cells = gridN * gridN;
  const selected = locations.find((l) => l.id === locationId);

  const gridStyle = {
    gridTemplateColumns: `repeat(${gridN}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${gridN}, minmax(0, 1fr))`,
  } as const;

  return (
    <div className="space-y-3 sm:col-span-2">
      <Label>Campus location</Label>

      {loadErr ? (
        <p className="text-sm text-destructive">{loadErr}</p>
      ) : locations.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No campus locations configured yet — ask your admin.
        </p>
      ) : (
        <>
          <Popover open={comboOpen} onOpenChange={setComboOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "h-auto min-h-10 w-full justify-between border-white/15 bg-transparent text-left font-normal text-white hover:bg-white/5",
                  !selected && "text-muted-foreground",
                )}
              >
                <span className="truncate">
                  {selected ? (
                    <>
                      <span className="font-semibold">{selected.code}</span>
                      <span className="text-muted-foreground"> — </span>
                      <span>{selected.name}</span>
                    </>
                  ) : (
                    "Search campus locations..."
                  )}
                </span>
                <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" aria-hidden />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(420px,var(--radix-popover-content-available-width))] border-white/10 bg-card p-0">
              <Command className="bg-transparent">
                <CommandInput placeholder="Filter by code or name…" className="h-11" />
                <CommandList>
                  <CommandEmpty>No location matches.</CommandEmpty>
                  <CommandGroup heading="Places">
                    {locations.map((loc) => (
                      <CommandItem
                        key={loc.id}
                        value={`${loc.code} ${loc.name}`}
                        onSelect={() => {
                          onLocationIdChange(loc.id);
                          setComboOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 size-4",
                            locationId === loc.id ? "opacity-100" : "opacity-0",
                          )}
                          aria-hidden
                        />
                        <span className="font-medium">{loc.code}</span>
                        <span className="text-muted-foreground"> — </span>
                        <span>{loc.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Collapsible open={mapOpen} onOpenChange={setMapOpen}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="gap-2 text-purple-300">
                <MapIcon className="size-4 shrink-0" aria-hidden />
                {mapOpen ? "Hide cell picker" : "Pick on grid"}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <p className="mb-2 text-xs text-muted-foreground">
                Click an official location cell ({gridN}×{gridN} campus grid).
              </p>
              <div
                className="grid aspect-[5/4] max-h-[340px] w-full gap-1 rounded-xl border border-white/10 bg-black/40 p-2 sm:aspect-[16/11]"
                style={gridStyle}
              >
                {Array.from({ length: cells }).map((_, i) => {
                  const row = Math.floor(i / gridN);
                  const col = i % gridN;
                  const loc = locationsByCoord.get(`${row}-${col}`);
                  const isSel = loc?.id === locationId;
                  if (!loc) {
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled
                        className="min-h-0 rounded border border-transparent bg-black/55 opacity-[0.25]"
                      />
                    );
                  }
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        onLocationIdChange(loc.id);
                      }}
                      title={`${loc.code} · ${loc.name}`}
                      className={cn(
                        "relative flex flex-col justify-center rounded border px-1 py-1 text-center text-[10px] leading-[1.1] ring-offset-background transition-colors",
                        isSel
                          ? "border-purple-400 bg-purple-600/30 ring-2 ring-purple-400"
                          : "border-purple-800/35 bg-purple-950/40 hover:bg-purple-900/50",
                      )}
                    >
                      <span className="truncate font-semibold uppercase text-purple-200">
                        {loc.code}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}
    </div>
  );
}
