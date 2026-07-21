// app/loja/[slug]/entrar/page.tsx
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { auth, signIn } from "@/auth";
import { currentStore } from "@/lib/tenant";

export default async function EntrarPage() {
  const store = await currentStore();
  if (!store) notFound();
  const base = `/loja/${store.slug}`;

  const session = await auth();
  if (session?.user) redirect(base);

  async function loginGoogle() {
    "use server";
    // Pós-login passa por /pos-login, que funde o carrinho de convidado.
    await signIn("google", { redirectTo: `${base}/pos-login` });
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-16 text-center">
      <h1 className="text-xl font-medium">Entrar</h1>
      <p className="mt-2 text-sm text-stone-500">
        Seu carrinho será mantido ao entrar.
      </p>
      <form action={loginGoogle} className="mt-8">
        <button className="h-12 w-full rounded-lg border border-stone-300 bg-white text-sm font-medium hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
          Continuar com Google
        </button>
      </form>
      <p className="mt-6 text-xs text-stone-400">
        Login com e-mail/senha, Apple e Facebook: em breve.
      </p>
    </main>
  );
}
