import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ChangePasswordForm } from "./change-password-form";

export default async function MudarSenhaPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin?callbackUrl=/mudar-senha");
  return <ChangePasswordForm />;
}
