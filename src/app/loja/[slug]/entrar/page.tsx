// app/loja/[slug]/entrar/page.tsx
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth, signIn } from "@/auth";
import { currentStore, withStore } from "@/lib/tenant";
import { currentCustomer } from "@/lib/customer";
import { LoginForm } from "./login-form";

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const store = await currentStore();
  if (!store) notFound();
  const base = `/loja/${store.slug}`;
  const { next } = await searchParams;
  const safeNext = next && next.startsWith(base) ? next : null;

  // Checa se já é Customer DESTA loja — não basta ter sessão: um operador
  // logado no /admin (mesma conta Google) também tem `session.user`, mas não
  // é cliente da própria loja, e não pode ser barrado daqui.
  const session = await auth();
  const customer = await withStore(() => currentCustomer(session?.user?.email));
  if (customer) redirect(safeNext ?? base);

  async function loginGoogle() {
    "use server";
    // Pós-login passa por /pos-login, que funde o carrinho de convidado.
    const redirectTo = safeNext
      ? `${base}/pos-login?next=${encodeURIComponent(safeNext)}`
      : `${base}/pos-login`;
    await signIn("google", { redirectTo });
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-16 text-center">
      <h1 className="text-xl font-medium">Entrar</h1>
      <p className="mt-2 text-sm text-stone-500">
        Seu carrinho será mantido ao entrar.
      </p>

      <div className="mt-8">
        <LoginForm storeSlug={store.slug} base={base} next={safeNext} />
      </div>

      <div className="mt-6 flex items-center gap-3 text-xs text-stone-400">
        <span className="h-px flex-1 bg-stone-200" />
        ou
        <span className="h-px flex-1 bg-stone-200" />
      </div>

      <form action={loginGoogle} className="mt-6">
        <button className="h-12 w-full rounded-lg border border-stone-300 bg-white text-sm font-medium hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
          Continuar com Google
        </button>
      </form>

      <p className="mt-6 text-xs text-stone-400">
        Ainda não tem conta?{" "}
        <Link
          href={safeNext ? `${base}/registrar?next=${encodeURIComponent(safeNext)}` : `${base}/registrar`}
          className="underline-offset-2 hover:underline"
        >
          Cadastre-se
        </Link>
      </p>
    </main>
  );
}
