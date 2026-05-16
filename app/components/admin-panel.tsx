"use client";

import { useEffect, useState } from "react";

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
    <section>
      <h2>Pending organizers</h2>
      <button type="button" onClick={load}>
        Refresh
      </button>
      {msg ? <p>{msg}</p> : null}
      <ul>
        {rows.map((r) => (
          <li key={r.id}>
            {r.full_name} ({r.club_name ?? "club?"}){" "}
            <button type="button" onClick={() => approve(r.id)}>
              Approve
            </button>{" "}
            <button type="button" onClick={() => reject(r.id)}>
              Reject
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function GridConfigForm() {
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
    setMsg(res.ok ? `grid_n=${gridN}` : String(body.error ?? res.status));
  }

  return (
    <form onSubmit={save}>
      <h2>Grid size</h2>
      <label>
        n{" "}
        <input
          type="number"
          min={1}
          max={99}
          value={gridN}
          onChange={(e) => setGridN(Number(e.target.value))}
        />
      </label>
      <button type="submit">Save</button>
      {msg ? <p>{msg}</p> : null}
    </form>
  );
}
