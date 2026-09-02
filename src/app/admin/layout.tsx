// app/admin/layout.tsx — barreira do painel: sem sessão OU sem loja vinculada,
// nada do admin renderiza. As actions revalidam de novo (defesa em profundidade).
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getActiveStoreId, PasswordChangeRequiredError, StoreNotActiveError } from "@/lib/tenant";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin?callbackUrl=/admin/produtos");

  try {
    await getActiveStoreId(); // lança se o usuário não é operador de loja alguma
  } catch (e) {
    if (e instanceof PasswordChangeRequiredError) redirect("/mudar-senha");
    if (e instanceof StoreNotActiveError) {
      return (
        <main className="mx-auto max-w-sm px-6 py-16 text-center">
          <h1 className="text-xl font-medium">Sua loja está em análise</h1>
          <p className="mt-3 text-sm text-neutral-600">
            {e.status === "pending"
              ? "Recebemos seu cadastro e vamos avisar por e-mail assim que a loja for aprovada."
              : "O acesso a esta loja está suspenso no momento."}
          </p>
        </main>
      );
    }
    redirect("/"); // logado mas sem vínculo: fora do admin
  }

  return (
    <div className="min-h-dvh bg-white text-neutral-900">
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <span className="text-sm font-medium">Painel da loja</span>
          <nav className="flex gap-5 text-sm text-neutral-600">
            <Link href="/admin/produtos" className="hover:underline">Produtos</Link>
            <Link href="/admin/configuracoes/loja" className="hover:underline">Loja</Link>
            <Link href="/admin/configuracoes/pagamentos" className="hover:underline">Pagamentos</Link>
            <Link href="/admin/configuracoes/frete" className="hover:underline">Frete</Link>
            <Link href="/admin/plano" className="hover:underline">Plano</Link>
            <Link href="/admin/perfil" className="hover:underline">Perfil</Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
