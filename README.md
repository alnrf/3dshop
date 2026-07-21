# Loja 3D — multi-tenant (modelo A)

E-commerce de impressões 3D: Next.js App Router full-stack, Postgres + Prisma,
storage S3-compatível (MinIO em dev, Cloudflare R2 em produção), Auth.js v5.

- Vitrine: `/loja/minha-loja` · Carrinho persistido (convidado via cookie httpOnly,
  merge no login) · Painel: `/admin/produtos`
- Multi-tenant desde o dia 1: `Store` + `Membership` + scoping automático por
  `storeId` via Prisma Client Extension (`src/lib/prisma.ts`).

## Rodar

1. Infra no mini server: veja `DEPLOY-DEV.md`
2. `cp .env.example .env` e preencha
3. `npm install`
4. `npx prisma generate && npm run db:migrate -- --name init && npm run db:seed`
5. `npm run dev`

## Segurança (decisões)

- **Isolamento por tenant**: toda query de dados de loja roda dentro de
  `runWithStore`; a extensão do Prisma injeta/valida `storeId` (inclusive em
  `findUnique`, que devolve `null` para registro de outra loja).
- **Identidades separadas**: login (Auth.js) ≠ identidade de negócio. Operador é
  `User` + `Membership` (checado por `requireStoreAccess`); comprador é `Customer`
  **por loja** (`ensureCustomer`), então carrinho/pedidos nunca cruzam tenants.
- **Token JWT limpo**: o cookie de sessão carrega só e-mail/nome — nenhum id de
  tenant ou papel; autorização é resolvida no server a cada request.
- **Cookies**: sessão (Auth.js) e `cart_token` são httpOnly + SameSite=Lax.
- **Admin barrado no layout** e revalidado em cada server action (defesa em
  profundidade). Upload só via URL assinada (60 s), sem passar pelo server.

## Pendências conhecidas

- Login e-mail/senha, Apple, Facebook (hoje: Google)
- Checkout + Mercado Pago · Frete (Melhor Envio) · E-mails (Resend)
- Encomenda com sinal (QuoteRequest) · Painel de pedidos
