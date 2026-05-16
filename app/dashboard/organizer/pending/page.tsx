import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/app/components/scaffold-actions";

export default async function OrganizerPendingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main>
        <p>Log in first.</p>
        <Link href="/login">Login</Link>
      </main>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,account_status,club_name")
    .eq("id", user.id)
    .single();

  return (
    <main>
      {/* SCAFFOLD: waiting room */}
      <h1>Organizer waiting room</h1>
      <LogoutButton />
      <p>Club: {profile?.club_name ?? "—"}</p>
      <p>Status: {profile?.account_status ?? "unknown"}</p>
      <p>An admin must approve your account before you can create events.</p>
      <p>
        <Link href="/dashboard/organizer">Try dashboard</Link> · <Link href="/">Home</Link>
      </p>
    </main>
  );
}
