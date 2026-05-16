"use client";

import { useState } from "react";

async function parseJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
}

export function LogoutButton() {
  const [msg, setMsg] = useState<string | null>(null);

  async function logout() {
    setMsg(null);
    const res = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    const body = await parseJson(res);
    setMsg(res.ok ? "Logged out." : String(body.error ?? res.status));
  }

  return (
    <div>
      <button type="button" onClick={logout}>
        Log out
      </button>
      {msg ? <small> {msg}</small> : null}
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
    setMsg(res.ok ? "OK — session cookie set." : String(body.error ?? res.status));
  }

  return (
    <form onSubmit={onSubmit}>
      <label>
        University ID <input name="university_id" required />
      </label>
      <br />
      <label>
        Full name <input name="full_name" required />
      </label>
      <br />
      <label>
        Password <input name="password" type="password" required minLength={6} />
      </label>
      <br />
      <button type="submit">Sign up</button>
      {msg ? <p>{msg}</p> : null}
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
    setMsg(res.ok ? "OK — pending approval." : String(body.error ?? res.status));
  }

  return (
    <form onSubmit={onSubmit}>
      <label>
        Email <input name="email" type="email" required />
      </label>
      <br />
      <label>
        Full name <input name="full_name" required />
      </label>
      <br />
      <label>
        Club name <input name="club_name" required />
      </label>
      <br />
      <label>
        Password <input name="password" type="password" required minLength={6} />
      </label>
      <br />
      <button type="submit">Sign up</button>
      {msg ? <p>{msg}</p> : null}
    </form>
  );
}

export function StudentLoginForm() {
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login/student", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        university_id: fd.get("university_id"),
        password: fd.get("password"),
      }),
    });
    const body = await parseJson(res);
    setMsg(res.ok ? "OK — logged in." : String(body.error ?? res.status));
  }

  return (
    <form onSubmit={onSubmit}>
      <label>
        University ID <input name="university_id" required />
      </label>
      <br />
      <label>
        Password <input name="password" type="password" required />
      </label>
      <br />
      <button type="submit">Login</button>
      {msg ? <p>{msg}</p> : null}
    </form>
  );
}

export function EmailLoginForm() {
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
    setMsg(res.ok ? "OK — logged in." : String(body.error ?? res.status));
  }

  return (
    <form onSubmit={onSubmit}>
      <label>
        Email <input name="email" type="email" required />
      </label>
      <br />
      <label>
        Password <input name="password" type="password" required />
      </label>
      <br />
      <button type="submit">Login</button>
      {msg ? <p>{msg}</p> : null}
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
    <div>
      <button type="button" onClick={go}>
        I will be there (+1)
      </button>
      {msg ? <small> {msg}</small> : null}
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
    <div>
      <button type="button" onClick={go}>
        Register
      </button>
      {msg ? <small> {msg}</small> : null}
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
    <div>
      <button type="button" onClick={go}>
        Buy {itemId} (mock)
      </button>
      {msg ? <small> {msg}</small> : null}
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
    <div>
      <button type="button" onClick={go}>
        Publish draft (is_draft=false)
      </button>
      {msg ? <small> {msg}</small> : null}
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
    <form onSubmit={onSubmit}>
      <label>
        Proposal file <input name="file" type="file" required />
      </label>
      <button type="submit">Upload</button>
      {msg ? <p>{msg}</p> : null}
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
    <div>
      <button type="button" onClick={go}>
        Export merch manifest (n8n)
      </button>
      {msg ? <small> {msg}</small> : null}
    </div>
  );
}
