import Link from "next/link";
import { OrganizerSignupForm } from "@/app/components/scaffold-actions";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function OrganizerSignupPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container mx-auto flex flex-1 flex-col justify-center px-4 py-12">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="mb-6 inline-flex text-sm text-muted-foreground hover:text-white">
            ← Home
          </Link>
          <h1 className="text-3xl font-bold text-white">Organizer sign up</h1>
          <p className="mt-2 text-muted-foreground">
            Your account stays pending until an admin approves it.
          </p>
          <div className="mt-8 rounded-2xl border border-white/10 bg-card/50 p-6 backdrop-blur-xl">
            <OrganizerSignupForm />
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already approved?{" "}
            <Link href="/login/organizer" className="text-purple-300 hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
