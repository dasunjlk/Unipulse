import Link from "next/link";
import { EmailLoginForm } from "@/app/components/scaffold-actions";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function AdminLoginPage() {
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
              href="/"
              className="mb-8 inline-flex text-sm text-muted-foreground hover:text-white"
            >
              ← Back to UniPulse Home
            </Link>

            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge className="border-0 bg-purple-500/20 text-purple-100">
                <Shield className="mr-1 h-3 w-3" aria-hidden />
                Secure Admin Portal
              </Badge>
            </div>

            <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
            <p className="mt-2 text-muted-foreground">
              Sign in to access the admin dashboard
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Use your admin email address as your username.
            </p>

            <Card className="mt-8 max-w-md border-white/10 bg-card/50 backdrop-blur-xl">
              <CardContent className="p-6 pt-6">
                <EmailLoginForm
                  submitLabel="Secure Admin Access"
                  showForgot
                  redirectTo="/dashboard/admin"
                  showHint={false}
                  emailLabel="Username"
                  emailPlaceholder="admin@unipulse.edu"
                  hideClub={true}
                />
              </CardContent>
            </Card>

            <Card className="mt-6 max-w-md border-amber-500/25 bg-amber-500/5 backdrop-blur-xl">
              <CardContent className="flex gap-3 p-4">
                <Shield className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden />
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-amber-100">Secure Admin Access</p>
                  <p className="text-muted-foreground">
                    Authorized personnel only. All access attempts are logged and monitored.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 lg:pl-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-purple-300">
                UniPulse
              </p>
              <h2 className="mt-1 text-2xl font-bold text-white">Admin Control Center</h2>
              <p className="mt-3 max-w-md text-muted-foreground">
                Manage campus organizers, events, approvals, and platform operations from a single
                powerful dashboard.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="border-white/10 bg-card/60 backdrop-blur-xl">
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground">System</p>
                  <p className="mt-1 text-lg font-semibold text-emerald-400">Active</p>
                  <p className="mt-2 text-xs text-muted-foreground">All core services operational</p>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-card/60 backdrop-blur-xl">
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground">Team presence</p>
                  <p className="mt-1 text-lg font-semibold text-white">12 admins online</p>
                  <p className="mt-2 text-xs text-muted-foreground">Across campuses</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-white/10 bg-card/60 backdrop-blur-xl">
              <CardContent className="space-y-3 p-5 text-sm text-muted-foreground">
                <div className="flex justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2">
                  <span className="text-white">Audit trail</span>
                  <span className="text-emerald-400">Live monitoring</span>
                </div>
                <div className="rounded-lg border border-white/5 bg-white/5 px-3 py-2">
                  <p className="text-white">Example credential</p>
                  <p className="font-mono text-xs text-purple-200">admin@unipulse.edu</p>
                  <p className="text-xs">Use your seeded password from README where configured.</p>
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
