-- AlterTable: identificação jurídica do operador (contrato/legal) — CPF de
-- quem assina (CNPJ sozinho não identifica pessoa física) e endereço completo.
ALTER TABLE "User" ADD COLUMN "cpf" TEXT;
ALTER TABLE "User" ADD COLUMN "address" JSONB;
