import Link from "next/link";
import { EmailLoginForm } from "@/app/components/scaffold-actions";

export default function AdminLoginAliasPage() {
  return (
    <main>
      {/* SCAFFOLD: alias route — admins are seeded, not self-registered */}
      <h1>Admin login</h1>
      <EmailLoginForm />
      <p>
        <Link href="/login">Back</Link> · <Link href="/">Home</Link>
      </p>
    </main>
  );
}
