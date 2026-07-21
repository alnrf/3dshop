// src/auth.ts — Auth.js v5, sessão JWT (stateless), Google.
// A identidade de login carrega só e-mail/nome. QUEM ela é dentro de cada área
// é resolvido no server a cada request: operador via Membership (lib/tenant),
// comprador via Customer por loja (lib/customer). Nada de id de tenant no token.
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [Google],
  callbacks: {
    // Não colocar dados sensíveis/tenant no token: ele vive no cookie do cliente.
    session({ session }) {
      return session;
    },
  },
});
