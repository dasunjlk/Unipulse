/** Maps a student's university ID to the synthetic Supabase Auth email local-part domain. */
export function studentSyntheticEmail(universityId: string): string {
  const slug = universityId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    throw new Error("Invalid university ID");
  }

  return `${slug}@students.unipulse.local`;
}
