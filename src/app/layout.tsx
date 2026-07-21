import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Loja 3D",
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
