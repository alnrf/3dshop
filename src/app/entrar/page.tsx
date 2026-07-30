// app/entrar/page.tsx — botão "Login" da home. Não dá pra saber antes de
// autenticar se quem clicou é você (dono da plataforma) ou um vendedor: força
// o login e só então decide pra onde mandar.
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function EntrarRouterPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin?callbackUrl=/entrar");

  const email = session.user.email?.toLowerCase();
  const user = email
    ? await prisma.user.findUnique({ where: { email }, include: { memberships: { take: 1 } } })
    : null;

  if (user?.platformRole === "admin") redirect("/plataforma/lojas");
  if (user?.memberships[0]) redirect("/admin/produtos");
  redirect("/");
}
