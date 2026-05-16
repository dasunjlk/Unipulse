import Link from "next/link";
import { StudentSignupForm } from "@/app/components/scaffold-actions";

export default function StudentSignupPage() {
  return (
    <main>
      {/* SCAFFOLD: replace markup with friend&apos;s UI */}
      <h1>Student sign up</h1>
      <StudentSignupForm />
      <p>
        <Link href="/">Home</Link>
      </p>
    </main>
  );
}
