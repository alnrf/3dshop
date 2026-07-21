// lib/cart.ts
// Carrinho server-side para o App Router.
// Convidado -> cookie httpOnly `cart_token` aponta para um Cart com customerId = null.
// Login    -> mergeGuestCartIntoUser() funde o cart de convidado no cart do usuário.
//
// IMPORTANTE: funções que ESCREVEM cookie (getOrCreateCart quando cria convidado,
// e mergeGuestCartIntoUser) só funcionam dentro de Server Actions ou Route Handlers.
// Leitura (getCartWithItems) pode rodar em Server Components.

import { cookies } from "next/headers";
import { prisma } from "./prisma";

const CART_COOKIE = "cart_token";
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 dias
};

async function readCartToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(CART_COOKIE)?.value ?? null;
}

async function writeCartToken(token: string) {
  const store = await cookies();
  store.set(CART_COOKIE, token, COOKIE_OPTS);
}

async function clearCartToken() {
  const store = await cookies();
  store.delete(CART_COOKIE);
}

/**
 * Resolve o carrinho ativo:
 *  - logado  -> 1 cart por customerId (cria se não existir)
 *  - convidado -> cart pelo token do cookie (cria + seta cookie se não existir)
 * Use em Server Action / Route Handler quando puder criar (escreve cookie).
 */
export async function getOrCreateCart(customerId?: string | null) {
  if (customerId) {
    return prisma.cart.upsert({
      where: { customerId },
      create: { customerId },
      update: {},
    });
  }

  const token = await readCartToken();
  if (token) {
    const existing = await prisma.cart.findUnique({ where: { token } });
    if (existing) return existing;
  }

  const cart = await prisma.cart.create({ data: {} }); // token gerado pelo @default(cuid())
  await writeCartToken(cart.token);
  return cart;
}

/** Carrinho com itens + produto, para exibição. Seguro em Server Component. */
export async function getCartWithItems(customerId?: string | null) {
  const where = customerId
    ? { customerId }
    : { token: (await readCartToken()) ?? "__none__" };

  const cart = await prisma.cart.findUnique({
    where,
    include: {
      items: {
        include: {
          product: {
            include: { images: { orderBy: { position: "asc" }, take: 1 } },
          },
        },
      },
    },
  });
  if (!cart) return { id: null, items: [], totalCents: 0 };

  // Filtra produtos inativos e calcula total com preço ATUAL do produto
  const items = cart.items.filter((i) => i.product.active);
  const totalCents = items.reduce(
    (sum, i) => sum + i.product.priceCents * i.qty,
    0,
  );
  return { id: cart.id, items, totalCents };
}

/** Adiciona (ou incrementa) um item, respeitando estoque. Server Action / Route Handler. */
export async function addToCart(
  productId: string,
  qty: number,
  customerId?: string | null,
) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.active) throw new Error("Produto indisponível");

  const cart = await getOrCreateCart(customerId);
  const current = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
  });

  const nextQty = Math.min((current?.qty ?? 0) + qty, product.stock);
  if (nextQty <= 0) throw new Error("Sem estoque");

  return prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    create: { cartId: cart.id, productId, qty: nextQty },
    update: { qty: nextQty },
  });
}

export async function setItemQty(
  productId: string,
  qty: number,
  customerId?: string | null,
) {
  const cart = await getOrCreateCart(customerId);
  if (qty <= 0) {
    return prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
  }
  const product = await prisma.product.findUnique({ where: { id: productId } });
  const capped = Math.min(qty, product?.stock ?? 0);
  return prisma.cartItem.update({
    where: { cartId_productId: { cartId: cart.id, productId } },
    data: { qty: capped },
  });
}

export async function removeItem(productId: string, customerId?: string | null) {
  const cart = await getOrCreateCart(customerId);
  return prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
}

/**
 * Funde o carrinho de convidado (cookie) no carrinho do usuário recém-logado.
 * Chame logo após o login bem-sucedido (ex.: callback signIn do Auth.js).
 * Soma quantidades, respeita estoque, descarta produto inativo e limpa o cookie.
 */
export async function mergeGuestCartIntoUser(customerId: string) {
  const token = await readCartToken();
  if (!token) return; // nada para fundir

  const guest = await prisma.cart.findUnique({
    where: { token },
    include: { items: true },
  });
  // Carrinho de convidado de verdade (não já vinculado a alguém)
  if (!guest || guest.customerId) {
    await clearCartToken();
    return;
  }

  const userCart = await prisma.cart.upsert({
    where: { customerId },
    create: { customerId },
    update: {},
  });

  for (const item of guest.items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
    });
    if (!product || !product.active) continue; // descarta inativo

    const existing = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: userCart.id, productId: item.productId } },
    });
    const merged = Math.min((existing?.qty ?? 0) + item.qty, product.stock);
    if (merged <= 0) continue;

    await prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: userCart.id, productId: item.productId } },
      create: { cartId: userCart.id, productId: item.productId, qty: merged },
      update: { qty: merged },
    });
  }

  await prisma.cart.delete({ where: { id: guest.id } });
  await clearCartToken(); // a partir daqui o carrinho é resolvido por customerId
}
