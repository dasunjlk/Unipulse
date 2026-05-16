import Link from "next/link";
import { EmailLoginForm } from "@/app/components/scaffold-actions";

export default function EmailLoginPage() {
  return (
    <main>
      {/* SCAFFOLD: replace markup with friend&apos;s UI */}
      <h1>Organizer / admin login</h1>
      <p>Use your email and password (same form for both roles).</p>
      <EmailLoginForm />
      <p>
        <Link href="/">Home</Link>
      </p>
    </main>
  );
}
