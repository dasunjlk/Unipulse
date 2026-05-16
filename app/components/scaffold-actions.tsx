"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { MerchItem, MerchSize } from "@/lib/merch";
import { isWearable, merchTypeLabel } from "@/lib/merch";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { cn } from "@/lib/utils";

async function parseJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
}

export function LogoutButton() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);

  async function logout() {
    setMsg(null);
    const res = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    const body = await parseJson(res);
    if (res.ok) {
      router.push("/");
      return;
    }
    setMsg(String(body.error ?? res.status));
  }

  return (
    <div className="flex items-center gap-3">
      <Button type="button" variant="secondary" onClick={logout}>
        Log out
      </Button>
      {msg ? <span className="text-sm text-muted-foreground">{msg}</span> : null}
    </div>
  );
}

export function StudentSignupForm() {
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/signup/student", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        university_id: fd.get("university_id"),
        full_name: fd.get("full_name"),
        password: fd.get("password"),
        whatsapp_number: String(fd.get("whatsapp_number") ?? "").trim() || undefined,
        whatsapp_consent: fd.get("whatsapp_consent") === "on",
      }),
    });
    const body = await parseJson(res);
    setMsg(res.ok ? "Account created — you’re signed in." : String(body.error ?? res.status));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="university_id">University ID</Label>
        <Input id="university_id" name="university_id" required placeholder="e.g. jane.doe" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="full_name">Full name</Label>
        <Input id="full_name" name="full_name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="whatsapp_student">WhatsApp number (optional)</Label>
        <Input
          id="whatsapp_student"
          name="whatsapp_number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="e.g. 0715544320"
        />
        <p className="text-xs text-muted-foreground">
          Sri Lankan mobile — stored as 94XXXXXXXXX for messaging later.
        </p>
      </div>
      <label className="flex cursor-pointer items-start gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          name="whatsapp_consent"
          defaultChecked
          className="mt-1 rounded border-white/20 bg-transparent"
        />
        <span>Notify me on WhatsApp about events (when we enable this).</span>
      </label>
      <Button
        type="submit"
        className="w-full border-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white"
      >
        Sign up
      </Button>
      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
    </form>
  );
}

export function OrganizerSignupForm() {
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/signup/organizer", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: fd.get("email"),
        full_name: fd.get("full_name"),
        club_name: fd.get("club_name"),
        password: fd.get("password"),
        whatsapp_number: String(fd.get("whatsapp_number") ?? "").trim(),
        whatsapp_consent: fd.get("whatsapp_consent") === "on",
      }),
    });
    const body = await parseJson(res);
    setMsg(res.ok ? "Application submitted — pending approval." : String(body.error ?? res.status));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="full_name_org">Full name</Label>
        <Input id="full_name_org" name="full_name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="club_name">Club name</Label>
        <Input id="club_name" name="club_name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="whatsapp_org">WhatsApp number</Label>
        <Input
          id="whatsapp_org"
          name="whatsapp_number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          placeholder="e.g. 0715544320"
        />
        <p className="text-xs text-muted-foreground">
          Sri Lankan mobile — we&apos;ll message you when your events go live.
        </p>
      </div>
      <label className="flex cursor-pointer items-start gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          name="whatsapp_consent"
          defaultChecked
          className="mt-1 rounded border-white/20 bg-transparent"
        />
        <span>I agree to receive WhatsApp notifications about my organizer activity.</span>
      </label>
      <div className="space-y-2">
        <Label htmlFor="password_org">Password</Label>
        <Input
          id="password_org"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
        />
      </div>
      <Button
        type="submit"
        className="w-full border-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white"
      >
        Sign up
      </Button>
      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
    </form>
  );
}

function normalizeUniversityId(raw: string) {
  const t = raw.trim();
  if (t.includes("@")) {
    return t.split("@")[0] ?? t;
  }
  return t;
}

export function StudentLoginForm() {
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    const university_id = normalizeUniversityId(String(fd.get("university_id") ?? ""));
    const res = await fetch("/api/auth/login/student", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        university_id,
        password: fd.get("password"),
      }),
    });
    const body = await parseJson(res);
    setMsg(res.ok ? "Welcome back — redirected soon." : String(body.error ?? res.status));
    if (res.ok) {
      window.location.href = "/dashboard/student";
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="uni">University email or ID</Label>
        <Input
          id="uni"
          name="university_id"
          required
          autoComplete="username"
          placeholder="you@university.edu"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pw">Password</Label>
        <Input
          id="pw"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="Enter your password"
        />
      </div>
      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-muted-foreground">
          <input type="checkbox" className="rounded border-white/20 bg-transparent" />
          Remember me
        </label>
        <span className="text-muted-foreground">Forgot password?</span>
      </div>
      <Button
        type="submit"
        className="w-full border-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white"
      >
        Sign In
      </Button>
      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup/student" className="text-purple-300 hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}

