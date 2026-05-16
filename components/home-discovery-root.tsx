"use client";

import { useCallback, useState } from "react";
import type { CampusMapLocation } from "@/components/campus-map";
import { EventsBrowser, type EventsBrowserRow } from "@/components/events-browser";
import { HeroSection } from "@/components/hero-section";
import type { FilterCategoryOption } from "@/components/sidebar-filters";

type HomeDiscoveryRootProps = {
  gridN: number;
  locations: CampusMapLocation[];
  events: EventsBrowserRow[];
  mapBackgroundUrl?: string | null;
  filterCategories: FilterCategoryOption[];
};

export function HomeDiscoveryRoot({
  gridN,
  locations,
  events,
  mapBackgroundUrl,
  filterCategories,
}: HomeDiscoveryRootProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleCategory = useCallback((id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  return (
    <>
      <HeroSection
        filterCategories={filterCategories}
        selectedCategories={selectedCategories}
        onToggleCategory={toggleCategory}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />
      <div className="container mx-auto px-4 py-12">
        <EventsBrowser
          gridN={gridN}
          locations={locations}
          events={events}
          mapBackgroundUrl={mapBackgroundUrl ?? null}
          filterCategories={filterCategories}
          selectedCategories={selectedCategories}
          onToggleCategory={toggleCategory}
          searchQuery={searchQuery}
        />
      </div>
    </>
  );
}
