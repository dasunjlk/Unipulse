import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  LogoutButton,
  ProposalUploadForm,
  PublishEventButton,
  ExportManifestButton,
} from "@/app/components/scaffold-actions";

export default async function OrganizerDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main>
        <p>Log in as an organizer.</p>
        <Link href="/login">Login</Link>
      </main>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "organizer") {
    return (
      <main>
        <p>Organizer role required.</p>
        <Link href="/">Home</Link>
      </main>
    );
  }

  if (profile.account_status === "pending") {
    return (
      <main>
        <p>
          Your organizer account is pending. Go to{" "}
          <Link href="/dashboard/organizer/pending">waiting room</Link>.
        </p>
      </main>
    );
  }

  const { data: myEvents } = await supabase
    .from("events")
    .select("id,title,is_draft,is_open_event")
    .eq("organizer_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main>
      {/* SCAFFOLD: replace markup with friend&apos;s UI */}
      <h1>Organizer dashboard</h1>
      <LogoutButton />
      <section>
        <h2>Magic onboarding</h2>
        <ProposalUploadForm />
      </section>
      <section>
        <h2>My events</h2>
        <ul>
          {(myEvents ?? []).map((e) => (
            <li key={e.id}>
              <Link href={`/events/${e.id}`}>{e.title || e.id}</Link> — draft {String(e.is_draft)} —{" "}
              {e.is_open_event ? "open" : "closed"} · <PublishEventButton eventId={e.id} /> ·{" "}
              <ExportManifestButton eventId={e.id} />
            </li>
          ))}
        </ul>
      </section>
      <p>
        <Link href="/">Home</Link>
      </p>
    </main>
  );
}