export function EmailLoginForm({
  submitLabel = "Access Dashboard",
  showForgot = true,
  redirectTo = "/dashboard/organizer",
  showHint = false,
  emailLabel = "Organizer Email",
  emailPlaceholder = "organizer@club.edu",
  hideClub = false,
}: {
  submitLabel?: string;
  showForgot?: boolean;
  redirectTo?: string;
  showHint?: boolean;
  emailLabel?: string;
  emailPlaceholder?: string;
  hideClub?: boolean;
} = {}) {
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: fd.get("email"),
        password: fd.get("password"),
      }),
    });
    const body = await parseJson(res);
    setMsg(res.ok ? "Signed in." : String(body.error ?? res.status));
    if (res.ok) {
      window.location.href = redirectTo;
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {showHint ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          Admin users: use your seed email on this form too, then open{" "}
          <Link href="/dashboard/admin" className="underline">
            Admin dashboard
          </Link>
          .
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="email-login">{emailLabel}</Label>
        <Input
          id="email-login"
          name="email"
          type="email"
          required
          placeholder={emailPlaceholder}
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email-pass">Password</Label>
        <Input
          id="email-pass"
          name="password"
          type="password"
          required
          placeholder="Enter your password"
          autoComplete="current-password"
        />
      </div>
      {!hideClub && (
        <div className="space-y-2">
          <Label htmlFor="club_display">Organization / Club Name</Label>
          <Input id="club_display" name="club_display" placeholder="e.g., Tech Society" />
          <p className="text-xs text-muted-foreground">Shown for your reference; not sent to login.</p>
        </div>
      )}
      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-muted-foreground">
          <input type="checkbox" className="rounded border-white/20 bg-transparent" />
          Keep me signed in
        </label>
        {showForgot ? <span className="text-muted-foreground">Forgot password?</span> : null}
      </div>
      <Button
        type="submit"
        className="w-full border-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white"
      >
        {submitLabel}
      </Button>
      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
    </form>
  );
}

