// lib/password.ts — hash de senha para o login por credencial (onboarding).
// scrypt (node:crypto) em vez de bcrypt/argon2: mesmo espírito do lib/crypto.ts,
// sem dependência nova.
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, "hex");
  const candidate = scryptSync(plain, salt, KEY_LENGTH);
  return candidate.length === hashBuf.length && timingSafeEqual(candidate, hashBuf);
}

/** Senha provisória enviada por e-mail no primeiro acesso. */
export function generateProvisionalPassword(): string {
  return randomBytes(9).toString("base64url");
}

/** Token de recuperação de senha: vai por e-mail em texto puro (URL). */
export function generateResetToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Hash do token de reset pra guardar no banco — sha256 é suficiente aqui
 * (o token já tem entropia alta, ao contrário de senha; não precisa scrypt).
 * Assim um vazamento do banco não expõe token válido, só quem tem o e-mail
 * (com o link) consegue provar posse.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
