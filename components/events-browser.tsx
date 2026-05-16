"use client";

import { useMemo } from "react";
import { CampusMap, type CampusMapEvent, type CampusMapLocation } from "@/components/campus-map";
import { EventsSection, type HomeEventCard } from "@/components/events-section";
import { SidebarFilters, SIDEBAR_CATEGORIES } from "@/components/sidebar-filters";
import { inferEventCategory } from "@/lib/event-display";

export type EventsBrowserRow = HomeEventCard & CampusMapEvent;

type EventsBrowserProps = {
  gridN: number;
  locations: CampusMapLocation[];
  events: EventsBrowserRow[];
  mapBackgroundUrl?: string | null;
  selectedCategories: string[];
  onToggleCategory: (id: string) => void;
  searchQuery?: string;
};

const SIDEBAR_IDS = new Set<string>(SIDEBAR_CATEGORIES.map((c) => c.id));

export function EventsBrowser({
  gridN,
  locations,
  events,
  mapBackgroundUrl,
  selectedCategories,
  onToggleCategory,
  searchQuery,
}: EventsBrowserProps) {
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of SIDEBAR_CATEGORIES) {
      counts[c.id] = 0;
    }
    for (const e of events) {
      const raw = inferEventCategory(e.title, e.description).toLowerCase();
      if (SIDEBAR_IDS.has(raw)) {
        counts[raw]++;
      }
    }
    return counts;
  }, [events]);

  const filteredEvents = useMemo(() => {
    const q = (searchQuery ?? "").trim().toLowerCase();
    const selectedSet = new Set(selectedCategories.map((id) => id.toLowerCase()));
    return events.filter((e) => {
      const matchesTitle = q === "" || (e.title ?? "").toLowerCase().includes(q);
      if (!matchesTitle) {
        return false;
      }
      if (selectedSet.size === 0) {
        return true;
      }
      const cat = inferEventCategory(e.title, e.description).toLowerCase();
      return selectedSet.has(cat);
    });
  }, [events, selectedCategories, searchQuery]);

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <SidebarFilters
        selectedCategories={selectedCategories}
        onToggleCategory={onToggleCategory}
        categoryCounts={categoryCounts}
      />
      <div className="flex-1 space-y-12">
        <CampusMap
          gridN={gridN}
          locations={locations}
          events={filteredEvents}
          mapBackgroundUrl={mapBackgroundUrl ?? null}
        />
        <EventsSection events={filteredEvents} />
      </div>
    </div>
  );
}
