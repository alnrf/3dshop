// app/admin/actions/products.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStoreAccess, getActiveStoreId } from "@/lib/tenant";
import { runWithStore } from "@/lib/tenant-context";
import { createUploadUrl } from "@/lib/r2";

const ProductSchema = z.object({
  name: z.string().min(1, "Informe o nome"),
  slug: z.string().min(1),
  description: z.string().optional(),
  material: z.string().optional(),
  printTime: z.string().optional(),
  priceCents: z.number().int().positive("Preço inválido"),
  stock: z.number().int().min(0, "Estoque inválido"),
  weightGrams: z.number().int().positive("Peso é necessário para o frete"),
  widthCm: z.number().int().positive("Largura é necessária para o frete"),
  heightCm: z.number().int().positive("Altura é necessária para o frete"),
  lengthCm: z.number().int().positive("Comprimento é necessário para o frete"),
  active: z.boolean(),
  imageKeys: z.array(z.string()).default([]),
});

export type ProductInput = z.input<typeof ProductSchema>;
export type ProductResult = { ok: true; id: string } | { ok: false; error: string };

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function revalidateProducts() {
  revalidatePath("/admin/produtos");
  revalidatePath("/loja", "layout"); // vitrine do tenant
}

/** Exige que o usuário seja operador de alguma loja antes de assinar o upload. */
export async function getUploadUrlAction(contentType: string) {
  const storeId = await getActiveStoreId();
  await requireStoreAccess(storeId);
  if (!contentType.startsWith("image/")) {
    return { ok: false as const, error: "O arquivo precisa ser uma imagem" };
  }
  // Refinamento possível: prefixar a key com storeId para isolar o storage.
  const { url, key } = await createUploadUrl(contentType);
  return { ok: true as const, url, key };
}

export async function createProductAction(input: ProductInput): Promise<ProductResult> {
  const storeId = await getActiveStoreId();
  await requireStoreAccess(storeId);

  const parsed = ProductSchema.safeParse({
    ...input,
    slug: input.slug || slugify(String(input.name)),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { imageKeys, ...data } = parsed.data;

  return runWithStore(storeId, async () => {
    try {
      const product = await prisma.product.create({
        // storeId é injetado pela extensão de tenant
        data: {
          ...data,
          images: { create: imageKeys.map((key, i) => ({ r2Key: key, position: i })) },
        },
      });
      revalidateProducts();
      return { ok: true, id: product.id };
    } catch {
      return { ok: false, error: "Não foi possível salvar — o slug já existe nesta loja?" };
    }
  });
}

export async function updateProductAction(
  id: string,
  input: ProductInput,
): Promise<ProductResult> {
  const storeId = await getActiveStoreId();
  await requireStoreAccess(storeId);

  const parsed = ProductSchema.safeParse({
    ...input,
    slug: input.slug || slugify(String(input.name)),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { imageKeys, ...data } = parsed.data;

  return runWithStore(storeId, async () => {
    // findUnique é validado pela extensão: retorna null se for de outra loja
    const owned = await prisma.product.findUnique({ where: { id } });
    if (!owned) return { ok: false, error: "Produto não encontrado" };

    try {
      await prisma.product.update({
        where: { id },
        data: {
          ...data,
          images: {
            deleteMany: {},
            create: imageKeys.map((key, i) => ({ r2Key: key, position: i })),
          },
        },
      });
      revalidateProducts();
      return { ok: true, id };
    } catch {
      return { ok: false, error: "Não foi possível salvar — o slug já existe nesta loja?" };
    }
  });
}

/** Ativa/desativa via <form>. updateMany é escopado pela extensão (where + storeId). */
export async function toggleActiveFormAction(formData: FormData) {
  const storeId = await getActiveStoreId();
  await requireStoreAccess(storeId);
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";

  await runWithStore(storeId, async () => {
    await prisma.product.updateMany({ where: { id }, data: { active } });
    revalidateProducts();
  });
}

/** Exclui; se já houve vendas, apenas desativa para preservar o histórico. */
export async function deleteProductFormAction(formData: FormData) {
  const storeId = await getActiveStoreId();
  await requireStoreAccess(storeId);
  const id = String(formData.get("id"));

  await runWithStore(storeId, async () => {
    const owned = await prisma.product.findUnique({ where: { id } });
    if (!owned) return;

    const sold = await prisma.orderItem.count({ where: { productId: id } });
    if (sold > 0) {
      await prisma.product.updateMany({ where: { id }, data: { active: false } });
    } else {
      await prisma.product.deleteMany({ where: { id } });
    }
    revalidateProducts();
  });
}
