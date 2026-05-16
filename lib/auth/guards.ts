import type { User } from "@supabase/supabase-js";

/** Profiles row shape (mirrors `Database["public"]["Tables"]["profiles"]["Row"]`). */
export type ProfileRow = {
  id: string;
  full_name: string;
  university_id: string | null;
  club_name: string | null;
  role: "student" | "organizer" | "admin";
  account_status: "pending" | "approved" | "rejected";
  manual_interests: string[];
  created_at: string;
};

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export async function requireUser(supabase: AnyClient): Promise<User> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new HttpError(401, "Unauthorized");
  }

  return user;
}

export async function requireProfile(
  supabase: AnyClient,
): Promise<{ user: User; profile: ProfileRow }> {
  const user = await requireUser(supabase);

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    throw new HttpError(403, "Profile not found");
  }

  return { user, profile: profile as ProfileRow };
}

export async function requireApprovedOrganizer(
  supabase: AnyClient,
): Promise<{ user: User; profile: ProfileRow }> {
  const { user, profile } = await requireProfile(supabase);

  if (profile.role !== "organizer") {
    throw new HttpError(403, "Organizer role required");
  }

  if (profile.account_status !== "approved") {
    throw new HttpError(403, "Organizer account not approved");
  }

  return { user, profile };
}

export async function requireAdmin(
  supabase: AnyClient,
): Promise<{ user: User; profile: ProfileRow }> {
  const { user, profile } = await requireProfile(supabase);

  if (profile.role !== "admin") {
    throw new HttpError(403, "Admin role required");
  }

  return { user, profile };
}

export async function requireStudent(
  supabase: AnyClient,
): Promise<{ user: User; profile: ProfileRow }> {
  const { user, profile } = await requireProfile(supabase);

  if (profile.role !== "student") {
    throw new HttpError(403, "Student role required");
  }

  return { user, profile };
}

type AnyClient = any;
