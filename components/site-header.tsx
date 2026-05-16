import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UserMenu, type UserPulseMetrics } from "@/components/user-menu";

export async function SiteHeader() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let pulseMetrics: UserPulseMetrics | null = null;
  let userMenuProps: {
    fullName: string;
    universityId: string | null;
    clubName: string | null;
    role: "student" | "organizer" | "admin";
    pulseMetrics?: UserPulseMetrics | null;
  } | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, university_id, club_name, role")
      .eq("id", user.id)
      .single();

    const role = (profile?.role ?? "student") as "student" | "organizer" | "admin";

    if (profile?.role === "student") {
      const { count: eventsJoined } = await supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("student_id", user.id);

      const { data: purchaseRows } = await supabase
        .from("merch_purchases")
        .select("quantity")
        .eq("student_id", user.id);

      const merchItems =
        purchaseRows?.reduce((sum, row) => sum + (typeof row.quantity === "number" ? row.quantity : 0), 0) ?? 0;

      pulseMetrics = {
        eventsJoined: eventsJoined ?? 0,
        merchItems,
      };
    }

    userMenuProps = {
      fullName: profile?.full_name?.trim() || "",
      universityId: profile?.university_id ?? null,
      clubName: profile?.club_name ?? null,
      role,
      pulseMetrics: profile?.role === "student" ? pulseMetrics : null,
    };
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <Link href="/map" className="text-sm font-medium text-muted-foreground hover:text-white">
          Campus Map
        </Link>
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 text-sm font-black">
            U
          </span>
          UniPulse
        </Link>
        {user && userMenuProps ? (
          <UserMenu {...userMenuProps} />
        ) : (
          <Link
            href="/login"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-purple-500/50 hover:bg-white/10"
          >
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
