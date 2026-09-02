---
name: stripe-assinatura-setup
description: Configura o Stripe Billing para a assinatura do plano Pro da plataforma (cobrar o LOJISTA, não o cliente final da loja). Use quando o usuário pedir para "configurar o Stripe", "ativar a assinatura", "terminar o plano Pro", "testar upgrade/cancelamento de plano", ou continuar o trabalho iniciado em app/admin/plano.
---

# Assinatura Pro via Stripe Billing

O código já está todo pronto e commitado — o que falta é só a configuração no
lado do Stripe (conta, produto, chaves) e preencher três variáveis de
ambiente. Este documento existe pra retomar esse trabalho sem precisar
reconstruir o contexto do zero.

**Não confundir dois pagamentos diferentes que existem no projeto:**
- `Store.paymentConfig` (`/admin/configuracoes/pagamentos`) = a LOJA cobrando
  o cliente final dela. Já existia antes, outro assunto.
- Esta skill = a PLATAFORMA cobrando o LOJISTA pela assinatura do plano Pro.
  Conta Stripe própria da plataforma, nada a ver com a de cada loja.

## O que já está implementado

- `prisma/schema.prisma` — `Store.stripeCustomerId`, `stripeSubscriptionId`,
  `subscriptionStatus` (migration `add_store_stripe_subscription` já aplicada
  no banco compartilhado).
- `src/lib/stripe.ts` — client Stripe + `isStripeConfigured()`.
- `src/lib/plans.ts` — `productLimitForPlan` (free = 10 produtos, qualquer
  outro plano = ilimitado) e `downgradeStoreToFree` (mantém ativos os 10
  produtos mais antigos, desativa o resto — nunca exclui).
- `src/app/admin/actions/subscription.ts` — `startCheckoutAction` (Stripe
  Checkout hospedado) e `manageSubscriptionAction` (Stripe Customer Portal,
  de onde o lojista troca cartão ou cancela).
- `src/app/admin/plano/` — página do lojista (`page.tsx` + `plan-actions.tsx`).
- `src/app/api/webhooks/stripe/route.ts` — única fonte de verdade que muda
  `Store.plan`; nunca o redirect de volta do Checkout. Trata
  `checkout.session.completed`, `customer.subscription.created/updated`
  (ativa Pro ou rebaixa se `past_due`/`unpaid`) e `customer.subscription.deleted`
  (cancelamento → `downgradeStoreToFree`).
- `app/plataforma/actions/stores.ts` `updateStorePlanAction` — troca manual de
  plano pelo admin da plataforma continua funcionando independente do Stripe
  (usa a mesma `downgradeStoreToFree` ao voltar pro free).

Sem as três variáveis abaixo configuradas, `/admin/plano` funciona mas mostra
"assinatura self-service ainda não disponível" e os botões ficam desabilitados
— nada quebra, é o fallback esperado (`isStripeConfigured()`).

## Passo a passo no dashboard do Stripe

Rode você mesmo o que der (CLI, edição de `.env`); pare e pergunte ao usuário
só quando precisar de uma decisão de conta/cobrança real dele (ex.: valor do
plano, se é teste ou produção).

1. **Conta**: [dashboard.stripe.com](https://dashboard.stripe.com) — modo
   **teste** (toggle no canto superior) é suficiente pra desenvolver.
2. **Produto + preço**: Product catalog → "+ Add product" → nome "Plano Pro"
   → em Pricing, marque **Recurring** (mensal, valor que o usuário decidir) →
   salvar → copiar o **Price ID** (`price_...`) da variante criada.
3. **Chave secreta**: Developers → API keys → copiar a **Secret key**
   (`sk_test_...` em modo teste).
4. **Webhook**:
   - **Em dev local** (Stripe não alcança `localhost`): instalar a
     [Stripe CLI](https://stripe.com/docs/stripe-cli), `stripe login`, depois
     rodar em background:
     ```
     stripe listen --forward-to localhost:3000/api/webhooks/stripe
     ```
     Ela imprime um `whsec_...` — esse é o `STRIPE_WEBHOOK_SECRET` local.
     Precisa ficar rodando enquanto se testa (outra aba/processo).
   - **Em produção**: Developers → Webhooks → "+ Add endpoint" → URL pública
     `https://<domínio>/api/webhooks/stripe` → eventos: pelo menos
     `checkout.session.completed`, `customer.subscription.created`,
     `customer.subscription.updated`, `customer.subscription.deleted` → copiar
     o **Signing secret** de lá (também `whsec_...`, mas diferente do da CLI).
5. **Preencher `.env`** (e depois replicar no `.env.example`/no outro PC via
   `setup-outro-pc` se fizer sentido):
   ```
   STRIPE_SECRET_KEY="sk_test_..."
   STRIPE_PRICE_PRO="price_..."
   STRIPE_WEBHOOK_SECRET="whsec_..."
   ```

## Como validar que funcionou

1. Reiniciar `npm run dev` (env var novo exige restart).
2. Com a Stripe CLI rodando (`stripe listen ...`), logar como lojista em
   `/admin/plano` → "Assinar Pro" deve redirecionar pro Checkout hospedado do
   Stripe (não mais mostrar "não configurado").
3. Completar o checkout com um [cartão de teste](https://stripe.com/docs/testing)
   (`4242 4242 4242 4242`, qualquer data futura/CVC).
4. Checar no terminal da Stripe CLI que os eventos chegaram (200) e, no banco,
   que `Store.plan` virou `"pro"` para aquela loja.
5. Testar o cancelamento: em `/admin/plano` → "Gerenciar assinatura" → cancelar
   no Customer Portal → confirmar que o webhook rebaixou a loja
   (`Store.plan = "free"`) e que produtos além dos 10 mais antigos ficaram
   `active: false` (não foram excluídos).
6. Alternativa sem passar pelo Checkout de verdade: disparar eventos fake
   direto pela CLI, ex. `stripe trigger customer.subscription.deleted` (exige
   ter uma subscription de teste já criada com metadata `storeId` correto —
   mais fácil validar pelo fluxo real do passo 2-5 mesmo).

## Troubleshooting

- **Webhook responde 400 "Assinatura inválida"**: `STRIPE_WEBHOOK_SECRET` não
  bate com quem está enviando — CLI e dashboard geram segredos DIFERENTES;
  confirme qual dos dois está no `.env` conforme o ambiente (dev vs prod).
- **Checkout diz "não configurado" mesmo com as três variáveis preenchidas**:
  reiniciar o `npm run dev` — env var só é lido na subida do processo.
- **Loja não vira "pro" depois do pagamento**: olhar o log do
  `stripe listen` — se o evento não chegou 200, o problema está no webhook
  (rota errada, servidor caído); se chegou 200 mas o plano não mudou, olhar
  `metadata.storeId` no evento (deve ter sido setado em
  `subscription_data.metadata` na criação do Checkout Session, em
  `startCheckoutAction`).
