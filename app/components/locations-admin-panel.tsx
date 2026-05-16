"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CampusMapLocation } from "@/components/campus-map";
import { CampusMap } from "@/components/campus-map";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
}

export function LocationsAdminPanel({
  gridN,
}: {
  gridN: number;
}) {
  const router = useRouter();
  const [locations, setLocations] = useState<CampusMapLocation[]>([]);
  const [eventCountsByLoc, setEventCountsByLoc] = useState<Record<string, number>>({});
  const [mapBgUrl, setMapBgUrl] = useState<string | null>(null);
  const [liveGridN, setLiveGridN] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setLiveGridN(null);
  }, [gridN]);

  const effectiveGridN = liveGridN ?? gridN;

  async function reload() {
    setMsg(null);
    const locRes = await fetch("/api/locations");
    const locBody = await parseJson(locRes);
    const evRes = await fetch("/api/events");
    const evBody = await parseJson(evRes);
    const cfgRes = await fetch("/api/admin/config", { credentials: "include" });
    const cfgBody = await parseJson(cfgRes);

    if (locRes.ok && Array.isArray(locBody.locations)) {
      setLocations(locBody.locations as CampusMapLocation[]);
    } else if (!locRes.ok) {
      setMsg(String(locBody.error ?? locRes.status));
    }

    if (evRes.ok && Array.isArray(evBody.events)) {
      const cnt: Record<string, number> = {};
      type EvLite = { location_id?: string };
      for (const e of evBody.events as EvLite[]) {
        const lid = e.location_id;
        if (!lid) continue;
        cnt[lid] = (cnt[lid] ?? 0) + 1;
      }
      setEventCountsByLoc(cnt);
    }

    if (cfgRes.ok && cfgBody.config && typeof cfgBody.config === "object") {
      const c = cfgBody.config as { map_background_url?: string | null; grid_n?: number };
      setMapBgUrl(c.map_background_url ?? null);
      if (typeof c.grid_n === "number") setLiveGridN(c.grid_n);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once mount
  }, []);

  const occupiedCells = useMemo(() => new Set(locations.map((l) => `${l.grid_row}-${l.grid_col}`)), [locations]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <MapBackgroundCard mapBgUrl={mapBgUrl} onChanged={() => void reload()} onMsg={setMsg} />
        <GridEditorCard
          gridN={effectiveGridN}
          locations={locations}
          mapBgUrl={mapBgUrl}
          occupiedCells={occupiedCells}
          onSaved={() => void reload()}
          onMsg={setMsg}
        />
      </div>

      <LocationsTable
        rows={locations}
        eventCountsByLoc={eventCountsByLoc}
        gridN={effectiveGridN}
        onChanged={() => {
          router.refresh();
          void reload();
        }}
        onMsg={setMsg}
      />

      <ManualLocationCard
        gridN={effectiveGridN}
        occupiedCells={occupiedCells}
        onSaved={() => {
          router.refresh();
          void reload();
        }}
        onMsg={setMsg}
      />

      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}

      <Card className="border-white/10 bg-card/50">
        <CardHeader>
          <CardTitle className="text-white">Campus preview</CardTitle>
          <CardDescription>
            Mirrors the student home grid using live locations ({effectiveGridN}×{effectiveGridN}).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CampusMap
            hideHeading
            gridN={effectiveGridN}
            locations={locations}
            events={[]}
            mapBackgroundUrl={mapBgUrl}
          />
          <Button type="button" variant="outline" size="sm" className="mt-4 border-white/15" asChild>
            <Link href="/map">Student grid page</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function MapBackgroundCard({
  mapBgUrl,
  onChanged,
  onMsg,
}: {
  mapBgUrl: string | null;
  onChanged: () => void;
  onMsg: (s: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    onMsg(null);
    const fd = new FormData();
    fd.set("file", f);
    const res = await fetch("/api/admin/map/background", {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    const body = await parseJson(res);
    setBusy(false);
    e.target.value = "";
    onMsg(res.ok ? "Background uploaded." : String(body.error ?? res.status));
    onChanged();
  }

  async function clearBg() {
    setBusy(true);
    onMsg(null);
    const res = await fetch("/api/admin/map/background", {
      method: "DELETE",
      credentials: "include",
    });
    const body = await parseJson(res);
    setBusy(false);
    onMsg(res.ok ? "Background cleared." : String(body.error ?? res.status));
    onChanged();
  }

  return (
    <Card className="border-white/10 bg-card/50">
      <CardHeader>
        <CardTitle className="text-white">Campus map backdrop</CardTitle>
        <CardDescription>PNG / JPEG / WebP / GIF, max ~8 MB. Stored in Supabase bucket.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {mapBgUrl ? (
          <div className="overflow-hidden rounded-lg border border-white/10 bg-black/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mapBgUrl} alt="" className="aspect-video w-full object-cover opacity-85" />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Using abstract gradient only.</p>
        )}
        <div className="flex flex-wrap gap-3">
          <label className="inline-flex cursor-pointer">
            <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={(ev) => void onFile(ev)} />
            <span className="inline-flex rounded-md border border-white/15 bg-secondary px-3 py-1.5 text-sm text-white hover:bg-secondary/80">
              {busy ? "Working…" : "Upload background"}
            </span>
          </label>
          {mapBgUrl ? (
            <Button type="button" variant="ghost" disabled={busy} onClick={() => void clearBg()}>
              Remove
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ManualLocationCard({
  gridN,
  occupiedCells,
  onSaved,
  onMsg,
}: {
  gridN: number;
  occupiedCells: Set<string>;
  onSaved: () => void;
  onMsg: (s: string | null) => void;
}) {
  return (
    <Card className="border-white/10 bg-card/50">
      <CardHeader>
        <CardTitle className="text-white">Manual coordinates</CardTitle>
        <CardDescription>Name, code, and row/column (0-{gridN - 1} each).</CardDescription>
      </CardHeader>
      <CardContent>
        <CreateLocationInline gridN={gridN} occupiedCells={occupiedCells} onMsg={onMsg} onSaved={onSaved} />
      </CardContent>
    </Card>
  );
}

function GridEditorCard({
  gridN,
  locations,
  mapBgUrl,
  occupiedCells,
  onSaved,
  onMsg,
}: {
  gridN: number;
  locations: CampusMapLocation[];
  mapBgUrl: string | null;
  occupiedCells: Set<string>;
  onSaved: () => void;
  onMsg: (s: string | null) => void;
}) {
  const [picked, setPicked] = useState<{ row: number; col: number } | null>(null);

  return (
    <Card className="border-white/10 bg-card/50">
      <CardHeader>
        <CardTitle className="text-white">Add via grid</CardTitle>
        <CardDescription>Tap an empty cell, enter name & code below, then save.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Existing locations are tinted; dashed cells can become new pins.
        </p>
        <CampusMap
          hideHeading
          mode="pick-empty"
          gridN={gridN}
          locations={locations}
          events={[]}
          mapBackgroundUrl={mapBgUrl}
          selectedCoord={picked}
          onPickEmpty={(row, col) =>
            setPicked((prev) => (prev?.row === row && prev?.col === col ? null : { row, col }))
          }
        />
        {!picked ? (
          <p className="text-xs text-muted-foreground">
            Tap a dashed empty cell above, then confirm with name & code below.
          </p>
        ) : (
          <CreateLocationInline
            gridN={gridN}
            presetRow={picked.row}
            presetCol={picked.col}
            occupiedCells={occupiedCells}
            onMsg={onMsg}
            onSaved={() => {
              setPicked(null);
              onSaved();
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}

function CreateLocationInline(props: {
  gridN: number;
  presetRow?: number | null;
  presetCol?: number | null;
  occupiedCells?: Set<string>;
  onSaved: () => void;
  onMsg: (s: string | null) => void;
}) {
  const { gridN, presetRow = null, presetCol = null, occupiedCells = new Set(), onSaved, onMsg } =
    props;
  const nameId = useMemo(() => Math.random().toString(36).slice(2), []);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [row, setRow] = useState(presetRow != null ? String(presetRow) : "");
  const [col, setCol] = useState(presetCol != null ? String(presetCol) : "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (presetRow != null && presetCol != null) {
      setRow(String(presetRow));
      setCol(String(presetCol));
    }
  }, [presetRow, presetCol]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = Math.max(0, Number(row) || 0);
    const c = Math.max(0, Number(col) || 0);
    if (occupiedCells.has(`${r}-${c}`)) {
      onMsg("That cell already has a location.");
      return;
    }
    if (r >= gridN || c >= gridN) {
      onMsg(`Row and column must be within the ${gridN}×${gridN} campus grid.`);
      return;
    }

    setBusy(true);
    onMsg(null);
    const res = await fetch("/api/admin/locations", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        code: code.trim(),
        grid_row: r,
        grid_col: c,
      }),
    });
    const body = await parseJson(res);
    setBusy(false);

    if (!res.ok) {
      onMsg(String(body.error ?? res.status));
      return;
    }

    setName("");
    setCode("");
    setRow("");
    setCol("");
    onMsg("Location created.");
    onSaved();
  }

  const hasPresetCoords = presetRow != null && presetCol != null;

  return (
    <form onSubmit={(ev) => void save(ev)} className="space-y-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
      {hasPresetCoords ? (
        <p className="text-xs text-purple-300">
          New location at cell [{presetRow},{presetCol}]
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Rows and columns are zero-indexed from the northwest corner ({gridN}×{gridN} field).
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`name-${nameId}`}>Place name</Label>
          <Input
            id={`name-${nameId}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Central Library"
            className="border-white/10"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`code-${nameId}`}>Code</Label>
          <Input
            id={`code-${nameId}`}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
            placeholder="LB"
            className="border-white/10"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`row-${nameId}`}>Row (0-{gridN - 1})</Label>
          <Input
            id={`row-${nameId}`}
            type="number"
            min={0}
            max={gridN - 1}
            value={row}
            onChange={(e) => setRow(e.target.value)}
            required
            className="border-white/10"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`col-${nameId}`}>Column (0-{gridN - 1})</Label>
          <Input
            id={`col-${nameId}`}
            type="number"
            min={0}
            max={gridN - 1}
            value={col}
            onChange={(e) => setCol(e.target.value)}
            required
            className="border-white/10"
          />
        </div>
      </div>
      <Button type="submit" size="sm" disabled={busy} variant="secondary">
        {busy ? "Saving…" : "Save location"}
      </Button>
    </form>
  );
}

function LocationsTable({
  rows,
  gridN,
  eventCountsByLoc,
  onChanged,
  onMsg,
}: {
  rows: CampusMapLocation[];
  gridN: number;
  eventCountsByLoc: Record<string, number>;
  onChanged: () => void;
  onMsg: (s: string | null) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const editRow = editingId ? rows.find((r) => r.id === editingId) : undefined;

  return (
    <>
      <Dialog open={editingId != null} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent className="border-white/10 bg-card">
          <DialogHeader>
            <DialogTitle className="text-white">Edit location</DialogTitle>
          </DialogHeader>
          {editRow ? (
            <EditLocationForm
              key={editRow.id}
              loc={editRow}
              gridN={gridN}
              onSaved={() => {
                setEditingId(null);
                onChanged();
              }}
              onMsg={onMsg}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Card className="border-white/10 bg-card/50">
        <CardHeader>
          <CardTitle className="text-white">Locations</CardTitle>
          <CardDescription>Official map cells organizers can attach events to.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No locations yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Cell</TableHead>
                  <TableHead className="text-right">Events</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...rows]
                  .sort(
                    (a, b) => a.grid_row - b.grid_row || a.grid_col - b.grid_col || a.code.localeCompare(b.code),
                  )
                  .map((loc) => {
                    const n = eventCountsByLoc[loc.id] ?? 0;
                    return (
                      <TableRow key={loc.id} className="border-white/10">
                        <TableCell className="font-mono text-purple-200">{loc.code}</TableCell>
                        <TableCell className="text-white">{loc.name}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          [{loc.grid_row},{loc.grid_col}]
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{n}</TableCell>
                        <TableCell className="space-x-1 text-right">
                          <Button type="button" size="sm" variant="outline" onClick={() => setEditingId(loc.id)}>
                            Edit
                          </Button>
                          <DeleteLocationTrigger
                            loc={loc}
                            eventCount={n}
                            allLocations={rows}
                            onDeleted={onChanged}
                            onMsg={onMsg}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function EditLocationForm({
  loc,
  gridN,
  onSaved,
  onMsg,
}: {
  loc: CampusMapLocation;
  gridN: number;
  onSaved: () => void;
  onMsg: (s: string | null) => void;
}) {
  const [name, setName] = useState(loc.name);
  const [code, setCode] = useState(loc.code);
  const [gridRow, setGridRow] = useState(loc.grid_row);
  const [gridCol, setGridCol] = useState(loc.grid_col);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (gridRow < 0 || gridCol < 0 || gridRow >= gridN || gridCol >= gridN) {
      onMsg(`Row and column must be 0-${gridN - 1}`);
      return;
    }
    setBusy(true);
    onMsg(null);
    const res = await fetch(`/api/admin/locations/${loc.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        code: code.trim(),
        grid_row: gridRow,
        grid_col: gridCol,
      }),
    });
    const body = await parseJson(res);
    setBusy(false);

    if (!res.ok) {
      onMsg(String(body.error ?? res.status));
      return;
    }

    onMsg(null);
    onSaved();
  }

  return (
    <form onSubmit={(ev) => void submit(ev)} className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`edit-name-${loc.id}`}>Place name</Label>
          <Input
            id={`edit-name-${loc.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="border-white/10"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`edit-code-${loc.id}`}>Code</Label>
          <Input
            id={`edit-code-${loc.id}`}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
            className="border-white/10"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`edit-row-${loc.id}`}>Row</Label>
          <Input
            id={`edit-row-${loc.id}`}
            type="number"
            min={0}
            max={gridN - 1}
            value={gridRow}
            onChange={(e) => setGridRow(Number(e.target.value))}
            required
            className="border-white/10"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`edit-col-${loc.id}`}>Column</Label>
          <Input
            id={`edit-col-${loc.id}`}
            type="number"
            min={0}
            max={gridN - 1}
            value={gridCol}
            onChange={(e) => setGridCol(Number(e.target.value))}
            required
            className="border-white/10"
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={busy} variant="secondary">
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}

function DeleteLocationTrigger({
  loc,
  eventCount,
  allLocations,
  onDeleted,
  onMsg,
}: {
  loc: CampusMapLocation;
  eventCount: number;
  allLocations: CampusMapLocation[];
  onDeleted: () => void;
  onMsg: (s: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const alternatives = useMemo(() => allLocations.filter((x) => x.id !== loc.id), [allLocations, loc.id]);
  const [reassign, setReassign] = useState<string>(alternatives[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (alternatives[0]?.id && !alternatives.some((x) => x.id === reassign)) {
      setReassign(alternatives[0].id);
    }
  }, [alternatives, reassign]);

  async function execDelete() {
    setBusy(true);
    onMsg(null);
    const qs =
      eventCount > 0 && reassign.length > 0 ? `?reassignTo=${encodeURIComponent(reassign)}` : "";
    const res = await fetch(`/api/admin/locations/${loc.id}${qs}`, {
      method: "DELETE",
      credentials: "include",
    });
    const body = await parseJson(res);
    setBusy(false);

    if (!res.ok) {
      onMsg(String(body.error ?? res.status));
      return;
    }

    setOpen(false);
    onDeleted();
    onMsg("Location removed.");
  }

  return (
    <>
      <Button type="button" size="sm" variant="destructive" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent className="border-white/10 bg-card">
          <DialogHeader>
            <DialogTitle className="text-white">Delete location {loc.code}?</DialogTitle>
          </DialogHeader>
          {eventCount > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                {eventCount} event(s) pin here — pick where they move before removal.
              </p>
              {alternatives.length === 0 ? (
                <p className="text-sm text-destructive">Create another location first.</p>
              ) : (
                <div className="space-y-2">
                  <Label>Move events to</Label>
                  <Select value={reassign} onValueChange={setReassign}>
                    <SelectTrigger className="border-white/10">
                      <SelectValue placeholder="Replacement" />
                    </SelectTrigger>
                    <SelectContent>
                      {alternatives.map((alt) => (
                        <SelectItem key={alt.id} value={alt.id}>
                          {alt.code} — {alt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No events use this pin — safe to remove.</p>
          )}
          <DialogFooter className="gap-2 pt-4">
            <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={
                busy ||
                (eventCount > 0 && (alternatives.length === 0 || reassign.trim().length === 0))
              }
              onClick={() => void execDelete()}
            >
              {busy ? "…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
