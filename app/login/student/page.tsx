import Link from "next/link";
import { StudentLoginForm } from "@/app/components/scaffold-actions";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";

export default function StudentLoginPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="relative flex flex-1 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-purple-600/20 blur-3xl" />
          <div className="absolute right-1/4 top-1/3 h-80 w-80 rounded-full bg-blue-600/15 blur-3xl" />
        </div>

        <div className="container mx-auto flex flex-1 flex-col justify-center px-4 py-12 lg:flex-row lg:items-center lg:gap-12">
          <div className="flex-1 lg:max-w-md">
            <Link
              href="/login"
              className="mb-8 inline-flex text-sm text-muted-foreground hover:text-white"
            >
              ← Back to selection
            </Link>
            <h1 className="text-3xl font-bold text-white">Welcome back!</h1>
            <p className="mt-2 text-muted-foreground">Sign in to discover campus events</p>
            <div className="mt-8 rounded-2xl border border-white/10 bg-card/50 p-6 backdrop-blur-xl">
              <StudentLoginForm />
            </div>
            <ButtonGooglePlaceholder />
          </div>

          <div className="mt-12 flex-1 lg:mt-0">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-purple-600/20 to-blue-600/20 p-8 backdrop-blur-xl">
              <h2 className="text-xl font-semibold text-white">Student Portal</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Access events, connect with clubs, and make the most of your campus experience.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {["Tech", "Music", "Sports"].map((t) => (
                  <Badge
                    key={t}
                    variant="secondary"
                    className="border-0 bg-white/10 text-white"
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function ButtonGooglePlaceholder() {
  return (
    <div className="mt-6">
      <div className="relative flex items-center gap-4 py-4">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs uppercase text-muted-foreground">Or continue with</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>
      <button
        type="button"
        disabled
        className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm text-muted-foreground"
      >
        Continue with Google (coming soon)
      </button>
    </div>
  );
}
