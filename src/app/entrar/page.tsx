// app/entrar/page.tsx — login de operador (owner da plataforma ou lojista).
// Antes forçava a página padrão (feia) do NextAuth em /api/auth/signin; agora
// tem form próprio (e-mail/senha + Google) e só decide pra onde mandar depois
// de autenticado, porque não dá pra saber antes se quem entrou é você (dono
// da plataforma) ou um lojista — a resposta está em User + Membership.
// Comprador não entra por aqui: é identidade por loja (/loja/<slug>/entrar).
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LoginForm } from "./login-form";

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const { callbackUrl } = await searchParams;
  // Só path relativo (evita open redirect via callbackUrl vindo da URL).
  const safeCallbackUrl = callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : null;

  if (session?.user) {
    if (safeCallbackUrl) redirect(safeCallbackUrl);

    const email = session.user.email?.toLowerCase();
    const user = email
      ? await prisma.user.findUnique({ where: { email }, include: { memberships: { take: 1 } } })
      : null;

    if (user?.platformRole === "admin") redirect("/plataforma/lojas");
    if (user?.memberships[0]) redirect("/admin/produtos");
    redirect("/");
  }

  const entrarUrl = safeCallbackUrl ? `/entrar?callbackUrl=${encodeURIComponent(safeCallbackUrl)}` : "/entrar";

  async function loginGoogle() {
    "use server";
    await signIn("google", { redirectTo: entrarUrl });
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-16 text-center">
      <h1 className="text-xl font-medium">Entrar</h1>
      <p className="mt-2 text-sm text-neutral-500">Acesso da plataforma e das lojas.</p>

      <div className="mt-8">
        <LoginForm returnTo={entrarUrl} />
      </div>

      <div className="mt-6 flex items-center gap-3 text-xs text-neutral-400">
        <span className="h-px flex-1 bg-neutral-200" />
        ou
        <span className="h-px flex-1 bg-neutral-200" />
      </div>

      <form action={loginGoogle} className="mt-6">
        <button className="h-11 w-full rounded-lg border border-neutral-300 bg-white text-sm font-medium hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
          Continuar com Google
        </button>
      </form>

      <p className="mt-6 text-xs text-neutral-400">
        É comprador de uma loja? Faça login pela vitrine da loja onde comprou.
      </p>
      <p className="mt-2 text-xs text-neutral-400">
        Ainda não tem loja?{" "}
        <Link href="/onboarding" className="underline-offset-2 hover:underline">
          Cadastre-se
        </Link>
      </p>
    </main>
  );
}
