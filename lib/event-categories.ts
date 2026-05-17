/** Admin UI + forms: allowed Tailwind `bg-gradient-to-br` stops */
export const CATEGORY_GRADIENT_PRESETS = [
  { value: "from-purple-600 to-indigo-600", label: "Purple / Indigo" },
  { value: "from-pink-600 to-rose-600", label: "Pink / Rose" },
  { value: "from-green-600 to-emerald-600", label: "Green / Emerald" },
  { value: "from-amber-600 to-orange-600", label: "Amber / Orange" },
  { value: "from-violet-600 to-purple-600", label: "Violet / Purple" },
  { value: "from-blue-600 to-cyan-600", label: "Blue / Cyan" },
  { value: "from-slate-600 to-slate-800", label: "Slate" },
] as const;

/** Supabase nested select for event rows that include linked categories */
export const EVENT_CATEGORY_LINKS_SELECT =
  "event_category_links(event_categories(id,slug,label,gradient,sort_order))" as const;

export type EventCategoryLite = {
  id: string;
  slug: string;
  label: string;
  gradient: string;
  sort_order?: number;
};

type LinkRow = {
  event_categories?: EventCategoryLite | EventCategoryLite[] | null;
};

/** Flatten `event_category_links -> event_categories` from a Supabase event row */
export function flattenLinkedCategories(row: {
  event_category_links?: LinkRow[] | null;
}): EventCategoryLite[] {
  const links = row.event_category_links;
  if (!Array.isArray(links)) return [];
  const out: EventCategoryLite[] = [];
  for (const link of links) {
    const nested = link.event_categories;
    if (nested == null) continue;
    const cat = Array.isArray(nested) ? nested[0] : nested;
    if (cat && typeof cat.id === "string" && typeof cat.slug === "string") {
      out.push({
        id: cat.id,
        slug: cat.slug,
        label: cat.label,
        gradient: cat.gradient,
        sort_order: cat.sort_order,
      });
    }
  }
  out.sort((a, b) => {
    const sa = a.sort_order ?? 999;
    const sb = b.sort_order ?? 999;
    if (sa !== sb) return sa - sb;
    return a.label.localeCompare(b.label);
  });
  return out;
}
