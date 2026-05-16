import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildGoogleCalendarUrl } from "@/lib/calendar-links";
import { jsonError } from "@/lib/http/json-error";

type Ctx = { params: { id: string } };

function escapeIcsText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,");
}

export async function GET(request: Request, context: Ctx) {
  try {
    const { id } = context.params;
    const supabase = createClient();
    const { data: event, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !event) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const format = url.searchParams.get("format");

    if (format === "google") {
      const g = buildGoogleCalendarUrl({
        title: event.title,
        details: event.description,
        location: event.venue ?? "",
        start: event.start_at,
        end: event.end_at,
      });
      return NextResponse.redirect(g);
    }

    const dtStamp = formatIcsUtc(new Date());
    const dtStart = event.start_at ? formatIcsUtc(new Date(event.start_at)) : dtStamp;
    const dtEnd = event.end_at ? formatIcsUtc(new Date(event.end_at)) : dtStart;

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//UniPulse//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${event.id}@unipulse`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeIcsText(event.title)}`,
      event.description
        ? `DESCRIPTION:${escapeIcsText(event.description)}`
        : undefined,
      event.venue ? `LOCATION:${escapeIcsText(event.venue)}` : undefined,
      "END:VEVENT",
      "END:VCALENDAR",
    ].filter(Boolean);

    const body = lines.join("\r\n") + "\r\n";

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="unipulse-${event.id}.ics"`,
      },
    });
  } catch (e) {
    return jsonError(e);
  }
}

function formatIcsUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}
