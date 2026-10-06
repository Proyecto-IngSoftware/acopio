-- CreateEnum
CREATE TYPE "EstadoComprobante" AS ENUM ('PREPARADO', 'PENDIENTE', 'CONCILIADO', 'RECHAZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "MotivoRechazo" AS ENUM ('DUPLICADO', 'NO_CUADRA_MOVIMIENTOS', 'DIFERENCIA_SIN_EXPLICAR', 'OTRO');

-- CreateEnum
CREATE TYPE "OrigenVinculo" AS ENUM ('RECEPCION', 'AUDITOR');

-- CreateTable
CREATE TABLE "comprobante" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "folio" TEXT NOT NULL,
    "donador_id" UUID NOT NULL,
    "acopio_id" UUID NOT NULL,
    "estado" "EstadoComprobante" NOT NULL DEFAULT 'PREPARADO',
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recibido_por" UUID,
    "recibido_en" TIMESTAMPTZ,
    "verificado_por" UUID,
    "verificado_en" TIMESTAMPTZ,
    "motivo_rechazo" "MotivoRechazo",
    "nota_rechazo" TEXT,
    "cerrado_en" TIMESTAMPTZ,
    "factura_key" TEXT,
    "miniatura_key" TEXT,
    "factura_tipo" TEXT,
    "factura_bytes" INTEGER,
    "factura_borrada_en" TIMESTAMPTZ,

    CONSTRAINT "comprobante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "linea_comprobante" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "comprobante_id" UUID NOT NULL,
    "categoria_id" UUID NOT NULL,
    "ean" TEXT,
    "contenido_unitario" DECIMAL(12,3) NOT NULL,
    "cantidad_declarada" DECIMAL(12,3) NOT NULL,
    "cantidad_confirmada" DECIMAL(12,3),
    "vence_en" DATE,
    "motivo_diferencia" TEXT,

    CONSTRAINT "linea_comprobante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comprobante_movimiento" (
    "comprobante_id" UUID NOT NULL,
    "movimiento_id" UUID NOT NULL,
    "origen" "OrigenVinculo" NOT NULL,
    "vinculado_por" UUID NOT NULL,
    "vinculado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comprobante_movimiento_pkey" PRIMARY KEY ("comprobante_id","movimiento_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "comprobante_folio_key" ON "comprobante"("folio");

-- CreateIndex
CREATE INDEX "comprobante_estado_acopio_id_creado_en_idx" ON "comprobante"("estado", "acopio_id", "creado_en");

-- CreateIndex
CREATE INDEX "comprobante_donador_id_estado_idx" ON "comprobante"("donador_id", "estado");

-- CreateIndex
CREATE INDEX "linea_comprobante_comprobante_id_idx" ON "linea_comprobante"("comprobante_id");

-- CreateIndex
CREATE UNIQUE INDEX "comprobante_movimiento_movimiento_id_key" ON "comprobante_movimiento"("movimiento_id");

-- AddForeignKey
ALTER TABLE "comprobante" ADD CONSTRAINT "comprobante_donador_id_fkey" FOREIGN KEY ("donador_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobante" ADD CONSTRAINT "comprobante_acopio_id_fkey" FOREIGN KEY ("acopio_id") REFERENCES "acopio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linea_comprobante" ADD CONSTRAINT "linea_comprobante_comprobante_id_fkey" FOREIGN KEY ("comprobante_id") REFERENCES "comprobante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linea_comprobante" ADD CONSTRAINT "linea_comprobante_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobante_movimiento" ADD CONSTRAINT "comprobante_movimiento_comprobante_id_fkey" FOREIGN KEY ("comprobante_id") REFERENCES "comprobante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobante_movimiento" ADD CONSTRAINT "comprobante_movimiento_movimiento_id_fkey" FOREIGN KEY ("movimiento_id") REFERENCES "movimiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ── Reglas de la custodia (Bloque 3) ────────────────────────────────────────
ALTER TABLE "comprobante" ADD CONSTRAINT "comprobante_rechazo_con_motivo"
  CHECK ("estado" <> 'RECHAZADO' OR "motivo_rechazo" IS NOT NULL);
ALTER TABLE "comprobante" ADD CONSTRAINT "comprobante_otro_con_nota"
  CHECK ("motivo_rechazo" IS DISTINCT FROM 'OTRO' OR length(trim(coalesce("nota_rechazo", ''))) > 0);
ALTER TABLE "comprobante" ADD CONSTRAINT "comprobante_folio_formato"
  CHECK ("folio" ~ '^ACO-[0-9]{4}-[A-HJ-NP-Z2-9]{5}$');
ALTER TABLE "linea_comprobante" ADD CONSTRAINT "linea_declarada_positiva"
  CHECK ("cantidad_declarada" > 0);
ALTER TABLE "linea_comprobante" ADD CONSTRAINT "linea_confirmada_no_negativa"
  CHECK ("cantidad_confirmada" IS NULL OR "cantidad_confirmada" >= 0);
ALTER TABLE "linea_comprobante" ADD CONSTRAINT "linea_contenido_positivo"
  CHECK ("contenido_unitario" > 0);

-- Los vínculos no se cambian ni se borran (C-05)
REVOKE UPDATE, DELETE, TRUNCATE ON "comprobante_movimiento" FROM acopio_app;
-- Un comprobante y sus líneas no se borran: se cancelan o se rechazan
REVOKE DELETE, TRUNCATE ON "comprobante", "linea_comprobante" FROM acopio_app;
