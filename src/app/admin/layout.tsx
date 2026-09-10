// app/admin/layout.tsx — barreira do painel: sem sessão OU sem loja vinculada,
// nada do admin renderiza. As actions revalidam de novo (defesa em profundidade).
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActiveStoreId, PasswordChangeRequiredError, StoreNotActiveError } from "@/lib/tenant";

// Defensivo de propósito: generateMetadata roda em paralelo ao layout (mesmo
// motivo dos vários "Não autenticado" inofensivos que já vimos nos logs) —
// sem sessão/loja válida, cai no título genérico; a página real continua
// redirecionando pro login normalmente, sem relação com isso.
export async function generateMetadata(): Promise<Metadata> {
  try {
    const storeId = await getActiveStoreId();
    const store = await prisma.store.findUnique({ where: { id: storeId }, select: { name: true } });
    if (store) return { title: `${store.name} — Painel Admin` };
  } catch {
    // sem sessão/loja ativa — título genérico abaixo
  }
  return { title: "Painel Admin" };
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/entrar?callbackUrl=/admin/produtos");

  let storeSlug: string | undefined;
  try {
    const storeId = await getActiveStoreId(); // lança se o usuário não é operador de loja alguma
    storeSlug = (await prisma.store.findUnique({ where: { id: storeId }, select: { slug: true } }))?.slug;
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

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
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
            {storeSlug && (
              <Link
                href={`/loja/${storeSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                Ir à Loja ↗
              </Link>
            )}
            <form action={handleSignOut}>
              <button type="submit" className="cursor-pointer hover:underline">
                Sair
              </button>
            </form>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
