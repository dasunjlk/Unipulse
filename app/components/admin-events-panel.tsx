"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatEventDateTime } from "@/lib/event-display";

export type AdminEventsRowSerialized = {
  id: string;
  title: string;
  organizerName: string;
  organizerClub: string | null;
  start_at: string | null;
  venue: string | null;
  is_draft: boolean;
  is_pinned: boolean;
  registration_count: number;
};

type SortKey = "title" | "organizerName" | "start_at" | "registration_count";
type Dir = "asc" | "desc";

type ModerationPatchBody = { is_draft?: boolean; is_pinned?: boolean };

async function parseJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
}

export function AdminEventsPanel({ rows }: { rows: AdminEventsRowSerialized[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("start_at");
  const [sortDir, setSortDir] = useState<Dir>("asc");

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let va: string | number = "";
      let vb: string | number = "";
      if (sortKey === "title") {
        va = (a.title || "").toLowerCase();
        vb = (b.title || "").toLowerCase();
      } else if (sortKey === "organizerName") {
        va = (a.organizerName || "").toLowerCase();
        vb = (b.organizerName || "").toLowerCase();
      } else if (sortKey === "registration_count") {
        va = a.registration_count;
        vb = b.registration_count;
      } else {
        va = a.start_at ? new Date(a.start_at).getTime() : Number.POSITIVE_INFINITY;
        vb = b.start_at ? new Date(b.start_at).getTime() : Number.POSITIVE_INFINITY;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  async function moderate(id: string, patch: ModerationPatchBody): Promise<boolean> {
    setMsg(null);
    const res = await fetch(`/api/admin/events/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const body = await parseJson(res);
    if (!res.ok) {
      setMsg(String(body.error ?? res.status));
      return false;
    }
    router.refresh();
    return true;
  }

  return (
    <Card className="border-white/10 bg-card/50">
      <CardHeader>
        <CardTitle className="text-white">Campus events (live)</CardTitle>
        <p className="text-xs text-muted-foreground">
          Hide removes from public feeds; Publish restores visibility. Feature boosts listing order.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {msg ? <p className="text-sm text-destructive">{msg}</p> : null}

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events in database yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead>
                  <SortHeader
                    sortKey={sortKey}
                    currentKey="title"
                    dir={sortDir}
                    onSort={toggleSort}
                    label="Title"
                  />
                </TableHead>
                <TableHead>
                  <SortHeader
                    sortKey={sortKey}
                    currentKey="organizerName"
                    dir={sortDir}
                    onSort={toggleSort}
                    label="Organizer"
                  />
                </TableHead>
                <TableHead className="hidden md:table-cell">Venue</TableHead>
                <TableHead>
                  <SortHeader
                    sortKey={sortKey}
                    currentKey="start_at"
                    dir={sortDir}
                    onSort={toggleSort}
                    label="Date"
                  />
                </TableHead>
                <TableHead className="text-center">
                  <SortHeader
                    sortKey={sortKey}
                    currentKey="registration_count"
                    dir={sortDir}
                    onSort={toggleSort}
                    label="Regs"
                  />
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.map((r) => (
                <TableRow key={r.id} className="border-white/10">
                  <TableCell>
                    <Link
                      href={`/events/${r.id}`}
                      className="font-medium text-white hover:text-purple-300"
                    >
                      {r.title || r.id.slice(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <span className="text-white">{r.organizerClub ?? r.organizerName}</span>
                    {r.organizerClub && r.organizerName ? (
                      <span className="mt-1 block text-xs opacity-70">{r.organizerName}</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="hidden max-w-[140px] truncate md:table-cell text-muted-foreground">
                    {r.venue ?? "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    <span className="text-sm">{formatRowDate(r.start_at)}</span>
                  </TableCell>
                  <TableCell className="text-center tabular-nums">{r.registration_count}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {r.is_draft ? (
                        <Badge variant="outline" className="border-amber-500/40 text-amber-200">
                          Hidden
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-emerald-500/40 text-emerald-200">
                          Published
                        </Badge>
                      )}
                      {r.is_pinned ? (
                        <Badge variant="outline" className="border-purple-500/40 text-purple-200">
                          Featured
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="space-y-1 text-right md:space-y-0 md:space-x-1">
                    {r.is_draft ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="mr-1"
                        onClick={() => void moderate(r.id, { is_draft: false })}
                      >
                        Publish
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mr-1 border-white/20"
                        onClick={() => void moderate(r.id, { is_draft: true })}
                      >
                        Hide
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-purple-400/40 text-purple-200"
                      onClick={() =>
                        void moderate(r.id, { is_pinned: !r.is_pinned })
                      }
                    >
                      {r.is_pinned ? "Unfeature" : "Feature"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function formatRowDate(iso: string | null): string {
  const { date, time } = formatEventDateTime(iso);
  return `${date}${time ? ` · ${time}` : ""}`;
}

function SortHeader({
  label,
  sortKey,
  currentKey,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  dir: Dir;
  onSort: (k: SortKey) => void;
}) {
  const active = sortKey === currentKey;
  return (
    <button
      type="button"
      onClick={() => onSort(currentKey)}
      className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-white"
    >
      {label}
      {active ? (
        dir === "asc" ? (
          <ArrowUp className="h-3 w-3 shrink-0" aria-hidden />
        ) : (
          <ArrowDown className="h-3 w-3 shrink-0" aria-hidden />
        )
      ) : null}
    </button>
  );
}
