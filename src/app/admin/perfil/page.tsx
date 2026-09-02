// app/admin/perfil/page.tsx
import { getProfileAction } from "@/app/admin/actions/profile";
import { ProfileForm } from "./profile-form";

export default async function PerfilPage() {
  const profile = await getProfileAction();
  return <ProfileForm profile={profile} />;
}
