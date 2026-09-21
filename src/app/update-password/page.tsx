import { AuthShell } from "@/components/auth/AuthShell";
import { UpdatePasswordForm } from "@/components/auth/UpdatePasswordForm";

export const metadata = { title: "Set a new password · urpostcard" };

export default function UpdatePasswordPage() {
  return (
    <AuthShell
      title="A new password."
      intro="Then we will put you back where you were."
    >
      <UpdatePasswordForm />
    </AuthShell>
  );
}
