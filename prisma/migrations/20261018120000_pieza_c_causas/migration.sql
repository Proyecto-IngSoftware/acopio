-- CreateEnum
CREATE TYPE "CategoriaCausa" AS ENUM ('PERSONAS', 'ANIMALES', 'ADULTOS_MAYORES', 'RESCATISTAS');

-- CreateEnum
CREATE TYPE "MotivoArchivo" AS ENUM ('VENCIDA', 'MANUAL', 'ENTIDAD_SIN_VERIFICAR');

-- AlterTable
ALTER TABLE "entidad" ADD COLUMN     "logo_key" TEXT,
ADD COLUMN     "verificada_en" TIMESTAMPTZ,
ADD COLUMN     "verificada_por" UUID;

-- CreateTable
CREATE TABLE "causa" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entidad_id" UUID NOT NULL,
    "categoria" "CategoriaCausa" NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "imagen_key" TEXT,
    "pasos" JSONB NOT NULL,
    "url_oficial" TEXT NOT NULL,
    "cierra_el" DATE NOT NULL,
    "publicada_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivada_en" TIMESTAMPTZ,
    "archivo_motivo" "MotivoArchivo",
    "archivada_por" UUID,
    "creada_por" UUID NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "causa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "causa_archivada_en_publicada_en_idx" ON "causa"("archivada_en", "publicada_en" DESC);

-- AddForeignKey
ALTER TABLE "entidad" ADD CONSTRAINT "entidad_verificada_por_fkey" FOREIGN KEY ("verificada_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "causa" ADD CONSTRAINT "causa_entidad_id_fkey" FOREIGN KEY ("entidad_id") REFERENCES "entidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "causa" ADD CONSTRAINT "causa_archivada_por_fkey" FOREIGN KEY ("archivada_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "causa" ADD CONSTRAINT "causa_creada_por_fkey" FOREIGN KEY ("creada_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Pieza C: una entidad marcada VERIFICADA antes de esta migración toma su fecha de creación
UPDATE "entidad" SET "verificada_en" = "creado_en"
WHERE "verificacion" = 'VERIFICADA' AND "verificada_en" IS NULL;

ALTER TABLE "entidad" ADD CONSTRAINT "entidad_verificada_con_fecha"
  CHECK (("verificacion" = 'VERIFICADA') = ("verificada_en" IS NOT NULL));

ALTER TABLE "causa" ADD CONSTRAINT "causa_archivo_completo"
  CHECK (("archivada_en" IS NULL) = ("archivo_motivo" IS NULL));

-- Una causa no se borra: se archiva (RF-RED-010)
REVOKE DELETE, TRUNCATE ON "causa" FROM acopio_app;
