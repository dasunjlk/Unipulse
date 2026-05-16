import Link from "next/link";
import { StudentLoginForm } from "@/app/components/scaffold-actions";

export default function StudentLoginPage() {
  return (
    <main>
      {/* SCAFFOLD: replace markup with friend&apos;s UI */}
      <h1>Student login</h1>
      <StudentLoginForm />
      <p>
        <Link href="/">Home</Link>
      </p>
    </main>
  );
}
