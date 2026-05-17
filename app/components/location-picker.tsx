"use client";

import { useEffect, useMemo, useState } from "react";

import type { CampusMapLocation } from "@/components/campus-map";
import { CampusMap } from "@/components/campus-map";
import { Label } from "@/components/ui/label";

async function fetchLocationsJson(): Promise<CampusMapLocation[]> {
  const res = await fetch("/api/locations");
  const body = (await res.json()) as { locations?: CampusMapLocation[]; error?: string };
  if (!res.ok || !body.locations) {
    throw new Error(body.error ?? "Failed to load locations");
  }
  return body.locations;
}

/** Same rules as campus grid pins: coords must parse as finite numbers inside [0, gridN). */
function normalizeLocationForGrid(loc: CampusMapLocation, gridN: number): CampusMapLocation | null {
  const row = Number(loc.grid_row);
  const col = Number(loc.grid_col);
  if (
    Number.isNaN(row) ||
    Number.isNaN(col) ||
    !Number.isFinite(row) ||
    !Number.isFinite(col) ||
    row < 0 ||
    col < 0 ||
    row >= gridN ||
    col >= gridN
  ) {
    return null;
  }
  return {
    ...loc,
    grid_row: row,
    grid_col: col,
  };
}

type LocationPickerProps = {
  gridN: number;
  locationId: string;
  /** Called when the user picks a cell on the campus grid */
  onLocationIdChange: (id: string) => void;
};

export function LocationPicker({ gridN, locationId, onLocationIdChange }: LocationPickerProps) {
  const [locations, setLocations] = useState<CampusMapLocation[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);

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

  const selectableLocations = useMemo(() => {
    const m = new Map<string, CampusMapLocation>();
    for (const raw of locations) {
      const n = normalizeLocationForGrid(raw, gridN);
      if (!n) continue;
      m.set(`${n.grid_row}-${n.grid_col}`, n);
    }
    return Array.from(m.values()).sort(
      (a, b) => a.grid_row - b.grid_row || a.grid_col - b.grid_col,
    );
  }, [locations, gridN]);

  const selected =
    selectableLocations.find((l) => l.id === locationId) ?? locations.find((l) => l.id === locationId);

  return (
    <div className="space-y-3 sm:col-span-2">
      <Label>Campus location</Label>

      {loadErr ? (
        <p className="text-sm text-destructive">{loadErr}</p>
      ) : locations.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No campus locations configured yet — ask your admin.
        </p>
      ) : selectableLocations.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No locations fall inside the current {gridN}×{gridN} campus grid — ask your admin to fix coordinates
          or grid size.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Click a labeled cell on the {gridN}×{gridN} campus grid to set the map pin for this event.
          </p>

          <CampusMap
            hideHeading
            mode="pick-location"
            gridN={gridN}
            locations={selectableLocations}
            events={[]}
            showPins={false}
            selectedLocationId={locationId}
            onPickLocation={(loc) => onLocationIdChange(loc.id)}
          />

          {selected && selectableLocations.some((l) => l.id === selected.id) ? (
            <p className="text-xs text-muted-foreground">
              Selected:{" "}
              <span className="font-semibold text-white">{selected.code}</span>
              <span className="text-muted-foreground"> — </span>
              <span>{selected.name}</span>
              <span className="text-muted-foreground">
                {" "}
                · cell ({selected.grid_row},{selected.grid_col})
              </span>
            </p>
          ) : locationId.trim() !== "" &&
            selected &&
            !selectableLocations.some((l) => l.id === selected.id) ? (
            <p className="text-xs text-amber-200/90">
              This event&apos;s location is outside the current {gridN}×{gridN} grid — pick a cell above or ask an
              admin to adjust coordinates.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">No cell selected yet.</p>
          )}
        </>
      )}
    </div>
  );
}
