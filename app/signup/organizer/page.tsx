import Link from "next/link";
import { OrganizerSignupForm } from "@/app/components/scaffold-actions";

export default function OrganizerSignupPage() {
  return (
    <main>
      {/* SCAFFOLD: replace markup with friend&apos;s UI */}
      <h1>Organizer sign up</h1>
      <OrganizerSignupForm />
      <p>
        <Link href="/">Home</Link>
      </p>
    </main>
  );
}
