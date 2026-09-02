// app/plataforma/layout.tsx — área do dono da plataforma (você), separada do
// /admin de cada tenant. Hoje só a aprovação de lojas em onboarding.
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
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

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="min-h-dvh bg-white text-neutral-900">
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <span className="text-sm font-medium">Plataforma</span>
          <div className="flex items-center gap-5">
            <nav className="flex gap-5 text-sm text-neutral-600">
              <Link href="/plataforma/lojas" className="hover:underline">Lojas</Link>
            </nav>
            <form action={handleSignOut}>
              <button
                type="submit"
                title="Sair"
                aria-label="Sair"
               
                className="flex items-center justify-center rounded p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
