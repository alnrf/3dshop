// app/admin/admin-nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin/produtos", label: "Produtos" },
  { href: "/admin/cupons", label: "Cupons" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/configuracoes/loja", label: "Loja" },
  { href: "/admin/configuracoes/pagamentos", label: "Pagamentos" },
  { href: "/admin/configuracoes/frete", label: "Frete" },
  { href: "/admin/plano", label: "Plano" },
  { href: "/admin/perfil", label: "Perfil" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <>
      {LINKS.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "font-medium text-neutral-900 underline underline-offset-4"
                : "text-neutral-600 hover:underline"
            }
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}
