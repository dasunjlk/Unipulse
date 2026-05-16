"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

const MAX_BYTES = 10 * 1024 * 1024;

type EventFields = {
  eventTitle?: string;
  date?: string;
  time?: string;
  venue?: string;
  agenda?: string;
  organizerName?: string;
  eventType?: string;
};

type UploadState = "idle" | "uploading" | "success" | "error";

function isEventFields(data: unknown): data is EventFields {
  return typeof data === "object" && data !== null;
}

function hasKnownFields(data: EventFields): boolean {
  return Boolean(
    data.eventTitle ??
      data.date ??
      data.time ??
      data.venue ??
      data.agenda ??
      data.organizerName ??
      data.eventType,
  );
}

function isWorkflowStartedOnly(data: Record<string, unknown>): boolean {
  const msg = String(data.message ?? "").toLowerCase();
  return msg.includes("workflow was started") && !hasKnownFields(data as EventFields);
}

function isMockApiResponse(data: Record<string, unknown>): boolean {
  const text = String(data.data ?? data.message ?? "").toLowerCase();
  return (
    text.includes("nothing is configured for this request path") ||
    text.includes("create a rule and start building a mock api")
  );
}

async function parseJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-white">{value}</p>
    </div>
  );
}

function EventResultCard({ data }: { data: EventFields }) {
  const fields: { label: string; value: string | undefined }[] = [
    { label: "Event title", value: data.eventTitle },
    { label: "Date", value: data.date },
    { label: "Time", value: data.time },
    { label: "Venue", value: data.venue },
    { label: "Agenda", value: data.agenda },
    { label: "Organizer", value: data.organizerName },
    { label: "Event type", value: data.eventType },
  ];

  return (
    <Card className="border-emerald-500/30 bg-emerald-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-emerald-100">Extracted event details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {fields.map(
          ({ label, value }) =>
            value ? <FieldRow key={label} label={label} value={value} /> : null,
        )}
      </CardContent>
    </Card>
  );
}

export function MagicUploadForm() {
  const [state, setState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [fileKey, setFileKey] = useState(0);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const input = e.currentTarget.elements.namedItem("file") as HTMLInputElement | null;
    const file = input?.files?.[0];

    if (!file) {
      setError("Please select a PDF file.");
      setState("error");
      return;
    }

    if (!/pdf/i.test(file.type) && !/\.pdf$/i.test(file.name)) {
      setError("Only PDF files are accepted.");
      setState("error");
      return;
    }

    if (file.size > MAX_BYTES) {
      setError("File is too large. Maximum size is 10 MB.");
      setState("error");
      return;
    }

    setState("uploading");

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/upload-event-pdf", {
        method: "POST",
        credentials: "include",
        body: fd,
      });

      const body = await parseJson(res);

      if (!res.ok) {
        setError(String(body.error ?? `Upload failed (${res.status})`));
        setState("error");
        return;
      }

      setResult(body);
      setState("success");
    } catch {
      setError("Network error. Please try again.");
      setState("error");
    }
  }

  function handleRetry() {
    setState("idle");
    setError(null);
    setResult(null);
    setFileKey((k) => k + 1);
  }

  const showForm = state === "idle" || state === "uploading" || state === "error";

  return (
    <div className="space-y-4">
      {showForm ? (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="magic-pdf">Event PDF</Label>
            <Input
              key={fileKey}
              id="magic-pdf"
              name="file"
              type="file"
              accept="application/pdf,.pdf"
              required
              disabled={state === "uploading"}
            />
            <p className="text-xs text-muted-foreground">PDF only, up to 10 MB</p>
          </div>

          <Button
            type="submit"
            disabled={state === "uploading"}
            className="border-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white"
          >
            {state === "uploading" ? (
              <>
                <Spinner className="mr-2" />
                Processing PDF with AI…
              </>
            ) : (
              "Upload & extract"
            )}
          </Button>
        </form>
      ) : null}

      {state === "error" && error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-200">{error}</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={handleRetry}>
            Retry
          </Button>
        </div>
      ) : null}

      {state === "success" && result ? (
        <div className="space-y-4">
          {isWorkflowStartedOnly(result) ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <p className="text-sm font-medium text-amber-100">n8n responded too early</p>
              <p className="mt-2 text-sm text-amber-100/90">
                The webhook returned &quot;Workflow was started&quot; instead of the extracted event
                fields. In your n8n <strong>Webhook</strong> node, set{" "}
                <strong>Respond</strong> to <strong>When Last Node Finishes</strong> (not
                Immediately), and make sure the last node outputs JSON with eventTitle, date, time,
                venue, agenda, organizerName, and eventType.
              </p>
            </div>
          ) : null}
          {isMockApiResponse(result) ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <p className="text-sm font-medium text-amber-100">n8n returned a mock API message</p>
              <p className="mt-2 text-sm text-amber-100/90">
                Your workflow is hitting a test endpoint (e.g. Beeceptor) instead of returning the
                OpenAI event fields. Remove or bypass that HTTP Request node and set the Webhook to
                respond with the output of your JavaScript / OpenAI node.
              </p>
            </div>
          ) : null}
          {isEventFields(result) && hasKnownFields(result) ? (
            <EventResultCard data={result} />
          ) : !isWorkflowStartedOnly(result) && !isMockApiResponse(result) ? (
            <Card className="border-white/10 bg-white/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-white">Response</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="overflow-x-auto rounded-md bg-black/30 p-3 text-xs text-muted-foreground">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </CardContent>
            </Card>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
            Upload another PDF
          </Button>
        </div>
      ) : null}
    </div>
  );
}
