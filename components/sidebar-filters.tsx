"use client";

import Link from "next/link";
import { Flame, Clock, Tag, DollarSign } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

/** `id` is category slug (for event matching). */
export type FilterCategoryOption = {
  id: string;
  label: string;
};

const filters = [
  { id: "popular", label: "Popular", icon: Flame },
  { id: "this-week", label: "This Week", icon: Clock },
  { id: "free", label: "Free Events", icon: Tag },
  { id: "paid", label: "Paid Events", icon: DollarSign },
] as const;

/** Feature toggles — set to true when Quick Filters / Host Your Event promo are wired for production. */
const SHOW_QUICK_FILTERS = false;
const SHOW_HOST_EVENT_CARD = false;

export type SidebarFiltersProps = {
  filterCategories: FilterCategoryOption[];
  selectedCategories: string[];
  onToggleCategory: (id: string) => void;
  categoryCounts?: Record<string, number>;
};

export function SidebarFilters({
  filterCategories,
  selectedCategories,
  onToggleCategory,
  categoryCounts,
}: SidebarFiltersProps) {
  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <div className="sticky top-6 space-y-6">
        {/* Categories */}
        <div className="rounded-2xl border border-white/10 bg-card/50 p-5 backdrop-blur-xl">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Categories
          </h3>
          <div className="space-y-3">
            {filterCategories.map((category) => {
              const checkboxId = `sidebar-cat-${category.id}`;
              const count = categoryCounts?.[category.id] ?? 0;
              const checked = selectedCategories.includes(category.id);
              return (
                <label
                  key={category.id}
                  htmlFor={checkboxId}
                  className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={checkboxId}
                      checked={checked}
                      onCheckedChange={() => onToggleCategory(category.id)}
                      className="border-white/20 data-[state=checked]:border-purple-500 data-[state=checked]:bg-purple-500"
                    />
                    <span className="text-sm text-foreground">{category.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{count}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Quick Filters */}
        {SHOW_QUICK_FILTERS && (
          <div className="rounded-2xl border border-white/10 bg-card/50 p-5 backdrop-blur-xl">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Quick Filters
            </h3>
            <div className="space-y-2">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-all hover:bg-white/5 hover:text-white"
                >
                  <filter.icon className="h-4 w-4" />
                  <span>{filter.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Promo Card */}
        {SHOW_HOST_EVENT_CARD && (
          <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-600/20 to-blue-600/20 p-5">
            <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-purple-500/30 blur-2xl" />
            <h4 className="relative text-sm font-semibold text-white">Host Your Event</h4>
            <p className="relative mt-2 text-xs text-muted-foreground">
              Create and promote your own campus events to reach thousands of students.
            </p>
            <Link
              href="/signup/organizer"
              className="relative mt-4 flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:from-purple-500 hover:to-blue-500"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
