"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export function WhatsappSettingsCard({
  initialDisplay,
  initialConsent,
}: {
  /** Display form e.g. 07xxxxxxxx */
  initialDisplay: string;
  initialConsent: boolean;
}) {
  const router = useRouter();
  const [display, setDisplay] = useState(initialDisplay);
  const [consent, setConsent] = useState(initialConsent);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/profile/whatsapp", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        whatsapp_number: display.trim(),
        whatsapp_consent: consent,
      }),
    });
    const body = await parseJson(res);
    if (!res.ok) {
      setMsg(String(body.error ?? res.status));
      return;
    }
    setMsg("Saved.");
    router.refresh();
  }

  return (
    <Card id="whatsapp-settings" className="border-white/10 bg-card/50 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-white">WhatsApp</CardTitle>
        <CardDescription>
          Sri Lankan mobile number (e.g. 0715544320). Stored as 94XXXXXXXXX.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="whatsapp_profile">WhatsApp number</Label>
            <Input
              id="whatsapp_profile"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={display}
              onChange={(e) => setDisplay(e.target.value)}
              placeholder="0715544320"
            />
          </div>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="mt-1 rounded border-white/20 bg-transparent"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>I agree to receive WhatsApp notifications from UniPulse.</span>
          </label>
          <Button type="submit" variant="secondary">
            Save WhatsApp settings
          </Button>
          {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}
