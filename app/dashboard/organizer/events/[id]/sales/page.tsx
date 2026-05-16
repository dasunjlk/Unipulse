import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MERCH_ITEM_TYPES, merchTypeLabel, type MerchItemType } from "@/lib/merch";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PageProps = { params: { id: string } };

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default async function OrganizerEventSalesPage({ params }: PageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login/organizer");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    profile.role !== "organizer" ||
    profile.account_status !== "approved"
  ) {
    redirect("/dashboard/organizer");
  }

  const { data: event, error: evErr } = await supabase
    .from("events")
    .select("id, title, organizer_id")
    .eq("id", params.id)
    .single();

  if (evErr || !event || event.organizer_id !== user.id) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="container mx-auto flex-1 px-4 py-16 text-center">
          <p className="text-muted-foreground">Event not found or access denied.</p>
          <Button variant="link" className="mt-4 text-purple-300" asChild>
            <Link href="/dashboard/organizer">Back to dashboard</Link>
          </Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const { data: purchases } = await supabase
    .from("merch_purchases")
    .select("*, profiles!student_id(full_name, university_id)")
    .eq("event_id", params.id)
    .order("purchase_date", { ascending: false });

  const rows = purchases ?? [];

  let totalRevenue = 0;
  let units = 0;
  const buyerIds = new Set<string>();
  for (const r of rows) {
    const p = Number(r.price);
    if (!Number.isNaN(p)) totalRevenue += p * r.quantity;
    units += r.quantity;
    buyerIds.add(r.student_id);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="border-b border-white/10 bg-card/30">
          <div className="container mx-auto px-4 py-8">
            <Button variant="ghost" className="mb-4 -ml-2 text-muted-foreground hover:text-white" asChild>
              <Link href="/dashboard/organizer">← Dashboard</Link>
            </Button>
            <h1 className="text-3xl font-bold text-white">Merch sales</h1>
            <p className="mt-1 text-muted-foreground">{event.title || event.id}</p>
          </div>
        </div>

        <div className="container mx-auto space-y-6 px-4 py-10">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-white/10 bg-card/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Revenue (mock)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-white">{money(totalRevenue)}</p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-card/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Units sold</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-white">{units}</p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-card/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Unique buyers</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-white">{buyerIds.size}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-white/10 bg-card/50">
            <CardHeader>
              <CardTitle className="text-white">Orders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No purchases yet.</p>
              ) : (
                <ul className="space-y-3">
                  {rows.map((r) => {
                    const prof = (
                      r as unknown as {
                        profiles?: { full_name: string; university_id: string | null } | null;
                      }
                    ).profiles;
                    const buyerName =
                      prof?.full_name?.trim() || r.buyer_full_name || "—";
                    const buyerUni =
                      (prof?.university_id && prof.university_id.trim()) ||
                      r.buyer_university_id ||
                      null;

                    const line = Number(r.price) * r.quantity;
                    const typeLabel =
                      r.item_type && MERCH_ITEM_TYPES.includes(r.item_type as MerchItemType)
                        ? merchTypeLabel(r.item_type as MerchItemType)
                        : (r.item_type ?? "—");
                    const when = new Date(r.purchase_date);
                    const whenStr = Number.isNaN(when.getTime())
                      ? r.purchase_date
                      : when.toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        });

                    return (
                      <li
                        key={r.id}
                        className="flex flex-wrap gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
                      >
                        {r.item_image_url ? (
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-white/10">
                            <Image
                              src={r.item_image_url}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="56px"
                            />
                          </div>
                        ) : null}
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="font-medium text-white">{r.item_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Buyer: {buyerName}
                            {buyerUni ? ` · ID: ${buyerUni}` : ""}
                          </p>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Badge variant="outline" className="border-purple-500/40 text-purple-200">
                              {typeLabel}
                            </Badge>
                            {r.size ? (
                              <Badge variant="secondary" className="bg-white/10">
                                Size {r.size}
                              </Badge>
                            ) : null}
                            <span className="text-muted-foreground">
                              {r.quantity} × {money(Number(r.price))} = {money(line)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{whenStr}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="text-center">
            <Link href={`/events/${event.id}`} className="text-sm text-purple-300 hover:underline">
              View public event page
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
