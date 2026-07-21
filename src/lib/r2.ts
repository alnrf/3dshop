// lib/r2.ts — storage S3-compatível. Em produção: Cloudflare R2.
// Em dev no mini server: MinIO (S3_FORCE_PATH_STYLE=true) — mesmo código, outras envs.
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true", // MinIO precisa
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.S3_BUCKET!;

/** URL pública de um objeto. Sem key, devolve um placeholder local. */
export function r2Url(key?: string) {
  if (!key) return "/placeholder-product.png";
  return `${process.env.S3_PUBLIC_URL}/${key}`;
}

/**
 * URL assinada para o browser fazer PUT direto no bucket (não passa pelo server).
 * Requer CORS no bucket permitindo PUT a partir do domínio da loja.
 */
export async function createUploadUrl(contentType: string) {
  const ext = contentType.split("/")[1] ?? "bin";
  const key = `products/${crypto.randomUUID()}.${ext}`;
  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: 60 },
  );
  return { url, key };
}
