// app/admin/actions/branding.ts — logotipo da loja, exibido no navbar do storefront.
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStoreAccess, getActiveStoreId } from "@/lib/tenant";
import { createUploadUrl } from "@/lib/r2";

export async function getLogoUploadUrlAction(contentType: string) {
  const storeId = await getActiveStoreId();
  await requireStoreAccess(storeId);
  if (!contentType.startsWith("image/")) {
    return { ok: false as const, error: "O arquivo precisa ser uma imagem" };
  }
  const { url, key } = await createUploadUrl(contentType, "stores");
  return { ok: true as const, url, key };
}

export type SaveLogoResult = { ok: true } | { ok: false; error: string };

export async function saveLogoAction(logoKey: string): Promise<SaveLogoResult> {
  const storeId = await getActiveStoreId();
  await requireStoreAccess(storeId);

  await prisma.store.update({ where: { id: storeId }, data: { logoKey } });
  revalidatePath("/admin/configuracoes/loja");
  revalidatePath("/loja", "layout");
  return { ok: true };
}
