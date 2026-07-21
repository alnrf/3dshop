# Infra de dev no MiniDeskServer (192.168.50.92)

Postgres + MinIO via Docker Compose. O app Next roda onde preferir
(no seu desktop apontando para o servidor, ou no próprio servidor).

## 1. Subir Postgres + MinIO

```bash
# copiar o compose para o servidor
scp docker-compose.yml allan@192.168.50.92:~/loja3d/

ssh allan@192.168.50.92
cd ~/loja3d
docker compose up -d
docker compose ps   # db (5432), minio (9000/9001) rodando; minio-init sai com exit 0
```

O `minio-init` cria o bucket `loja3d` com leitura pública (as URLs de imagem
dos produtos são públicas — os uploads continuam exigindo URL assinada).

Console do MinIO: http://192.168.50.92:9001 (loja3d / loja3d_dev_secret)

## 2. CORS do bucket (upload direto do browser)

```bash
docker run --rm --network host minio/mc /bin/sh -c "
  mc alias set local http://192.168.50.92:9000 loja3d loja3d_dev_secret &&
  cat > /tmp/cors.json << 'JSON'
{\"CORSRules\":[{\"AllowedOrigins\":[\"http://localhost:3000\",\"http://192.168.50.92:3000\"],
\"AllowedMethods\":[\"PUT\",\"GET\"],\"AllowedHeaders\":[\"*\"]}]}
JSON
  mc cors set local/loja3d /tmp/cors.json"
```

(Se a sua versão do `mc` não tiver `cors set`, use `mc admin` ou configure pela
console web em Buckets → loja3d → Access.)

## 3. Banco: migrations + seed (da sua máquina)

```bash
cp .env.example .env   # e preencha AUTH_*, SEED_ADMIN_EMAIL, PLATFORM_ADMIN_EMAILS
npm install
npx prisma generate
npm run db:migrate -- --name init
npm run db:seed
```

## 4. Rodar o app

Na sua máquina: `npm run dev` → http://localhost:3000 (redireciona para
/loja/minha-loja).

No servidor (opcional):
```bash
# no MiniDeskServer, com o repositório clonado
npm install && npm run build
AUTH_URL=http://192.168.50.92:3000 AUTH_TRUST_HOST=true npm run start
```

## 5. Google OAuth (dev)

No Google Cloud Console → Credentials → OAuth Client:
- Authorized origin: http://localhost:3000 (e http://192.168.50.92:3000 se for o caso)
- Redirect URI: http://localhost:3000/api/auth/callback/google

## Produção (quando chegar lá)

Trocar envs: `DATABASE_URL` → Neon, `S3_*` → R2 (`S3_FORCE_PATH_STYLE=false`),
`S3_PUBLIC_URL` → domínio público, e ajustar `next.config.ts` (remotePatterns).
Nenhuma linha de código muda.
