"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EventForm } from "@/app/components/event-form";
import type { EventFormInitial } from "@/app/components/event-form";
import {
  ExportManifestButton,
  PublishEventButton,
  UnpublishEventButton,
} from "@/app/components/scaffold-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatEventDateTime } from "@/lib/event-display";
import type { MerchItem } from "@/lib/merch";
import { MerchManagerDialog } from "@/app/components/merch-manager-dialog";

export type OrganizerEventRowSerialized = {
  id: string;
  title: string;
  description: string;
  is_draft: boolean;
  is_open_event: boolean;
  start_at: string | null;
  end_at: string | null;
  venue: string | null;
  location_id: string;
  location_code: string | null;
  location_name: string | null;
  grid_row: number;
  grid_col: number;
  ticket_capacity: number;
  registrationCount: number;
  merchItems: MerchItem[];
  category_ids: string[];
};

async function parseJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
}

export function OrganizerEventsPanel({
  events,
  gridN,
}: {
  events: OrganizerEventRowSerialized[];
  gridN: number;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingRow = useMemo(
    () => (editingId ? events.find((x) => x.id === editingId) : undefined),
    [events, editingId],
  );

  const editingInitial: EventFormInitial | null = editingRow
    ? {
        id: editingRow.id,
        title: editingRow.title,
        description: editingRow.description,
        start_at: editingRow.start_at,
        end_at: editingRow.end_at,
        venue: editingRow.venue,
        location_id: editingRow.location_id,
        is_open_event: editingRow.is_open_event,
        ticket_capacity: editingRow.ticket_capacity,
        is_draft: editingRow.is_draft,
        category_ids: editingRow.category_ids,
      }
    : null;

  async function deleteEvent(id: string) {
    if (!window.confirm("Delete this event permanently?")) return;
    const res = await fetch(`/api/events/${id}`, { method: "DELETE", credentials: "include" });
    const body = await parseJson(res);
    if (!res.ok) {
      window.alert(String(body.error ?? res.status));
      return;
    }
    router.refresh();
  }

  return (
    <>
      <Dialog open={editingId != null} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Edit event</DialogTitle>
          </DialogHeader>
          {editingInitial ? (
            <EventForm
              key={editingInitial.id}
              gridN={gridN}
              mode="edit"
              initial={editingInitial}
              onSuccess={() => {
                setEditingId(null);
                router.refresh();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Manage your events — drafts stay private until published.
        </p>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              className="border-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white"
            >
              + New event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-card sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">Create event</DialogTitle>
            </DialogHeader>
            <EventForm
              gridN={gridN}
              mode="create"
              onSuccess={() => {
                setCreateOpen(false);
                router.refresh();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No events yet.</p>
      ) : (
        <ul className="space-y-4">
          {events.map((e) => {
            const { date, time } = formatEventDateTime(e.start_at);
            const cap =
              e.ticket_capacity > 0
                ? `${e.registrationCount}/${e.ticket_capacity}`
                : String(e.registrationCount);
            return (
              <li
                key={e.id}
                className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 md:flex-row md:items-start md:justify-between"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/events/${e.id}`}
                      className="font-medium text-white hover:text-purple-300"
                    >
                      {e.title || e.id}
                    </Link>
                    {e.is_draft ? (
                      <Badge variant="secondary" className="border-amber-500/40 text-amber-200">
                        Draft
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="border-emerald-500/40 text-emerald-200">
                        Published
                      </Badge>
                    )}
                    <Badge variant="outline" className="border-white/20 text-muted-foreground">
                      {e.is_open_event ? "Open / upvotes" : "Registration"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {date}
                    {time ? ` · ${time}` : ""}
                    {e.venue ? ` · ${e.venue}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Map pin:{" "}
                    {e.location_code
                      ? `${e.location_code}${e.location_name ? ` (${e.location_name})` : ""} · (${e.grid_row},${e.grid_col})`
                      : `${e.grid_row},${e.grid_col}`}
                  </p>
                  <p className="text-xs text-muted-foreground">Registrations: {cap}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" size="sm" asChild>
                    <Link href={`/events/${e.id}`}>View</Link>
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingId(e.id)}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => void deleteEvent(e.id)}
                  >
                    Delete
                  </Button>
                  {e.is_draft ? (
                    <PublishEventButton eventId={e.id} onSuccess={() => router.refresh()} />
                  ) : (
                    <UnpublishEventButton eventId={e.id} onSuccess={() => router.refresh()} />
                  )}
                  <ExportManifestButton eventId={e.id} />
                  <Button type="button" variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/organizer/events/${e.id}/sales`}>View sales</Link>
                  </Button>
                  <MerchManagerDialog
                    eventId={e.id}
                    eventTitle={e.title || e.id}
                    initialItems={e.merchItems}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
