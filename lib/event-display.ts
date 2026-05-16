const CATEGORY_GRADIENTS: Record<string, string> = {
  Tech: "from-purple-600 to-indigo-600",
  Music: "from-pink-600 to-rose-600",
  Sports: "from-green-600 to-emerald-600",
  Workshops: "from-amber-600 to-orange-600",
  Career: "from-violet-600 to-purple-600",
  Campus: "from-blue-600 to-cyan-600",
  Default: "from-blue-600 to-cyan-600",
};

const KEYWORDS: Array<{ keys: string[]; category: string }> = [
  { keys: ["tech", "ai", "code", "hack", "software", "data"], category: "Tech" },
  { keys: ["music", "band", "concert", "dj"], category: "Music" },
  { keys: ["sport", "game", "tournament", "fitness", "soccer"], category: "Sports" },
  { keys: ["workshop", "lab", "seminar"], category: "Workshops" },
  { keys: ["career", "job", "fair", "recruit", "startup", "network"], category: "Career" },
];

export function inferEventCategory(title: string, description: string): string {
  const blob = `${title} ${description}`.toLowerCase();
  for (const row of KEYWORDS) {
    if (row.keys.some((k) => blob.includes(k))) {
      return row.category;
    }
  }
  return "Campus";
}

export function categoryGradient(category: string): string {
  return CATEGORY_GRADIENTS[category] ?? CATEGORY_GRADIENTS.Default;
}

export function formatEventDateTime(iso: string | null): { date: string; time: string } {
  if (!iso) {
    return { date: "Date TBA", time: "" };
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { date: "Date TBA", time: "" };
  }
  return {
    date: d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
  };
}
