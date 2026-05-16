/** Build a Google Calendar "template" URL for one-click add (no OAuth). */
export function buildGoogleCalendarUrl(opts: {
  title: string;
  details: string;
  location: string;
  start: string | null;
  end: string | null;
}): string {
  const params = new URLSearchParams({ action: "TEMPLATE" });
  params.set("text", opts.title);
  if (opts.details) params.set("details", opts.details);
  if (opts.location) params.set("location", opts.location);

  if (opts.start) {
    const s = formatGoogleDt(new Date(opts.start));
    params.set("dates", `${s}/${opts.end ? formatGoogleDt(new Date(opts.end)) : s}`);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function formatGoogleDt(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}
