"use client";

import { useMemo } from "react";
import { CampusMap, type CampusMapEvent, type CampusMapLocation } from "@/components/campus-map";
import { EventsSection, type HomeEventCard } from "@/components/events-section";
import { SidebarFilters, type FilterCategoryOption } from "@/components/sidebar-filters";

export type EventsBrowserRow = HomeEventCard & CampusMapEvent;

type EventsBrowserProps = {
  gridN: number;
  locations: CampusMapLocation[];
  events: EventsBrowserRow[];
  mapBackgroundUrl?: string | null;
  filterCategories: FilterCategoryOption[];
  selectedCategories: string[];
  onToggleCategory: (id: string) => void;
  searchQuery?: string;
};

export function EventsBrowser({
  gridN,
  locations,
  events,
  mapBackgroundUrl,
  filterCategories,
  selectedCategories,
  onToggleCategory,
  searchQuery,
}: EventsBrowserProps) {
  const slugSet = useMemo(() => new Set(filterCategories.map((c) => c.id)), [filterCategories]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of filterCategories) {
      counts[c.id] = 0;
    }
    for (const e of events) {
      for (const cat of e.categories) {
        if (slugSet.has(cat.slug)) {
          counts[cat.slug] = (counts[cat.slug] ?? 0) + 1;
        }
      }
    }
    return counts;
  }, [events, filterCategories, slugSet]);

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
      const eventSlugs = new Set(e.categories.map((c) => c.slug.toLowerCase()));
      return Array.from(selectedSet).some((sel) => eventSlugs.has(sel));
    });
  }, [events, selectedCategories, searchQuery]);

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <SidebarFilters
        filterCategories={filterCategories}
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
