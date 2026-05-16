import Link from "next/link";
import { EmailLoginForm } from "@/app/components/scaffold-actions";
import { SiteFooter } from "@/components/site-footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function OrganizerLoginPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="relative flex-1">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-purple-600/20 blur-3xl" />
          <div className="absolute right-1/3 top-1/3 h-72 w-72 rounded-full bg-indigo-600/15 blur-3xl" />
        </div>

        <div className="container mx-auto grid gap-10 px-4 py-12 lg:grid-cols-2 lg:items-center">
          <div>
            <Link
              href="/login"
              className="mb-8 inline-flex text-sm text-muted-foreground hover:text-white"
            >
              ← Back to selection
            </Link>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-100">
              <span>Admin Access</span>
            </div>
            <h1 className="text-3xl font-bold text-white">Organizer Portal</h1>
            <p className="mt-2 text-muted-foreground">
              Access your event management dashboard
            </p>
            <div className="mt-8 max-w-md rounded-2xl border border-white/10 bg-card/50 p-6 backdrop-blur-xl">
              <EmailLoginForm
                submitLabel="Access Dashboard"
                redirectTo="/dashboard/organizer"
              />
            </div>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Want to become an organizer?{" "}
              <Link href="/signup/organizer" className="text-purple-300 hover:underline">
                Apply here
              </Link>
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <Badge className="border-0 bg-purple-500/20 text-purple-100">Dashboard Preview</Badge>
              <Badge variant="outline" className="border-white/20 text-muted-foreground">
                Live Demo
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Total Events", value: "24" },
                { label: "Registrations", value: "1.2k" },
                { label: "Revenue", value: "$8.4k" },
                { label: "Engagement", value: "94%" },
              ].map((s) => (
                <Card key={s.label} className="border-white/10 bg-card/60 backdrop-blur-xl">
                  <CardHeader className="p-4 pb-2">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <CardTitle className="text-2xl text-white">{s.value}</CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
            <Card className="border-white/10 bg-card/60 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-lg text-white">Event Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2">
                  <span>Recent Activity</span>
                  <span className="text-emerald-400">Full analytics access</span>
                </div>
                <div className="rounded-lg border border-white/5 bg-white/5 px-3 py-2">
                  <p className="text-white">New registration for Tech Talk</p>
                  <p className="text-xs">2m ago</p>
                </div>
                <div className="rounded-lg border border-white/5 bg-white/5 px-3 py-2">
                  <p className="text-white">Event revenue updated</p>
                  <p className="text-xs">15m ago</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
