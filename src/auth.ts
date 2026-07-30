// src/auth.ts — Auth.js v5, sessão JWT (stateless), Google.
// A identidade de login carrega só e-mail/nome. QUEM ela é dentro de cada área
// é resolvido no server a cada request: operador via Membership (lib/tenant),
// comprador via Customer por loja (lib/customer). Nada de id de tenant no token.
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Google,
    // Login por e-mail/senha provisória (onboarding self-service). Google
    // continua sendo a via principal; esta é só para quem entrou pelo cadastro.
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        if (!verifyPassword(password, user.passwordHash)) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
    // Login do comprador por e-mail/senha, por loja. Resolve a Store direto
    // via prisma (não importar lib/tenant aqui: geraria import circular, já
    // que lib/tenant importa `auth` deste arquivo).
    Credentials({
      id: "customer",
      credentials: { email: {}, password: {}, storeSlug: {} },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").toLowerCase();
        const password = String(credentials?.password ?? "");
        const storeSlug = String(credentials?.storeSlug ?? "");
        if (!email || !password || !storeSlug) return null;

        const store = await prisma.store.findUnique({ where: { slug: storeSlug } });
        if (!store || store.status !== "active") return null;

        const customer = await prisma.customer.findUnique({
          where: { storeId_email: { storeId: store.id, email } },
        });
        if (!customer?.passwordHash) return null;
        if (!verifyPassword(password, customer.passwordHash)) return null;

        return { id: customer.id, email: customer.email, name: customer.name };
      },
    }),
  ],
  callbacks: {
    // Não colocar dados sensíveis/tenant no token: ele vive no cookie do cliente.
    session({ session }) {
      return session;
    },
  },
});
