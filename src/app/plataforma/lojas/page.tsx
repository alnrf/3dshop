import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ApproveButton } from "./approve-button";
import { RejectButton } from "./reject-button";
import { DetailsLink } from "./details-link";

export default async function PlataformaLojasPage() {
  const stores = await prisma.store.findMany({
    orderBy: { createdAt: "desc" },
    include: { memberships: { where: { role: "owner" }, take: 1, include: { user: true } } },
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-2xl font-medium">Lojas</h1>

      {stores.length === 0 ? (
        <p className="mt-12 text-center text-sm text-neutral-500">Nenhuma loja cadastrada ainda.</p>
      ) : (
        <table className="mt-6 w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-neutral-500">
              <th className="border-b border-neutral-200 py-2 pr-3 font-medium">Loja</th>
              <th className="border-b border-neutral-200 px-3 py-2 font-medium">Dono</th>
              <th className="border-b border-neutral-200 px-3 py-2 font-medium">Status</th>
              <th className="border-b border-neutral-200 py-2 pl-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((store) => {
              const owner = store.memberships[0]?.user;
              return (
                <tr key={store.id} className="align-top">
                  <td className="border-b border-neutral-100 py-3 pr-3">
                    <Link href={`/plataforma/lojas/${store.id}`} className="font-medium hover:underline">
                      {store.name}
                    </Link>
                    <div className="text-xs text-neutral-500">/{store.slug}</div>
                  </td>
                  <td className="border-b border-neutral-100 px-3 py-3">
                    {owner ? `${owner.name ?? owner.email} (${owner.email})` : "—"}
                  </td>
                  <td className="border-b border-neutral-100 px-3 py-3">
                    <span
                      className={
                        store.status === "active"
                          ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                          : store.status === "pending"
                            ? "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                            : store.status === "rejected"
                              ? "rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
                              : "rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600"
                      }
                    >
                      {store.status}
                    </span>
                  </td>
                  <td className="border-b border-neutral-100 py-3 pl-3">
                    <div className="flex items-center gap-1">
                      {store.status === "pending" && (
                        <>
                          <ApproveButton storeId={store.id} />
                          <RejectButton storeId={store.id} />
                        </>
                      )}
                      {store.status === "active" && <DetailsLink storeId={store.id} />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}
