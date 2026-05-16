import Link from "next/link";
import { GraduationCap, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";

export default function LoginSelectionPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col px-4 py-12">
        <div className="container mx-auto max-w-4xl">
          <Link
            href="/"
            className="mb-8 inline-flex text-sm text-muted-foreground hover:text-white"
          >
            ← Back to home
          </Link>

          <div className="mb-10 text-center">
            <div className="mx-auto mb-4 flex justify-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 text-xl font-black text-white">
                U
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white">UniPulse</h1>
            <p className="mt-2 text-muted-foreground">Choose how you want to continue</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-white/10 bg-card/50 backdrop-blur-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <GraduationCap className="h-5 w-5 text-purple-400" />
                    Student Login
                  </CardTitle>
                </div>
                <CardDescription>
                  Discover events, register, and build your campus journey. Connect with clubs and
                  never miss out.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  asChild
                  className="w-full border-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                >
                  <Link href="/login/student">Continue as Student</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-card/50 backdrop-blur-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Briefcase className="h-5 w-5 text-blue-400" />
                    Organizer Login
                  </CardTitle>
                  <Badge className="border-0 bg-purple-500/20 text-purple-200">Pro</Badge>
                </div>
                <CardDescription>
                  Manage events, analytics, registrations, and promotions. Full dashboard control
                  for organizers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  asChild
                  variant="secondary"
                  className="w-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
                >
                  <Link href="/login/organizer">Continue as Organizer</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Admin?{" "}
            <Link href="/login/admin" className="text-purple-300 hover:underline">
              Admin login
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
