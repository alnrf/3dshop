// app/plataforma/layout.tsx — área do dono da plataforma (você), separada do
// /admin de cada tenant. Hoje só a aprovação de lojas em onboarding.
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { requirePlatformAdmin } from "@/lib/tenant";

export default async function PlataformaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin?callbackUrl=/plataforma/lojas");

  try {
    await requirePlatformAdmin();
  } catch {
    redirect("/");
  }

  return (
    <div className="min-h-dvh bg-white text-neutral-900">
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <span className="text-sm font-medium">Plataforma</span>
          <nav className="flex gap-5 text-sm text-neutral-600">
            <Link href="/plataforma/lojas" className="hover:underline">Lojas</Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
