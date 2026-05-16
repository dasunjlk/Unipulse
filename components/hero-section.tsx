"use client";

import { Search } from "lucide-react";
import { SIDEBAR_CATEGORIES } from "@/components/sidebar-filters";
import { Input } from "@/components/ui/input";

export type HeroSectionProps = {
  selectedCategories?: string[];
  onToggleCategory?: (id: string) => void;
};

export function HeroSection({
  selectedCategories = [],
  onToggleCategory,
}: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden py-20 lg:py-32">
      {/* Glowing gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-purple-600/30 blur-3xl" />
        <div className="absolute right-1/4 top-1/3 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/2 h-72 w-72 rounded-full bg-indigo-600/25 blur-3xl" />
      </div>

      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-balance bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl lg:text-6xl">
            Discover Campus Events
          </h1>
          <p className="mt-6 text-pretty text-lg text-muted-foreground lg:text-xl">
            Find trending university events happening around campus.
          </p>

          {/* Search bar */}
          <div className="relative mx-auto mt-10 max-w-xl">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 blur-xl" />
            <div className="relative flex items-center rounded-2xl border border-white/10 bg-card/80 backdrop-blur-xl">
              <Search className="ml-4 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search events, workshops, meetups..."
                className="flex-1 border-0 bg-transparent text-base placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </div>

          {/* Category pills — same IDs as sidebar for shared filtering */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {SIDEBAR_CATEGORIES.map(({ id, label }) => {
              const active = selectedCategories.includes(id);
              const handleClick =
                onToggleCategory != null
                  ? () => {
                      onToggleCategory(id);
                    }
                  : undefined;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={handleClick}
                  disabled={handleClick == null}
                  aria-pressed={handleClick ? active : undefined}
                  aria-label={`Filter ${label} events`}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition-all duration-300 disabled:opacity-70 ${
                    active
                      ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25"
                      : "border border-white/10 bg-white/5 text-muted-foreground hover:border-purple-500/50 hover:bg-white/10 hover:text-white disabled:hover:border-white/10 disabled:hover:bg-white/5"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
