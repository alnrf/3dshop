---
name: setup-outro-pc
description: Configura e sobe o projeto Loja 3D (Next.js + Prisma + MinIO) numa máquina nova, conectando na infra compartilhada do MiniDeskServer (192.168.50.92). Use quando o usuário pedir para preparar/rodar/clonar este projeto em outro PC, "configura esse repo aqui", "clonei e preciso rodar", ou algo do tipo em uma máquina que ainda não tem o ambiente pronto.
---

# Setup do Loja 3D em outra máquina

Este projeto é multi-tenant (Next.js App Router + Prisma + Postgres + storage
S3-compatível). Em dev, **Postgres e MinIO não rodam localmente** — eles ficam
no MiniDeskServer (`192.168.50.92`) via Docker Compose (`docker-compose.yml`)
e são compartilhados por qualquer PC que rode o app. O objetivo aqui é só
preparar *este* PC como mais um cliente dessa infra — não recriar o banco.

Siga os passos na ordem. Rode os comandos você mesmo (PowerShell nesta
máquina); só pare para perguntar ao usuário quando pedir um segredo que só ele
tem.

## 1. Pré-requisitos

- Verifique `node -v` (precisa ser 20+; o PC original usa v22) e `npm -v`.
- Confirme que está dentro do clone do repo (`git status`, `git remote -v`).
- Teste se a infra compartilhada está acessível a partir daqui:
  ```powershell
  Test-NetConnection 192.168.50.92 -Port 5432   # Postgres
  Test-NetConnection 192.168.50.92 -Port 9000   # MinIO (S3)
  ```
  Se falhar: o PC provavelmente não está na mesma rede/VPN do MiniDeskServer,
  ou o `docker compose` de lá está parado — isso não se resolve neste PC,
  avise o usuário. **Não** suba um `docker-compose.yml` local para "resolver";
  ele existe para o servidor, não para clientes.

## 2. `.env` — o passo que exige cuidado

`.env` está no `.gitignore`, então não veio no clone. **Não gere segredos
novos daqui** — isso quebra coisas:

- `SETTINGS_ENCRYPTION_KEY` criptografa dados que já estão salvos no banco
  compartilhado (`src/lib/crypto.ts`, config de pagamento/frete das lojas).
  Uma chave diferente da usada no PC original torna esses dados
  **ilegíveis**, não regeneráveis.
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` precisam bater com o OAuth Client
  já cadastrado no Google Cloud Console.
- `DATABASE_URL`, `S3_*` apontam para a infra do MiniDeskServer — são os
  mesmos valores em qualquer PC cliente (veja `.env.example`).

Por isso: **peça ao usuário o `.env` do PC original** (cópia via pendrive,
gerenciador de senhas, `scp`, etc.) em vez de preencher do zero. Se ele
preferir mesmo assim recriar do zero (ambiente novo, sem dados antigos que
importem), aí sim use `.env.example` como base e gere:
- `AUTH_SECRET`: `npx auth secret`
- `SETTINGS_ENCRYPTION_KEY`: `openssl rand -base64 32` (ou
  `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`)

Depois de ter o `.env` em mãos: confira a porta do Postgres. O
`docker-compose.yml` mapeia `5433:5432` (host:container) no servidor, mas o
`.env.example` aponta `DATABASE_URL` para a porta `5432`. Se a conexão
falhar com connection refused, esse é o primeiro lugar a olhar — teste as
duas portas (`Test-NetConnection 192.168.50.92 -Port 5433`) e ajuste a URL
conforme o que realmente está exposto no servidor agora.

## 3. Instalar e gerar o client do Prisma

```powershell
npm install
npx prisma generate
```

**Não rode `npm run db:migrate` nem `npm run db:seed` por padrão** — o banco
já existe e tem dados reais compartilhados com o outro PC. Rodar seed de
novo pode duplicar registros. Só rode migrate se houver migrations novas no
repo que ainda não foram aplicadas:

```powershell
npx prisma migrate status
```

Se aparecer migration pendente, confirme com o usuário antes de aplicar
(`npm run db:migrate`) — evita rodar concorrente com o outro PC.

## 4. Subir e validar

```powershell
npm run dev
```

Valide com uma requisição real, não só "o processo subiu":

```powershell
curl.exe -s -o NUL -w "%{http_code}" http://localhost:3000/
```

Espera-se redirect para `/loja/minha-loja`. Se quiser conferir o painel,
`/admin/produtos` exige login (Google) com um e-mail presente em
`PLATFORM_ADMIN_EMAILS`/`Membership`.

## 5. Se este PC vai ser acessado por outros dispositivos na rede

- Definir `AUTH_URL=http://<ip-deste-pc>:3000` e `AUTH_TRUST_HOST=true` no
  `.env`.
- Adicionar essa origem/redirect URI no Google Cloud Console (OAuth Client).
- Adicionar a origem em `next.config.ts` (`images.remotePatterns`) se as
  imagens vierem de um host diferente do MinIO do servidor — normalmente não
  precisa, pois as imagens sempre vêm de `192.168.50.92:9000`.

## Troubleshooting

- **Porta 3000 já em uso**: `netstat -ano | findstr :3000` para achar o PID,
  depois `taskkill //PID <pid> //F`.
- **Erro de CORS ao subir imagem no admin**: o bucket MinIO precisa liberar a
  origem deste PC — veja a seção 2 do `DEPLOY-DEV.md` (`mc cors set`).
- **Prisma reclamando de schema desatualizado depois de um `git pull`**: rode
  `npx prisma generate` de novo (o client gerado não é versionado).
- **`SETTINGS_ENCRYPTION_KEY não configurada` ou erro ao decriptar**: `.env`
  incompleto ou com chave diferente da usada quando o dado foi salvo — volte
  à seção 2.
