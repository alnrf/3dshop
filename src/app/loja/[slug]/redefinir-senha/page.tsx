// app/loja/[slug]/redefinir-senha/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { currentStore } from "@/lib/tenant";
import { ResetPasswordForm } from "./reset-password-form";

export default async function RedefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const store = await currentStore();
  if (!store) notFound();
  const base = `/loja/${store.slug}`;
  const { token } = await searchParams;

  if (!token) {
    return (
      <main className="mx-auto max-w-sm px-4 py-16 text-center">
        <h1 className="text-xl font-medium">Link inválido</h1>
        <p className="mt-2 text-sm text-stone-500">
          Esse link de redefinição está incompleto. Peça um novo em{" "}
          <Link href={`${base}/esqueci-senha`} className="underline-offset-2 hover:underline">
            esqueci minha senha
          </Link>
          .
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-16 text-center">
      <h1 className="text-xl font-medium">Nova senha</h1>
      <p className="mt-2 text-sm text-stone-500">Escolha uma nova senha para sua conta.</p>

      <div className="mt-8">
        <ResetPasswordForm storeSlug={store.slug} token={token} base={base} />
      </div>
    </main>
  );
}
