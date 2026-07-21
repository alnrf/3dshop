// app/loja/[slug]/pos-login/route.ts
// Destino do redirect pós-login no storefront. Garante o Customer desta loja e
// funde o carrinho de convidado (cookie) no carrinho do comprador. Depois volta
// à vitrine. Idempotente: chegar aqui já logado sem cookie de carrinho é no-op.
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { currentStore, withStore } from "@/lib/tenant";
import { ensureCustomer } from "@/lib/customer";
import { mergeGuestCartIntoUser } from "@/lib/cart";

export async function GET(req: NextRequest) {
  const store = await currentStore();
  if (!store) return NextResponse.redirect(new URL("/", req.url));
  const base = new URL(`/loja/${store.slug}`, req.url);

  const session = await auth();
  const email = session?.user?.email;
  if (email) {
    await withStore(async () => {
      const customer = await ensureCustomer(email, session.user?.name);
      await mergeGuestCartIntoUser(customer.id);
    });
  }
  return NextResponse.redirect(base);
}
