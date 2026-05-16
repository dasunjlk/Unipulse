import Link from "next/link";
import { EmailLoginForm } from "@/app/components/scaffold-actions";

export default function OrganizerLoginAliasPage() {
  return (
    <main>
      {/* SCAFFOLD: alias route */}
      <h1>Organizer login</h1>
      <EmailLoginForm />
      <p>
        <Link href="/login">Back</Link> · <Link href="/">Home</Link>
      </p>
    </main>
  );
}