export function UpvoteButton({ eventId }: { eventId: string }) {
  const [msg, setMsg] = useState<string | null>(null);

  async function go() {
    setMsg(null);
    const res = await fetch(`/api/events/${eventId}/upvote`, {
      method: "PATCH",
      credentials: "include",
    });
    const body = await parseJson(res);
    setMsg(res.ok ? "Upvoted (+1)." : String(body.error ?? res.status));
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        onClick={go}
        className="border-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white"
      >
        I will be there (+1)
      </Button>
      {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
    </div>
  );
}

export function RegisterButton({ eventId }: { eventId: string }) {
  const [msg, setMsg] = useState<string | null>(null);

  async function go() {
    setMsg(null);
    const res = await fetch(`/api/events/${eventId}/register`, {
      method: "POST",
      credentials: "include",
    });
    const body = await parseJson(res);
    setMsg(res.ok ? JSON.stringify(body.result) : String(body.error ?? res.status));
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        onClick={go}
        className="border-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white"
      >
        Register Now
      </Button>
      {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
    </div>
  );
}

export function UnregisterButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);

  async function go() {
    setMsg(null);
    const res = await fetch(`/api/events/${eventId}/register`, {
      method: "DELETE",
      credentials: "include",
    });
    const body = await parseJson(res);
    setMsg(res.ok ? "Unregistered." : String(body.error ?? res.status));
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="outline" size="sm" onClick={go}>
        Unregister
      </Button>
      {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
    </div>
  );
}

const merchCheckoutFieldClass =
  "border-zinc-400/50 bg-white text-zinc-950 caret-zinc-950 placeholder:text-zinc-500 shadow-sm dark:border-zinc-500/40 dark:bg-zinc-100 dark:text-zinc-950 dark:caret-zinc-950 dark:placeholder:text-zinc-600";

export function MerchBuyButton({
  eventId,
  item,
}: {
  eventId: string;
  item: MerchItem;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState<MerchSize | "">("");
  const [busy, setBusy] = useState(false);

  const needsSize = item.sizes.length > 0;
  const canSubmit =
    !busy && quantity >= 1 && (!needsSize || (size !== "" && item.sizes.includes(size)));

  async function confirmPurchase() {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${eventId}/merch/purchase`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: item.id,
          quantity,
          size: needsSize ? size : null,
        }),
      });
      const body = await parseJson(res);
      const result = body.result as { ok?: boolean; error?: string } | undefined;
      if (!res.ok || result?.ok === false) {
        toast.error(String(body.error ?? result?.error ?? "Purchase failed"));
        return;
      }
      toast.success(`Purchased ${quantity}× ${item.name}`);
      setOpen(false);
      setQuantity(1);
      setSize("");
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
          setQuantity(1);
          setSize("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="secondary" size="sm">
          Buy
        </Button>
      </DialogTrigger>
      <DialogContent className="border-white/10 bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Confirm purchase</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="flex gap-3">
            {item.image_url ? (
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-white/10">
                <Image
                  src={item.image_url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
            ) : null}
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">{item.name}</span> —{" "}
              {merchTypeLabel(item.item_type)} · ${item.price.toFixed(2)} each
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`qty-${item.id}`} className="text-muted-foreground">
              Quantity
            </Label>
            <Input
              id={`qty-${item.id}`}
              type="number"
              min={1}
              step={1}
              value={quantity}
              onChange={(e) => {
                const n = Number(e.target.value);
                setQuantity(Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1);
              }}
              className={merchCheckoutFieldClass}
            />
          </div>
          {needsSize ? (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Size</Label>
              <Select value={size || undefined} onValueChange={(v) => setSize(v as MerchSize)}>
                <SelectTrigger className={cn("w-full", merchCheckoutFieldClass)}>
                  <SelectValue placeholder="Choose size" />
                </SelectTrigger>
                <SelectContent className="border-zinc-300 bg-white text-zinc-950 dark:border-zinc-600 dark:bg-zinc-100 dark:text-zinc-950">
                  {item.sizes.map((sz) => (
                    <SelectItem key={sz} value={sz}>
                      {sz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : isWearable(item.item_type) ? (
            <p className="text-xs text-muted-foreground">One size / no size selection for this item.</p>
          ) : null}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            className="border-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white"
            disabled={!canSubmit}
            onClick={() => void confirmPurchase()}
          >
            {busy ? "Working…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PublishEventButton({
  eventId,
  onSuccess,
}: {
  eventId: string;
  onSuccess?: () => void;
}) {
  const [msg, setMsg] = useState<string | null>(null);

  async function go() {
    setMsg(null);
    const res = await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_draft: false }),
    });
    const body = await parseJson(res);
    setMsg(
      res.ok ? "Published (fires n8n event-published)." : String(body.error ?? res.status),
    );
    if (res.ok) onSuccess?.();
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="outline" size="sm" onClick={go}>
        Publish draft
      </Button>
      {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
    </div>
  );
}

export function UnpublishEventButton({
  eventId,
  onSuccess,
}: {
  eventId: string;
  onSuccess?: () => void;
}) {
  const [msg, setMsg] = useState<string | null>(null);

  async function go() {
    setMsg(null);
    const res = await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_draft: true }),
    });
    const body = await parseJson(res);
    setMsg(res.ok ? "Unpublished — event is now draft." : String(body.error ?? res.status));
    if (res.ok) onSuccess?.();
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="outline" size="sm" onClick={go}>
        Unpublish
      </Button>
      {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
    </div>
  );
}

export function ProposalUploadForm() {
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/onboard", {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    const body = await parseJson(res);
    setMsg(res.ok ? "Uploaded — n8n webhook fired." : String(body.error ?? res.status));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="proposal">Proposal file</Label>
        <Input id="proposal" name="file" type="file" required />
      </div>
      <Button type="submit" variant="secondary">
        Upload
      </Button>
      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
    </form>
  );
}

export function ExportManifestButton({ eventId }: { eventId: string }) {
  const [msg, setMsg] = useState<string | null>(null);

  async function go() {
    setMsg(null);
    const res = await fetch(`/api/events/${eventId}/merch/export-manifest`, {
      method: "POST",
      credentials: "include",
    });
    const body = await parseJson(res);
    setMsg(res.ok ? "Queued manifest export." : String(body.error ?? res.status));
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="outline" size="sm" onClick={go}>
        Export merch manifest
      </Button>
      {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
    </div>
  );
}
