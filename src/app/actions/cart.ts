// app/actions/cart.ts
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { withStore } from "@/lib/tenant";
import { currentCustomer } from "@/lib/customer";
import { addToCart, setItemQty, removeItem } from "@/lib/cart";

export type CartActionResult = { ok: true } | { ok: false; error: string };

function revalidateCart() {
  revalidatePath("/loja", "layout");
}

function toMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Não foi possível atualizar o carrinho";
}

// Dentro do contexto de tenant: mapeia a sessão para o Customer DESTA loja.
// Se a pessoa está logada mas nunca comprou aqui, trata como convidado (cookie).
async function run(
  fn: (customerId: string | null) => Promise<unknown>,
): Promise<CartActionResult> {
  try {
    const session = await auth();
    const done = await withStore(async () => {
      const customer = await currentCustomer(session?.user?.email);
      return fn(customer?.id ?? null);
    });
    if (done === null) return { ok: false, error: "Loja não encontrada" };
    revalidateCart();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toMessage(e) };
  }
}

export async function addToCartAction(productId: string, qty: number = 1) {
  return run((customerId) => addToCart(productId, qty, customerId));
}

export async function updateItemQtyAction(productId: string, qty: number) {
  return run((customerId) => setItemQty(productId, qty, customerId));
}

export async function removeItemAction(productId: string) {
  return run((customerId) => removeItem(productId, customerId));
}
