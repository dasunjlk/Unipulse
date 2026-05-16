"use client";

import Link from "next/link";
import { useState } from "react";
import { ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";

async function parseJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
}

export function EventCardActions({
  eventId,
  isOpenEvent,
  initialUpvotes,
}: {
  eventId: string;
  isOpenEvent: boolean;
  initialUpvotes: number;
}) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function upvote() {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/events/${eventId}/upvote`, {
      method: "PATCH",
      credentials: "include",
    });
    const body = await parseJson(res);
    setBusy(false);
    if (!res.ok) {
      setMsg(String(body.error ?? res.status));
      return;
    }
    setUpvotes((u) => u + 1);
  }

  async function register() {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/events/${eventId}/register`, {
      method: "POST",
      credentials: "include",
    });
    const body = await parseJson(res);
    setBusy(false);
    if (!res.ok) {
      setMsg(String(body.error ?? res.status));
      return;
    }
    setMsg("Registered!");
  }

  if (isOpenEvent) {
    return (
      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          disabled={busy}
          onClick={() => void upvote()}
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-muted-foreground transition-all hover:border-purple-500/50 hover:bg-purple-500/10 hover:text-purple-300 disabled:opacity-50"
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          <span>{upvotes}</span>
        </button>
        <Button
          asChild
          size="sm"
          className="border-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500"
        >
          <Link href={`/events/${eventId}`}>View</Link>
        </Button>
        {msg ? <span className="sr-only">{msg}</span> : null}
      </div>
    );
  }

  return (
    <div className="mt-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Registration</span>
        {msg ? <span className="text-xs text-emerald-400">{msg}</span> : null}
      </div>
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => void register()}
          className="border-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500"
        >
          Register
        </Button>
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link href={`/events/${eventId}`}>Details</Link>
        </Button>
      </div>
      {msg && !msg.startsWith("Registered") ? (
        <p className="text-xs text-destructive">{msg}</p>
      ) : null}
    </div>
  );
}
