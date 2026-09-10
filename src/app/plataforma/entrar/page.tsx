// app/plataforma/entrar/page.tsx — login exclusivo do admin da plataforma.
// Diferente de /entrar: NUNCA aproveita sessão de outra conta em silêncio.
// Se já tem sessão e ela não é admin (ex.: lojista testando em paralelo),
// desconecta na hora e avisa — em vez de herdar o acesso errado.
import { redirect } from "next/navigation";
import { auth, signIn, signOut } from "@/auth";
import { requirePlatformAdmin } from "@/lib/tenant";
import { LoginForm } from "./login-form";

export default async function PlataformaEntrarPage() {
  const session = await auth();

  let deniedEmail: string | null = null;
  if (session?.user) {
    // redirect() fica FORA do try: ele lança um sinal de controle especial do
    // Next, e um catch genérico em volta dele o engoliria, tratando um admin
    // válido como se tivesse falhado a checagem.
    let isAdmin = false;
    try {
      await requirePlatformAdmin();
      isAdmin = true;
    } catch {
      deniedEmail = session.user.email ?? null;
    }
    if (isAdmin) redirect("/plataforma/lojas");
    await signOut({ redirect: false });
  }

  async function loginGoogle() {
    "use server";
    await signIn("google", { redirectTo: "/plataforma/entrar" });
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-16 text-center">
      <h1 className="text-xl font-medium">Entrar — Plataforma</h1>
      <p className="mt-2 text-sm text-neutral-500">Acesso exclusivo do administrador da plataforma.</p>

      {deniedEmail && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          A conta {deniedEmail} não tem acesso de administrador — foi desconectada. Entre com a conta certa abaixo.
        </p>
      )}

      <div className="mt-8">
        <LoginForm />
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
    </main>
  );
}
