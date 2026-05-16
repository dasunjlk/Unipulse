"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  buildEventDescription,
  hasMagicUploadFields,
  normalizeMagicUploadResponse,
  type MagicUploadFields,
} from "@/lib/magic-upload-extract";
import { Switch } from "@/components/ui/switch";
import { findClosestLocation, type LocationLite } from "@/lib/venue-match";
import { cn } from "@/lib/utils";
import { inferEventCategory } from "@/lib/event-display";

const MAX_BYTES = 10 * 1024 * 1024;

type UploadState = "idle" | "uploading" | "success" | "error";

function isWorkflowStartedOnly(data: Record<string, unknown>): boolean {
  const msg = String(data.message ?? "").toLowerCase();
  return msg.includes("workflow was started") && !hasMagicUploadFields(normalizeMagicUploadResponse(data));
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

/** Parse extracted date/time into ISO or null (invalid / missing). */
function buildStartAtIso(dateStr: string | undefined, timeStr: string | undefined): string | null {
  const d = dateStr?.trim();
  if (!d) return null;
  const t = timeStr?.trim() || "00:00";
  const timePart = t.length === 5 ? `${t}:00` : t;

  let parsed = new Date(`${d} ${timePart}`);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();

  parsed = new Date(`${d}T${timePart}`);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();

  parsed = new Date(`${d}T00:00:00`);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();

  return null;
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

function DescriptionBlock({ value }: { value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Description
      </p>
      <p className="mt-0.5 max-h-48 overflow-y-auto whitespace-pre-wrap text-sm text-white">
        {value}
      </p>
    </div>
  );
}

function ConfirmCreateEventPanel({
  data,
  onUploadAnother,
}: {
  data: MagicUploadFields;
  onUploadAnother: () => void;
}) {
  const router = useRouter();
  const [locations, setLocations] = useState<LocationLite[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [locationId, setLocationId] = useState("");
  const [autoMatchedId, setAutoMatchedId] = useState<string | null>(null);
  const [publishNow, setPublishNow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [title, setTitle] = useState(String(data.eventTitle ?? "").trim());
  const initRef = useRef(false);
  const [categoryOptions, setCategoryOptions] = useState<{ id: string; slug: string; label: string }[]>(
    [],
  );
  const [categoriesErr, setCategoriesErr] = useState<string | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const catsInitRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/locations");
        const body = (await res.json()) as {
          locations?: LocationLite[];
          error?: string;
        };
        if (!res.ok || !body.locations) {
          throw new Error(body.error ?? "Failed to load locations");
        }
        if (!cancelled) {
          setLocations(body.locations);
          setLoadErr(null);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadErr(e instanceof Error ? e.message : "Could not load campus locations.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/event-categories");
        const body = (await res.json()) as {
          categories?: { id: string; slug: string; label: string }[];
          error?: string;
        };
        if (!res.ok || !body.categories) {
          throw new Error(body.error ?? "Failed to load categories");
        }
        if (!cancelled) {
          setCategoryOptions(body.categories);
          setCategoriesErr(null);
        }
      } catch (e) {
        if (!cancelled) {
          setCategoriesErr(e instanceof Error ? e.message : "Could not load categories.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (categoryOptions.length === 0 || catsInitRef.current) return;
    catsInitRef.current = true;
    const fromPdf = String(data.category ?? "").trim().toLowerCase();
    const inferred = inferEventCategory(
      String(data.eventTitle ?? ""),
      buildEventDescription(data),
    ).toLowerCase();
    const hint = fromPdf || inferred;
    const ids: string[] = [];
    if (hint) {
      const dashed = hint.replace(/\s+/g, "-");
      const bySlug = categoryOptions.find((c) => c.slug === hint || c.slug === dashed);
      const byLabel = categoryOptions.find((c) => c.label.toLowerCase() === hint);
      const pick = bySlug ?? byLabel;
      if (pick) ids.push(pick.id);
    }
    if (ids.length === 0) {
      const campus = categoryOptions.find((c) => c.slug === "campus");
      if (campus) ids.push(campus.id);
    }
    setSelectedCategoryIds(ids);
  }, [categoryOptions, data]);

  useEffect(() => {
    if (locations.length === 0 || initRef.current) return;
    initRef.current = true;
    const m = findClosestLocation(data.venue, locations);
    if (m) {
      setLocationId(m.location.id);
      setAutoMatchedId(m.location.id);
    }
  }, [locations, data.venue]);

  function toggleCategoryId(id: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleConfirmCreate() {
    setSubmitErr(null);
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setSubmitErr("Enter an event title.");
      return;
    }
    if (!locationId.trim()) {
      setSubmitErr("Select a campus location for the map pin.");
      return;
    }
    if (selectedCategoryIds.length === 0) {
      setSubmitErr("Select at least one category.");
      return;
    }

    setSubmitting(true);
    try {
      const start_at = buildStartAtIso(data.date, data.time);
      const res = await fetch("/api/events", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: cleanTitle,
          description: buildEventDescription(data),
          venue: data.venue?.trim() ? data.venue.trim() : null,
          start_at,
          end_at: null,
          location_id: locationId.trim(),
          is_open_event: true,
          ticket_capacity: 0,
          is_draft: !publishNow,
          category_ids: selectedCategoryIds,
        }),
      });
      const body = await parseJson(res);
      if (!res.ok) {
        setSubmitErr(String(body.error ?? res.statusText ?? res.status));
        return;
      }
      const event = body.event as { id?: string } | undefined;
      const id = event?.id;
      if (!id) {
        setSubmitErr("Created event but no id returned.");
        return;
      }
      setCreatedId(id);
      router.refresh();
    } catch {
      setSubmitErr("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const summaryRows: { label: string; value: string | undefined }[] = [
    { label: "Date", value: data.date },
    { label: "Time", value: data.time },
    { label: "Venue (from PDF)", value: data.venue },
    { label: "Agenda", value: data.agenda },
    { label: "Organizer", value: data.organizerName },
    { label: "Event type", value: data.eventType },
  ];

  if (createdId) {
    return (
      <Card className="border-emerald-500/40 bg-emerald-500/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-emerald-100">Event created</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-emerald-100/90">
            Your event was saved{publishNow ? " and published" : " as a draft"}.
          </p>
          <Button
            type="button"
            asChild
            className="border-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white"
          >
            <Link href={`/events/${createdId}`}>View event</Link>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onUploadAnother}>
            Upload another PDF
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-500/30 bg-purple-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-purple-100">Create event from extraction</CardTitle>
        <p className="text-xs text-muted-foreground">
          Confirm the campus map pin (auto-matched from venue when possible), then create the event.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 rounded-lg border border-white/10 bg-black/20 p-3">
          <div className="space-y-2">
            <Label htmlFor="magic-title">Title</Label>
            <Input
              id="magic-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              autoComplete="off"
            />
            {!data.eventTitle?.trim() ? (
              <p className="text-xs text-amber-200/90">
                No title found in the PDF — please enter one.
              </p>
            ) : null}
          </div>
          {data.description ? <DescriptionBlock value={data.description} /> : null}
          {summaryRows.map(({ label, value }) => {
            if (!value) return null;
            if (label === "Agenda" && value === data.description) return null;
            return <FieldRow key={label} label={label} value={value} />;
          })}
        </div>

        <div className="space-y-2">
          <Label>Categories</Label>
          {categoriesErr ? (
            <p className="text-xs text-destructive">{categoriesErr}</p>
          ) : categoryOptions.length === 0 ? (
            <p className="text-xs text-muted-foreground">Loading categories…</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map((c) => {
                const on = selectedCategoryIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCategoryId(c.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      on
                        ? "border-purple-500 bg-purple-500/20 text-white"
                        : "border-white/15 bg-white/5 text-muted-foreground hover:border-white/25",
                    )}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Suggested from the PDF when possible — adjust before creating.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="magic-location">Campus location (map pin)</Label>
          <select
            id="magic-location"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            disabled={!!loadErr || locations.length === 0}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-white ring-offset-background",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <option value="">Select campus location…</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.code} — {loc.name}
              </option>
            ))}
          </select>
          {loadErr ? (
            <p className="text-xs text-destructive">{loadErr}</p>
          ) : locations.length === 0 ? (
            <p className="text-xs text-muted-foreground">Loading locations…</p>
          ) : autoMatchedId && locationId === autoMatchedId ? (
            <p className="text-xs text-emerald-200/90">Auto-matched from PDF venue text.</p>
          ) : locationId ? (
            <p className="text-xs text-muted-foreground">Custom campus location selected.</p>
          ) : findClosestLocation(data.venue, locations) === null ? (
            <p className="text-xs text-amber-200/90">
              No confident venue match — pick the closest campus location above.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Pick a campus location to continue.</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/5 p-4">
          <div>
            <p className="text-sm font-medium text-white">Publish immediately</p>
            <p className="text-xs text-muted-foreground">
              Off = save as draft (edit or publish from My events)
            </p>
          </div>
          <Switch checked={publishNow} onCheckedChange={setPublishNow} aria-label="Publish immediately" />
        </div>

        <Button
          type="button"
          disabled={
            !title.trim() ||
            !locationId.trim() ||
            selectedCategoryIds.length === 0 ||
            submitting ||
            !!loadErr ||
            locations.length === 0 ||
            !!categoriesErr ||
            categoryOptions.length === 0
          }
          className="w-full border-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white"
          onClick={() => void handleConfirmCreate()}
        >
          {submitting ? (
            <>
              <Spinner className="mr-2" />
              Creating…
            </>
          ) : (
            "Confirm & create event"
          )}
        </Button>
        {submitErr ? <p className="text-sm text-destructive">{submitErr}</p> : null}
      </CardContent>
    </Card>
  );
}

export function MagicUploadForm() {
  const [state, setState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MagicUploadFields | null>(null);
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

      if ("raw" in body && typeof body.raw === "string") {
        setError("Unexpected response from server.");
        setState("error");
        return;
      }

      setResult(normalizeMagicUploadResponse(body));
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
  const rawResult = result as unknown as Record<string, unknown> | null;

  const extracted = result && hasMagicUploadFields(result) ? result : null;
  const confirmPanelKey = extracted
    ? [
        extracted.eventTitle ?? "",
        extracted.date ?? "",
        extracted.time ?? "",
        extracted.venue ?? "",
        fileKey,
      ].join("|")
    : String(fileKey);

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
          {rawResult && isWorkflowStartedOnly(rawResult) ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <p className="text-sm font-medium text-amber-100">n8n responded too early</p>
              <p className="mt-2 text-sm text-amber-100/90">
                The webhook returned &quot;Workflow was started&quot; instead of the extracted event
                fields. In your n8n <strong>Webhook</strong> node, set{" "}
                <strong>Respond</strong> to <strong>When Last Node Finishes</strong>.
              </p>
            </div>
          ) : null}
          {rawResult && isMockApiResponse(rawResult) ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <p className="text-sm font-medium text-amber-100">n8n returned a mock API message</p>
              <p className="mt-2 text-sm text-amber-100/90">
                Your workflow is hitting a test endpoint instead of returning the OpenAI event fields.
              </p>
            </div>
          ) : null}
          {extracted ? (
            <ConfirmCreateEventPanel
              key={confirmPanelKey}
              data={extracted}
              onUploadAnother={handleRetry}
            />
          ) : rawResult && !isWorkflowStartedOnly(rawResult) && !isMockApiResponse(rawResult) ? (
            <Card className="border-white/10 bg-white/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-white">Response</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="overflow-x-auto rounded-md bg-black/30 p-3 text-xs text-muted-foreground">
                  {JSON.stringify(rawResult, null, 2)}
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
