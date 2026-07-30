// app/loja/[slug]/layout.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { currentStore, withStore } from "@/lib/tenant";
import { currentCustomer } from "@/lib/customer";
import { getCartWithItems } from "@/lib/cart";
import { r2Url } from "@/lib/r2";

function CartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="21" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="18" cy="21" r="1.25" fill="currentColor" stroke="none" />
      <path d="M2.5 3h2l2.2 12.1a2 2 0 0 0 2 1.65h8.1a2 2 0 0 0 2-1.6L21 8H6" />
    </svg>
  );
}

function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function LojaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const store = await currentStore();
  if (!store) notFound();

  const session = await auth();
  const { cart, customer } = await withStore(async () => {
    const customer = await currentCustomer(session?.user?.email);
    const cart = await getCartWithItems(customer?.id ?? null);
    return { cart, customer };
  }) ?? { cart: null, customer: null };

  const count = cart?.items.reduce((n, i) => n + i.qty, 0) ?? 0;
  const base = `/loja/${store.slug}`;
  const logoUrl = store.logoKey ? r2Url(store.logoKey) : null;

  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-stone-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <nav className="flex items-center gap-5 text-sm text-stone-600">
            {customer ? (
              <Link href={`${base}/perfil`} aria-label="Meu perfil">
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt=""
                    className="size-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex size-8 items-center justify-center rounded-full bg-stone-900 text-xs font-medium text-white">
                    {initials(customer.name)}
                  </span>
                )}
              </Link>
            ) : (
              <>
                <Link href={`${base}/entrar`} className="underline-offset-2 hover:underline">
                  Entrar
                </Link>
                <Link href={`${base}/registrar`} className="underline-offset-2 hover:underline">
                  Registre-se
                </Link>
              </>
            )}
            <Link href={`${base}/carrinho`} className="relative flex items-center" aria-label="Carrinho">
              <CartIcon />
              {count > 0 && (
                <span className="absolute -right-2 -top-2 flex size-4 items-center justify-center rounded-full bg-stone-900 text-[10px] font-medium text-white">
                  {count}
                </span>
              )}
            </Link>
          </nav>

          <Link href={base} className="font-medium tracking-tight">
            {logoUrl ? (
              <Image src={logoUrl} alt={store.name} width={120} height={32} className="h-8 w-auto object-contain" />
            ) : (
              store.name
            )}
          </Link>
        </div>
      </header>
      {children}
      <footer className="mt-16 border-t border-stone-200 py-8 text-center text-xs text-stone-400">
        {store.name}
      </footer>
    </div>
  );
}
