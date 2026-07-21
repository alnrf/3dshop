// prisma/seed.ts
// Cria a sua loja como primeiro tenant, você como admin de plataforma, e o
// vínculo owner entre os dois. Usa o client cru (sem scoping) de propósito:
// Store/User/Membership não são models de tenant.
import { PrismaClient, MemberRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  if (!email) throw new Error("Defina SEED_ADMIN_EMAIL");

  const store = await prisma.store.upsert({
    where: { slug: "minha-loja" },
    update: {},
    create: { slug: "minha-loja", name: "Minha Loja 3D", plan: "pro" },
  });

  const user = await prisma.user.upsert({
    where: { email },
    update: { platformRole: "admin" },
    create: { email, platformRole: "admin" },
  });

  await prisma.membership.upsert({
    where: { userId_storeId: { userId: user.id, storeId: store.id } },
    update: {},
    create: { userId: user.id, storeId: store.id, role: MemberRole.owner },
  });

  console.log("Seed ok:", { store: store.slug, admin: user.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
