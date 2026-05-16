import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = createClient();
  const { data: events } = await supabase
    .from("events")
    .select("id,title,is_open_event,upvote_count,start_at,grid_row,grid_col")
    .order("start_at", { ascending: true, nullsFirst: false });

  return (
    <main>
      <p style={{ color: "#666" }}>
        {/* SCAFFOLD: replace markup with friend&apos;s UI; keep data-fetching + links. */}
      </p>
      <h1>UniPulse — events</h1>
      <nav>
        <Link href="/signup/student">Sign up (student)</Link>
        {" · "}
        <Link href="/signup/organizer">Sign up (organizer)</Link>
        {" · "}
        <Link href="/login/student">Login (student)</Link>
        {" · "}
        <Link href="/login">Login (organizer/admin)</Link>
        {" · "}
        <Link href="/map">Map</Link>
        {" · "}
        <Link href="/dashboard/organizer">Organizer</Link>
        {" · "}
        <Link href="/dashboard/admin">Admin</Link>
      </nav>

      <ul>
        {(events ?? []).map((e) => (
          <li key={e.id}>
            <Link href={`/events/${e.id}`}>{e.title || "(untitled)"}</Link>
            {e.is_open_event ? ` — hype: ${e.upvote_count}` : " — registration"}
          </li>
        ))}
      </ul>
    </main>
  );
}
