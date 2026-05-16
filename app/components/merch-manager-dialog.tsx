"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MerchItem, MerchItemInput, MerchItemType } from "@/lib/merch";
import {
  isWearable,
  merchItemInputSchema,
  MERCH_ITEM_TYPES,
  MERCH_SIZES,
  merchTypeLabel,
} from "@/lib/merch";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

type Draft = MerchItemInput & { editingId: string | null };

/** Light field surface so typed text is never white-on-white inside the dialog. */
const merchFormFieldClass =
  "border-zinc-400/50 bg-white text-zinc-950 caret-zinc-950 placeholder:text-zinc-500 shadow-sm dark:border-zinc-500/40 dark:bg-zinc-100 dark:text-zinc-950 dark:caret-zinc-950 dark:placeholder:text-zinc-600";

async function parseJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
}

function emptyDraft(): Draft {
  return {
    name: "",
    price: 0,
    item_type: "other",
    sizes: [],
    image_url: null,
    editingId: null,
  };
}

export function MerchManagerDialog({
  eventId,
  eventTitle,
  initialItems,
}: {
  eventId: string;
  eventTitle: string;
  initialItems: MerchItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function startAdd() {
    setDraft(emptyDraft());
    setShowForm(true);
    setMsg(null);
  }

  function startEdit(item: MerchItem) {
    setDraft({
      name: item.name,
      price: item.price,
      item_type: item.item_type,
      sizes: isWearable(item.item_type) ? [...item.sizes] : [],
      image_url: item.image_url,
      editingId: item.id,
    });
    setShowForm(true);
    setMsg(null);
  }

  function cancelForm() {
    setShowForm(false);
    setDraft(emptyDraft());
    setMsg(null);
  }

  async function onImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch(`/api/events/${eventId}/merch/upload`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const body = await parseJson(res);
      if (!res.ok) {
        setMsg(String(body.error ?? res.status));
        return;
      }
      const url = body.image_url;
      if (typeof url !== "string") {
        setMsg("Upload failed");
        return;
      }
      setDraft((d) => ({ ...d, image_url: url }));
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function saveItem() {
    setMsg(null);
    const input: MerchItemInput = {
      name: draft.name,
      price: draft.price,
      item_type: draft.item_type,
      sizes: isWearable(draft.item_type) ? draft.sizes : [],
      image_url: draft.image_url ?? null,
    };
    if (isWearable(input.item_type) && input.sizes.length === 0) {
      setMsg("Select at least one size for this item type.");
      return;
    }
    const parsed = merchItemInputSchema.safeParse(input);
    if (!parsed.success) {
      setMsg(parsed.error.issues.map((i) => i.message).join("; ") || "Invalid form");
      return;
    }

    setBusy(true);
    try {
      if (draft.editingId) {
        const res = await fetch(`/api/events/${eventId}/merch/${draft.editingId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });
        const body = await parseJson(res);
        if (!res.ok) {
          setMsg(String(body.error ?? res.status));
          return;
        }
      } else {
        const res = await fetch(`/api/events/${eventId}/merch`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });
        const body = await parseJson(res);
        if (!res.ok) {
          setMsg(String(body.error ?? res.status));
          return;
        }
      }
      cancelForm();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(itemId: string) {
    if (!window.confirm("Remove this merch item?")) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/events/${eventId}/merch/${itemId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const body = await parseJson(res);
      if (!res.ok) {
        setMsg(String(body.error ?? res.status));
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          cancelForm();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Manage merch
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">Merch — {eventTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {msg ? <p className="text-sm font-medium text-rose-300">{msg}</p> : null}

          <ul className="space-y-3">
            {initialItems.length === 0 ? (
              <li className="text-sm text-muted-foreground">No merch items yet.</li>
            ) : (
              initialItems.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
                >
                  <div className="flex min-w-0 flex-1 gap-3">
                    {item.image_url ? (
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-white/10 bg-muted">
                        <Image
                          src={item.image_url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-dashed border-white/20 bg-muted/30 text-[10px] text-muted-foreground">
                        No img
                      </div>
                    )}
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {merchTypeLabel(item.item_type)} · ${item.price.toFixed(2)}
                        {item.sizes.length > 0 ? ` · Sizes: ${item.sizes.join(", ")}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() => startEdit(item)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={busy}
                      onClick={() => void removeItem(item.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))
            )}
          </ul>

          {!showForm ? (
            <Button
              type="button"
              className="w-full border-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white"
              onClick={startAdd}
            >
              + Add item
            </Button>
          ) : (
            <div className="space-y-4 rounded-lg border border-white/10 bg-card/60 p-4">
              <p className="text-sm font-medium text-foreground">
                {draft.editingId ? "Edit item" : "New item"}
              </p>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Photo (optional)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  disabled={busy}
                  onChange={(e) => void onImageFile(e)}
                  className={cn(merchFormFieldClass, "file:font-medium file:text-zinc-800")}
                />
                {draft.image_url ? (
                  <div className="flex items-start gap-3">
                    <div className="relative h-20 w-20 overflow-hidden rounded-md border border-white/10">
                      <Image
                        src={draft.image_url}
                        alt="Preview"
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => setDraft((d) => ({ ...d, image_url: null }))}
                    >
                      Remove image
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor={`merch-name-${eventId}`} className="text-muted-foreground">
                  Name
                </Label>
                <Input
                  id={`merch-name-${eventId}`}
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  className={merchFormFieldClass}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`merch-price-${eventId}`} className="text-muted-foreground">
                  Price (USD)
                </Label>
                <Input
                  id={`merch-price-${eventId}`}
                  type="number"
                  min={0}
                  step="0.01"
                  value={Number.isNaN(draft.price) ? "" : draft.price}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      price: e.target.value === "" ? 0 : Number(e.target.value),
                    }))
                  }
                  className={merchFormFieldClass}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Item type</Label>
                <Select
                  value={draft.item_type}
                  onValueChange={(v) =>
                    setDraft((d) => {
                      const item_type = v as MerchItemType;
                      return {
                        ...d,
                        item_type,
                        sizes: isWearable(item_type) ? d.sizes : [],
                      };
                    })
                  }
                >
                  <SelectTrigger className={cn("w-full", merchFormFieldClass)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-zinc-300 bg-white text-zinc-950 dark:border-zinc-600 dark:bg-zinc-100 dark:text-zinc-950">
                    {MERCH_ITEM_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {merchTypeLabel(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isWearable(draft.item_type) ? (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Available sizes</Label>
                  <ToggleGroup
                    type="multiple"
                    variant="outline"
                    value={draft.sizes}
                    onValueChange={(v) =>
                      setDraft((d) => ({ ...d, sizes: v as MerchItem["sizes"] }))
                    }
                    className="flex flex-wrap justify-start gap-1"
                  >
                    {MERCH_SIZES.map((sz) => (
                      <ToggleGroupItem
                        key={sz}
                        value={sz}
                        aria-label={sz}
                        className="h-9 px-3 data-[state=on]:bg-purple-600/30 data-[state=on]:text-foreground"
                      >
                        {sz}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  <p className="text-xs text-muted-foreground">Pick at least one size for apparel.</p>
                </div>
              ) : null}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  disabled={busy}
                  onClick={cancelForm}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="flex-1 border-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                  disabled={busy}
                  onClick={() => void saveItem()}
                >
                  {draft.editingId ? "Save" : "Add item"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
