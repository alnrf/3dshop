// app/admin/layout.tsx — barreira do painel: sem sessão OU sem loja vinculada,
// nada do admin renderiza. As actions revalidam de novo (defesa em profundidade).
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getActiveStoreId } from "@/lib/tenant";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin?callbackUrl=/admin/produtos");

  try {
    await getActiveStoreId(); // lança se o usuário não é operador de loja alguma
  } catch {
    redirect("/"); // logado mas sem vínculo: fora do admin
  }

  return (
    <div className="min-h-dvh bg-white text-neutral-900">
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <span className="text-sm font-medium">Painel da loja</span>
          <nav className="flex gap-5 text-sm text-neutral-600">
            <Link href="/admin/produtos" className="hover:underline">Produtos</Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
