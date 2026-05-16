"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationPicker } from "@/app/components/location-picker";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export type EventFormInitial = {
  id?: string;
  title?: string;
  description?: string;
  start_at?: string | null;
  end_at?: string | null;
  venue?: string | null;
  location_id?: string;
  is_open_event?: boolean;
  ticket_capacity?: number;
  is_draft?: boolean;
};

function isoToDateTimeParts(iso: string | null | undefined): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}` };
}

function combineLocalToIso(dateStr: string, timeStr: string): string | null {
  const dPart = dateStr.trim();
  if (!dPart) return null;
  const tPart = timeStr.trim() || "00:00";
  const d = new Date(`${dPart}T${tPart}:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

async function parseJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
}

export function EventForm({
  gridN,
  mode,
  initial,
  onSuccess,
  submitLabel,
}: {
  gridN?: number;
  mode: "create" | "edit";
  initial?: EventFormInitial | null;
  onSuccess?: () => void;
  submitLabel?: string;
}) {
  const resolvedGrid = typeof gridN === "number" && gridN >= 1 ? gridN : 10;

  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [isOpenEvent, setIsOpenEvent] = useState(initial?.is_open_event !== false);
  const [isDraft, setIsDraft] = useState(initial?.is_draft === true);
  const [locationId, setLocationId] = useState(initial?.location_id ?? "");

  useEffect(() => {
    setIsOpenEvent(initial?.is_open_event !== false);
    setIsDraft(initial?.is_draft === true);
    setLocationId(initial?.location_id ?? "");
  }, [
    initial?.id,
    initial?.is_open_event,
    initial?.is_draft,
    initial?.location_id,
  ]);

  const startParts = isoToDateTimeParts(initial?.start_at);
  const endParts = isoToDateTimeParts(initial?.end_at);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const fd = new FormData(e.currentTarget);

    const title = String(fd.get("title") ?? "");
    const description = String(fd.get("description") ?? "");
    const venueRaw = fd.get("venue");
    const venue = venueRaw !== null && String(venueRaw).trim() !== "" ? String(venueRaw) : null;
    const ticket_capacity = Math.max(0, Number(fd.get("ticket_capacity") ?? 0) || 0);
    const start_at = combineLocalToIso(
      String(fd.get("start_date") ?? ""),
      String(fd.get("start_time") ?? ""),
    );
    const end_at = combineLocalToIso(
      String(fd.get("end_date") ?? ""),
      String(fd.get("end_time") ?? ""),
    );

    if (!locationId.trim()) {
      setMsg("Select a campus location on the official map.");
      return;
    }

    const payload = {
      title,
      description,
      start_at,
      end_at,
      venue,
      location_id: locationId.trim(),
      is_open_event: isOpenEvent,
      ticket_capacity,
      is_draft: isDraft,
    };

    const url = mode === "create" ? "/api/events" : `/api/events/${initial?.id ?? ""}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const res = await fetch(url, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await parseJson(res);
    if (!res.ok) {
      setMsg(String(body.error ?? res.statusText ?? res.status));
      return;
    }

    router.refresh();
    onSuccess?.();
  }

  return (
    <form onSubmit={(ev) => void onSubmit(ev)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="event-title">Title</Label>
          <Input id="event-title" name="title" defaultValue={initial?.title ?? ""} required />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="event-description">Description</Label>
          <Textarea
            id="event-description"
            name="description"
            defaultValue={initial?.description ?? ""}
            rows={4}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="start-date">Start date</Label>
          <Input id="start-date" name="start_date" type="date" defaultValue={startParts.date} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="start-time">Start time</Label>
          <Input id="start-time" name="start_time" type="time" defaultValue={startParts.time} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end-date">End date</Label>
          <Input id="end-date" name="end_date" type="date" defaultValue={endParts.date} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end-time">End time</Label>
          <Input id="end-time" name="end_time" type="time" defaultValue={endParts.time} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="venue">Venue</Label>
          <Input id="venue" name="venue" defaultValue={initial?.venue ?? ""} placeholder="e.g. Main Hall" />
        </div>
        <LocationPicker
          gridN={resolvedGrid}
          locationId={locationId}
          onLocationIdChange={(id) => setLocationId(id)}
        />
        <div className="space-y-2">
          <Label htmlFor="ticket-capacity">Ticket capacity (0 = open count)</Label>
          <Input
            id="ticket-capacity"
            name="ticket_capacity"
            type="number"
            min={0}
            defaultValue={initial?.ticket_capacity ?? 0}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white">Open event (free / upvotes)</p>
            <p className="text-xs text-muted-foreground">Off = closed registration with capacity</p>
          </div>
          <Switch
            checked={isOpenEvent}
            onCheckedChange={setIsOpenEvent}
            aria-label="Open event"
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white">Save as draft</p>
            <p className="text-xs text-muted-foreground">
              Drafts are hidden until you publish them
            </p>
          </div>
          <Switch checked={isDraft} onCheckedChange={setIsDraft} aria-label="Save as draft" />
        </div>
      </div>

      <Button type="submit" className="w-full border-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        {submitLabel ?? (mode === "create" ? "Create event" : "Save changes")}
      </Button>
      {msg ? <p className="text-sm text-destructive">{msg}</p> : null}
    </form>
  );
}
