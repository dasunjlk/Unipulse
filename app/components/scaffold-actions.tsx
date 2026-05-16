"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      window.location.href = "/";
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
}: {
  submitLabel?: string;
  showForgot?: boolean;
  redirectTo?: string;
  showHint?: boolean;
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
        <Label htmlFor="email-login">Organizer Email</Label>
        <Input
          id="email-login"
          name="email"
          type="email"
          required
          placeholder="organizer@club.edu"
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
      <div className="space-y-2">
        <Label htmlFor="club_display">Organization / Club Name</Label>
        <Input id="club_display" name="club_display" placeholder="e.g., Tech Society" />
        <p className="text-xs text-muted-foreground">Shown for your reference; not sent to login.</p>
      </div>
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

export function MerchBuyButton({
  eventId,
  itemId,
}: {
  eventId: string;
  itemId: string;
}) {
  const [msg, setMsg] = useState<string | null>(null);

  async function go() {
    setMsg(null);
    const res = await fetch(`/api/events/${eventId}/merch/purchase`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: itemId, quantity: 1 }),
    });
    const body = await parseJson(res);
    setMsg(res.ok ? JSON.stringify(body.result) : String(body.error ?? res.status));
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="secondary" onClick={go}>
        Buy {itemId} (mock)
      </Button>
      {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
    </div>
  );
}

export function PublishEventButton({ eventId }: { eventId: string }) {
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
