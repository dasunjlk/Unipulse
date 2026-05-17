"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CATEGORY_GRADIENT_PRESETS, flattenLinkedCategories } from "@/lib/event-categories";

type CategoryRow = {
  id: string;
  slug: string;
  label: string;
  gradient: string;
  sort_order: number;
};

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
}

export function CategoriesAdminPanel() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [eventCountByCategoryId, setEventCountByCategoryId] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<CategoryRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<CategoryRow | null>(null);
  const [reassignToId, setReassignToId] = useState<string>("");

  const reload = useCallback(async () => {
    setMsg(null);
    const [catRes, evRes] = await Promise.all([
      fetch("/api/event-categories"),
      fetch("/api/events"),
    ]);
    const catBody = await parseJson(catRes);
    const evBody = await parseJson(evRes);

    if (catRes.ok && Array.isArray(catBody.categories)) {
      setCategories(catBody.categories as CategoryRow[]);
    } else {
      setMsg(String(catBody.error ?? catRes.status));
    }

    const counts: Record<string, number> = {};
    if (evRes.ok && Array.isArray(evBody.events)) {
      for (const raw of evBody.events as Record<string, unknown>[]) {
        const cats = flattenLinkedCategories(
          raw as Parameters<typeof flattenLinkedCategories>[0],
        );
        for (const c of cats) {
          counts[c.id] = (counts[c.id] ?? 0) + 1;
        }
      }
    }
    setEventCountByCategoryId(counts);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const othersForReassign =
    deleteRow != null ? categories.filter((c) => c.id !== deleteRow.id) : [];

  return (
    <Card className="border-white/10 bg-card/50">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0">
        <CardTitle className="text-white">Event categories</CardTitle>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => void reload()}>
            Refresh
          </Button>
          <Button
            type="button"
            size="sm"
            className="border-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white"
            onClick={() => setAddOpen(true)}
          >
            Add category
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No categories loaded.</p>
        ) : (
          <div className="max-h-[420px] overflow-auto rounded-md border border-white/10">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead>Label</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Gradient</TableHead>
                  <TableHead className="text-right">Events</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((c) => {
                  const cnt = eventCountByCategoryId[c.id] ?? 0;
                  return (
                    <TableRow key={c.id} className="border-white/10">
                      <TableCell className="font-medium text-white">{c.label}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{c.slug}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-block h-6 min-w-[72px] rounded-md bg-gradient-to-br ${c.gradient}`}
                          title={c.gradient}
                        />
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{cnt}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mr-2"
                          onClick={() => setEditRow(c)}
                        >
                          Edit
                        </Button>
                        <Button type="button" variant="destructive" size="sm" onClick={() => setDeleteRow(c)}>
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AddCategoryDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onDone={() => {
          setAddOpen(false);
          void reload();
          router.refresh();
        }}
      />
      <EditCategoryDialog
        row={editRow}
        onOpenChange={(v) => !v && setEditRow(null)}
        onDone={() => {
          setEditRow(null);
          void reload();
          router.refresh();
        }}
      />
      <DeleteCategoryDialog
        row={deleteRow}
        reassignOptions={othersForReassign}
        reassignToId={reassignToId}
        setReassignToId={setReassignToId}
        eventCount={deleteRow ? (eventCountByCategoryId[deleteRow.id] ?? 0) : 0}
        onOpenChange={(v) => {
          if (!v) {
            setDeleteRow(null);
            setReassignToId("");
          }
        }}
        onDone={() => {
          setDeleteRow(null);
          setReassignToId("");
          void reload();
          router.refresh();
        }}
      />
    </Card>
  );
}

function AddCategoryDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [slug, setSlug] = useState("");
  const [label, setLabel] = useState("");
  const [gradient, setGradient] = useState<string>(CATEGORY_GRADIENT_PRESETS[0].value);
  const [sortOrder, setSortOrder] = useState("0");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/event-categories", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slug.trim().toLowerCase(),
          label: label.trim(),
          gradient,
          sort_order: Number(sortOrder) || 0,
        }),
      });
      const body = await parseJson(res);
      if (!res.ok) {
        setErr(String(body.error ?? res.status));
        return;
      }
      setSlug("");
      setLabel("");
      setSortOrder("0");
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Add category</DialogTitle>
        </DialogHeader>
        <form onSubmit={(ev) => void submit(ev)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-cat-slug">Slug (lowercase)</Label>
            <Input
              id="new-cat-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. arts"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-cat-label">Label</Label>
            <Input
              id="new-cat-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Display name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Gradient</Label>
            <Select value={gradient} onValueChange={setGradient}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_GRADIENT_PRESETS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-cat-sort">Sort order</Label>
            <Input
              id="new-cat-sort"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </div>
          {err ? <p className="text-sm text-destructive">{err}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={busy}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditCategoryDialog({
  row,
  onOpenChange,
  onDone,
}: {
  row: CategoryRow | null;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [slug, setSlug] = useState("");
  const [label, setLabel] = useState("");
  const [gradient, setGradient] = useState<string>(CATEGORY_GRADIENT_PRESETS[0].value);
  const [sortOrder, setSortOrder] = useState("0");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (row) {
      setSlug(row.slug);
      setLabel(row.label);
      setGradient(row.gradient);
      setSortOrder(String(row.sort_order));
    }
  }, [row]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!row) return;
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/event-categories/${row.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slug.trim().toLowerCase(),
          label: label.trim(),
          gradient,
          sort_order: Number(sortOrder) || 0,
        }),
      });
      const body = await parseJson(res);
      if (!res.ok) {
        setErr(String(body.error ?? res.status));
        return;
      }
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={row != null} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Edit category</DialogTitle>
        </DialogHeader>
        {row ? (
          <form onSubmit={(ev) => void submit(ev)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-cat-slug">Slug</Label>
              <Input
                id="edit-cat-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cat-label">Label</Label>
              <Input
                id="edit-cat-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Gradient</Label>
              <Select value={gradient} onValueChange={setGradient}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_GRADIENT_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cat-sort">Sort order</Label>
              <Input
                id="edit-cat-sort"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </div>
            {err ? <p className="text-sm text-destructive">{err}</p> : null}
            <DialogFooter>
              <Button type="submit" disabled={busy}>
                Save
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DeleteCategoryDialog({
  row,
  reassignOptions,
  reassignToId,
  setReassignToId,
  eventCount,
  onOpenChange,
  onDone,
}: {
  row: CategoryRow | null;
  reassignOptions: CategoryRow[];
  reassignToId: string;
  setReassignToId: (v: string) => void;
  eventCount: number;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirmDelete() {
    if (!row) return;
    setErr(null);
    if (eventCount > 0 && !reassignToId) {
      setErr("Choose a category to reassign events to.");
      return;
    }
    setBusy(true);
    try {
      const q =
        eventCount > 0 && reassignToId
          ? `?reassignTo=${encodeURIComponent(reassignToId)}`
          : "";
      const res = await fetch(`/api/admin/event-categories/${row.id}${q}`, {
        method: "DELETE",
        credentials: "include",
      });
      const body = await parseJson(res);
      if (!res.ok) {
        setErr(String(body.error ?? res.status));
        return;
      }
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={row != null} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Delete category</DialogTitle>
        </DialogHeader>
        {row ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Delete <span className="font-medium text-white">{row.label}</span>?{" "}
              {eventCount > 0 ? (
                <>
                  This category is used by {eventCount} event(s). Pick another category to reassign
                  them.
                </>
              ) : (
                "No events use this category."
              )}
            </p>
            {eventCount > 0 ? (
              <div className="space-y-2">
                <Label>Reassign events to</Label>
                <Select value={reassignToId || undefined} onValueChange={setReassignToId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category…" />
                  </SelectTrigger>
                  <SelectContent>
                    {reassignOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {reassignOptions.length === 0 ? (
                  <p className="text-xs text-amber-200">
                    Add another category before deleting this one.
                  </p>
                ) : null}
              </div>
            ) : null}
            {err ? <p className="text-sm text-destructive">{err}</p> : null}
            <DialogFooter>
              <Button
                type="button"
                variant="destructive"
                disabled={
                  busy ||
                  (eventCount > 0 && (!reassignToId || reassignOptions.length === 0))
                }
                onClick={() => void confirmDelete()}
              >
                Delete
              </Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
