"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Store, User } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type UserPulseMetrics = {
  eventsJoined: number;
  merchItems: number;
};

export type UserMenuProps = {
  fullName: string;
  universityId: string | null;
  clubName: string | null;
  role: "student" | "organizer" | "admin";
  /** Student-only pulse stats; omitted for other roles */
  pulseMetrics?: UserPulseMetrics | null;
};

async function logoutAndRefresh() {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
}

export function UserMenu({ fullName, universityId, clubName, role, pulseMetrics }: UserMenuProps) {
  const router = useRouter();

  async function handleLogout() {
    await logoutAndRefresh();
    router.push("/");
  }

  const title =
    role === "organizer"
      ? (clubName?.trim() || "Organization")
      : fullName?.trim() || "Account";

  let subtitle: string | null = null;
  if (role === "student" && universityId) {
    subtitle = `ID: ${universityId}`;
  } else if (role === "organizer" && fullName?.trim()) {
    subtitle = fullName.trim();
  } else if (role === "admin") {
    subtitle = "Administrator";
  }

  const showPulse = role === "student" && pulseMetrics != null;
  const TriggerIcon = role === "organizer" ? Store : User;

  return (
    <HoverCard openDelay={120} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          aria-label={role === "organizer" ? "Organization menu" : "Account menu"}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5",
            "text-white transition-colors hover:border-purple-500/50 hover:bg-white/10",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50",
          )}
        >
          <TriggerIcon className="h-5 w-5" aria-hidden />
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        align="end"
        sideOffset={8}
        className="w-72 border-white/10 bg-card/90 p-0 text-white shadow-xl backdrop-blur-xl"
      >
        <div className="p-4">
          <p className="truncate text-sm font-semibold text-white">{title}</p>
          {subtitle ? (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>

        {showPulse ? (
          <>
            <div className="border-t border-white/10" />
            <div className="px-4 py-3">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-purple-300/90">
                Your Pulse
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-lg font-bold tabular-nums text-white">
                    {pulseMetrics.eventsJoined}
                  </p>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Events joined
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-lg font-bold tabular-nums text-white">{pulseMetrics.merchItems}</p>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Merch items
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : null}

        <div className="border-t border-white/10" />
        <div className="flex flex-col gap-1 p-2">
          <Link
            href="/map"
            className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-white"
          >
            Campus Map
          </Link>
          {role === "student" ? (
            <Link
              href="/dashboard/student"
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-white"
            >
              Student dashboard
            </Link>
          ) : null}
          {role === "organizer" ? (
            <Link
              href="/dashboard/organizer"
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-white"
            >
              My events
            </Link>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="justify-start text-muted-foreground hover:bg-white/5 hover:text-white"
            onClick={() => void handleLogout()}
          >
            Log out
          </Button>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
