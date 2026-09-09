// app/loja/[slug]/esqueci-senha/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { currentStore } from "@/lib/tenant";
import { ForgotPasswordForm } from "./forgot-password-form";

export default async function EsqueciSenhaPage() {
  const store = await currentStore();
  if (!store) notFound();
  const base = `/loja/${store.slug}`;

  return (
    <main className="mx-auto max-w-sm px-4 py-16 text-center">
      <h1 className="text-xl font-medium">Esqueci minha senha</h1>
      <p className="mt-2 text-sm text-stone-500">
        Informe seu e-mail — se ele estiver cadastrado, enviamos um link para redefinir a senha.
      </p>

      <div className="mt-8">
        <ForgotPasswordForm storeSlug={store.slug} />
      </div>

      <p className="mt-6 text-xs text-stone-400">
        <Link href={`${base}/entrar`} className="underline-offset-2 hover:underline">
          ← Voltar para o login
        </Link>
      </p>
    </main>
  );
}
