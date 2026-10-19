-- CreateEnum
CREATE TYPE "TipoAcopio" AS ENUM ('OPERADO', 'REFERENCIADO');

-- CreateEnum
CREATE TYPE "OrigenImportacion" AS ENUM ('ARCHIVO', 'HTTP');

-- CreateEnum
CREATE TYPE "ResultadoImportacion" AS ENUM ('OK', 'ABORTADA');

-- AlterTable
ALTER TABLE "acopio" ADD COLUMN     "fuente" TEXT,
ADD COLUMN     "fuente_actualizado_en" TIMESTAMPTZ,
ADD COLUMN     "fuente_contacto" JSONB,
ADD COLUMN     "fuente_estado" TEXT,
ADD COLUMN     "fuente_horario" TEXT,
ADD COLUMN     "fuente_id" TEXT,
ADD COLUMN     "fuente_necesidades" JSONB,
ADD COLUMN     "fuente_url" TEXT,
ADD COLUMN     "oculto_por_admin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tipo" "TipoAcopio" NOT NULL DEFAULT 'OPERADO',
ALTER COLUMN "entidad_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "plataforma" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "fuente" TEXT,
    "fuente_id" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "actualizado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plataforma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "importacion_ejecucion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "fuente" TEXT NOT NULL,
    "origen" "OrigenImportacion" NOT NULL,
    "inicio" TIMESTAMPTZ NOT NULL,
    "fin" TIMESTAMPTZ NOT NULL,
    "resultado" "ResultadoImportacion" NOT NULL,
    "creados" INTEGER NOT NULL DEFAULT 0,
    "actualizados" INTEGER NOT NULL DEFAULT 0,
    "cerrados" INTEGER NOT NULL DEFAULT 0,
    "motivo" TEXT,

    CONSTRAINT "importacion_ejecucion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plataforma_fuente_fuente_id_key" ON "plataforma"("fuente", "fuente_id");

-- CreateIndex
CREATE INDEX "importacion_ejecucion_fuente_inicio_idx" ON "importacion_ejecucion"("fuente", "inicio");

-- CreateIndex
CREATE UNIQUE INDEX "acopio_fuente_fuente_id_key" ON "acopio"("fuente", "fuente_id");


-- Un referenciado tiene fuente; un operado, entidad (modelo-datos.md, P-022)
ALTER TABLE "acopio" ADD CONSTRAINT "acopio_referenciado_con_fuente"
  CHECK ("tipo" = 'OPERADO' OR "fuente" IS NOT NULL);
ALTER TABLE "acopio" ADD CONSTRAINT "acopio_operado_con_entidad"
  CHECK ("tipo" = 'REFERENCIADO' OR "entidad_id" IS NOT NULL);
