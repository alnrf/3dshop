// app/loja/[slug]/layout.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { currentStore, withStore } from "@/lib/tenant";
import { currentCustomer } from "@/lib/customer";
import { getCartWithItems } from "@/lib/cart";

export default async function LojaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const store = await currentStore();
  if (!store) notFound();

  const session = await auth();
  const cart = await withStore(async () => {
    const customer = await currentCustomer(session?.user?.email);
    return getCartWithItems(customer?.id ?? null);
  });
  const count = cart?.items.reduce((n, i) => n + i.qty, 0) ?? 0;
  const base = `/loja/${store.slug}`;

  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-stone-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href={base} className="font-medium tracking-tight">
            {store.name}
          </Link>
          <nav className="flex items-center gap-5 text-sm text-stone-600">
            {session?.user ? (
              <span className="hidden sm:inline">{session.user.name?.split(" ")[0]}</span>
            ) : (
              <Link href={`${base}/entrar`} className="underline-offset-2 hover:underline">
                Entrar
              </Link>
            )}
            <Link href={`${base}/carrinho`} className="underline-offset-2 hover:underline">
              Carrinho{count > 0 ? ` (${count})` : ""}
            </Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="mt-16 border-t border-stone-200 py-8 text-center text-xs text-stone-400">
        {store.name}
      </footer>
    </div>
  );
}
