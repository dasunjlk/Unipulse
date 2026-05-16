"use client";

import { useCallback, useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

type Student = {
  id: string;
  full_name: string;
  email: string | null;
  last_sign_in_at: string | null;
  banned_until: string | null;
  status: "active" | "suspended";
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

function initialsFromName(name: string, email: string | null): string {
  const trimmed = name.trim();
  if (trimmed.length >= 2) {
    return trimmed.slice(0, 2).toUpperCase();
  }
  if (email && email.includes("@")) {
    return email.split("@")[0]!.slice(0, 2).toUpperCase();
  }
  return "—";
}

function relativeActivity(iso: string | null): string {
  if (!iso) {
    return "Never signed in";
  }
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) {
    return "—";
  }
  const sec = Math.floor((Date.now() - t) / 1000);
  if (sec < 60) {
    return "Online now";
  }
  const min = Math.floor(sec / 60);
  if (min < 60) {
    return `Last active ${min}m ago`;
  }
  const h = Math.floor(min / 60);
  if (h < 24) {
    return `Last active ${h}h ago`;
  }
  const d = Math.floor(h / 24);
  if (d < 30) {
    return `Last active ${d}d ago`;
  }
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

export function AdminUsersPanel() {
  const [rows, setRows] = useState<Student[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setMsg(null);
    const res = await fetch("/api/admin/users/students", { credentials: "include" });
    const body = await parseJson(res);
    if (!res.ok) {
      setMsg(String(body.error ?? res.status));
      return;
    }
    const students = body.students as Student[] | undefined;
    setRows(students ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function ban(id: string) {
    setMsg(null);
    const res = await fetch(`/api/admin/users/${id}/ban`, {
      method: "POST",
      credentials: "include",
    });
    const body = await parseJson(res);
    setMsg(res.ok ? "User banned." : String(body.error ?? res.status));
    await load();
  }

  async function unban(id: string) {
    setMsg(null);
    const res = await fetch(`/api/admin/users/${id}/unban`, {
      method: "POST",
      credentials: "include",
    });
    const body = await parseJson(res);
    setMsg(res.ok ? "User unbanned." : String(body.error ?? res.status));
    await load();
  }

  return (
    <Card className="border-white/10 bg-card/50">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle className="text-white">Users</CardTitle>
          <Button type="button" variant="secondary" size="sm" onClick={() => void load()}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-0">
        {msg ? <p className="px-6 text-sm text-muted-foreground">{msg}</p> : null}
        {rows.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">No students yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="w-14" />
                  <TableHead>User</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((u) => (
                  <TableRow key={u.id} className="border-white/10">
                    <TableCell>
                      <Avatar className="h-8 w-8 border border-white/10">
                        <AvatarFallback className="bg-white/10 text-[10px] text-white">
                          {initialsFromName(u.full_name, u.email)}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium text-white">{u.full_name || "—"}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {u.email ?? "—"}
                    </TableCell>
                    <TableCell className="capitalize text-muted-foreground">student</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          u.status === "active"
                            ? "border-emerald-500/40 text-emerald-200"
                            : "border-red-500/40 text-red-200"
                        }
                      >
                        {u.status === "active" ? "active" : "suspended"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {relativeActivity(u.last_sign_in_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      {u.status === "active" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => void ban(u.id)}
                        >
                          Ban
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          className="border-0 bg-emerald-600 text-white hover:bg-emerald-500"
                          onClick={() => void unban(u.id)}
                        >
                          Unban
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
