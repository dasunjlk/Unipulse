import Link from "next/link";
import { EmailLoginForm } from "@/app/components/scaffold-actions";
import { SiteFooter } from "@/components/site-footer";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="container mx-auto flex flex-1 flex-col justify-center px-4 py-12">
        <Link href="/login" className="mb-6 text-sm text-muted-foreground hover:text-white">
          ← Back to selection
        </Link>
        <div className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-card/50 p-8 backdrop-blur-xl">
          <h1 className="text-2xl font-bold text-white">Admin login</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Use the seeded admin account from{" "}
            <code className="rounded bg-white/10 px-1 text-xs">README.md</code>
          </p>
          <div className="mt-6">
            <EmailLoginForm
              submitLabel="Sign in as Admin"
              showForgot={false}
              redirectTo="/dashboard/admin"
              showHint={false}
            />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
