"use client";

import { useCallback, useState } from "react";
import type { CampusMapLocation } from "@/components/campus-map";
import { EventsBrowser, type EventsBrowserRow } from "@/components/events-browser";
import { HeroSection } from "@/components/hero-section";

type HomeDiscoveryRootProps = {
  gridN: number;
  locations: CampusMapLocation[];
  events: EventsBrowserRow[];
  mapBackgroundUrl?: string | null;
};

export function HomeDiscoveryRoot({
  gridN,
  locations,
  events,
  mapBackgroundUrl,
}: HomeDiscoveryRootProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const toggleCategory = useCallback((id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  return (
    <>
      <HeroSection
        selectedCategories={selectedCategories}
        onToggleCategory={toggleCategory}
      />
      <div className="container mx-auto px-4 py-12">
        <EventsBrowser
          gridN={gridN}
          locations={locations}
          events={events}
          mapBackgroundUrl={mapBackgroundUrl ?? null}
          selectedCategories={selectedCategories}
          onToggleCategory={toggleCategory}
        />
      </div>
    </>
  );
}
