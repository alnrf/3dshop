// lib/prisma.ts
import { PrismaClient } from "@prisma/client";
import { currentStoreId } from "./tenant-context";

// Models que carregam storeId. A extensão filtra/injeta o tenant só nestes.
const TENANT_MODELS = new Set(["Product", "Customer", "Cart", "Order"]);

// Operações cujo `where` pode receber storeId com segurança.
const WHERE_SCOPED = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "deleteMany",
]);

function makeClient() {
  return new PrismaClient().$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const storeId = currentStoreId();
          if (!storeId || !TENANT_MODELS.has(model)) return query(args);
          const a = args as Record<string, any>;

          // create/createMany: injeta storeId no data se ausente
          if (operation === "create" || operation === "createMany") {
            const data = a.data;
            if (Array.isArray(data)) data.forEach((d) => (d.storeId ??= storeId));
            else if (data) data.storeId ??= storeId;
            return query(args);
          }

          // where escopável: adiciona storeId
          if (WHERE_SCOPED.has(operation)) {
            a.where = { ...a.where, storeId };
            return query(args);
          }

          // findUnique: where é por campo único, então valida no resultado
          if (operation === "findUnique" || operation === "findUniqueOrThrow") {
            const res: any = await query(args);
            if (res && res.storeId != null && res.storeId !== storeId) return null;
            return res;
          }

          // update/delete/upsert por id ficam de fora: use as variantes *Many
          // (updateMany/deleteMany) para que o filtro de tenant seja aplicado.
          return query(args);
        },
      },
    },
  });
}

const g = globalThis as unknown as { prisma?: ReturnType<typeof makeClient> };
export const prisma = g.prisma ?? makeClient();
if (process.env.NODE_ENV !== "production") g.prisma = prisma;
