// app/loja/[slug]/registrar/page.tsx
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { currentStore } from "@/lib/tenant";
import { RegisterForm } from "./register-form";

export default async function RegistrarPage() {
  const store = await currentStore();
  if (!store) notFound();
  const base = `/loja/${store.slug}`;

  const session = await auth();
  if (session?.user) redirect(base);

  return (
    <main className="mx-auto max-w-sm px-4 py-16 text-center">
      <h1 className="text-xl font-medium">Criar conta</h1>
      <p className="mt-2 text-sm text-stone-500">
        Cadastre-se para acompanhar seus pedidos em {store.name}.
      </p>

      <div className="mt-8">
        <RegisterForm storeSlug={store.slug} base={base} />
      </div>

      <p className="mt-6 text-xs text-stone-400">
        Já tem conta?{" "}
        <Link href={`${base}/entrar`} className="underline-offset-2 hover:underline">
          Entrar
        </Link>
      </p>
    </main>
  );
}
