"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Organizer = {
  id: string;
  full_name: string;
  club_name: string | null;
  created_at: string;
};

async function parseJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
}

export function AdminOrganizersPanel() {
  const [rows, setRows] = useState<Organizer[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setMsg(null);
    const res = await fetch("/api/admin/organizers/pending", { credentials: "include" });
    const body = await parseJson(res);
    if (!res.ok) {
      setMsg(String(body.error ?? res.status));
      return;
    }
    const organizers = body.organizers as Organizer[] | undefined;
    setRows(organizers ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function approve(id: string) {
    setMsg(null);
    const res = await fetch(`/api/admin/organizers/${id}/approve`, {
      method: "POST",
      credentials: "include",
    });
    const body = await parseJson(res);
    setMsg(res.ok ? `Approved ${id}` : String(body.error ?? res.status));
    await load();
  }

  async function reject(id: string) {
    setMsg(null);
    const res = await fetch(`/api/admin/organizers/${id}/reject`, {
      method: "POST",
      credentials: "include",
    });
    const body = await parseJson(res);
    setMsg(res.ok ? `Rejected ${id}` : String(body.error ?? res.status));
    await load();
  }

  return (
    <Card className="border-white/10 bg-card/50">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle className="text-white">Pending organizers</CardTitle>
          <Button type="button" variant="secondary" size="sm" onClick={load}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending requests.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Club</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="border-white/10">
                  <TableCell className="text-white">{r.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.club_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      size="sm"
                      className="mr-2 border-0 bg-emerald-600 text-white hover:bg-emerald-500"
                      onClick={() => void approve(r.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => void reject(r.id)}
                    >
                      Reject
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

export function GridConfigForm() {
  const router = useRouter();
  const [gridN, setGridN] = useState(10);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/config", { credentials: "include" });
    const body = await parseJson(res);
    if (res.ok && body.config && typeof body.config === "object") {
      const c = body.config as { grid_n?: number };
      if (typeof c.grid_n === "number") setGridN(c.grid_n);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grid_n: gridN }),
    });
    const body = await parseJson(res);
    if (!res.ok) {
      setMsg(String(body.error ?? res.status));
      return;
    }
    if (body.config && typeof body.config === "object") {
      const c = body.config as { grid_n?: number };
      if (typeof c.grid_n === "number") {
        setGridN(c.grid_n);
        setMsg(`Saved grid_n=${c.grid_n}`);
        router.refresh();
        return;
      }
    }
    setMsg("Save returned no grid_n; please reload.");
  }

  return (
    <Card className="border-white/10 bg-card/50">
      <CardHeader>
        <CardTitle className="text-white">Campus grid size</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={(ev) => void save(ev)} className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="grid_n">n (grid is n×n)</Label>
            <Input
              id="grid_n"
              type="number"
              min={1}
              max={99}
              value={gridN}
              onChange={(e) => setGridN(Number(e.target.value))}
              className="w-32"
            />
          </div>
          <Button type="submit" variant="secondary">
            Save
          </Button>
          {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}
