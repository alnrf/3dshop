import type { Metadata } from "next";
import { SAAS_NAME } from "@/lib/config";
import "./globals.css";

// Título padrão — /loja/[slug], /admin e /plataforma sobrescrevem o deles
// (nome da loja, "<loja> — Painel Admin", "<SaaS> — Painel Admin").
export const metadata: Metadata = {
  title: SAAS_NAME,
  description: "Impressões 3D sob medida",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
