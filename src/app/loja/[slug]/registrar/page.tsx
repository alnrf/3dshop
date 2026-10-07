// app/loja/[slug]/registrar/page.tsx
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { currentStore, withStore } from "@/lib/tenant";
import { currentCustomer } from "@/lib/customer";
import { RegisterForm } from "./register-form";

export default async function RegistrarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const store = await currentStore();
  if (!store) notFound();
  const base = `/loja/${store.slug}`;
  const { next } = await searchParams;
  const safeNext = next && next.startsWith(base) ? next : null;

  // Mesma checagem de entrar/page.tsx: só redireciona se já for Customer
  // DESTA loja, não apenas por ter alguma sessão (operador logado no /admin
  // com a mesma conta não deve ser barrado de se cadastrar como cliente).
  const session = await auth();
  const customer = await withStore(() => currentCustomer(session?.user?.email));
  if (customer) redirect(safeNext ?? base);

  return (
    <main className="mx-auto max-w-sm px-4 py-16 text-center">
      <h1 className="text-xl font-medium">Criar conta</h1>
      <p className="mt-2 text-sm text-stone-500">
        Cadastre-se para acompanhar seus pedidos em {store.name}.
      </p>

      <div className="mt-8">
        <RegisterForm storeSlug={store.slug} base={base} next={safeNext} />
      </div>

      <p className="mt-6 text-xs text-stone-400">
        Já tem conta?{" "}
        <Link
          href={safeNext ? `${base}/entrar?next=${encodeURIComponent(safeNext)}` : `${base}/entrar`}
          className="underline-offset-2 hover:underline"
        >
          Entrar
        </Link>
      </p>
    </main>
  );
}
