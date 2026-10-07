-- CreateEnum
CREATE TYPE "EstadoRemision" AS ENUM ('BORRADOR', 'EN_TRANSITO', 'RECIBIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoSugerencia" AS ENUM ('PROPUESTA', 'APROBADA', 'DESCARTADA');

-- AlterEnum
ALTER TYPE "TipoMovimiento" ADD VALUE 'RECEPCION';

-- DropForeignKey
ALTER TABLE "movimiento" DROP CONSTRAINT "movimiento_acopio_id_fkey";

-- AlterTable
ALTER TABLE "movimiento" ADD COLUMN     "remision_id" UUID,
ADD COLUMN     "zona_id" UUID,
ALTER COLUMN "acopio_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "remision" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "codigo" TEXT NOT NULL,
    "acopio_origen_id" UUID NOT NULL,
    "zona_destino_id" UUID,
    "estado" "EstadoRemision" NOT NULL DEFAULT 'BORRADOR',
    "responsable" TEXT,
    "qr_token" TEXT NOT NULL,
    "creada_por" UUID NOT NULL,
    "creada_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "despachada_por" UUID,
    "despachada_en" TIMESTAMPTZ,
    "recibida_por" UUID,
    "recibida_en" TIMESTAMPTZ,
    "evidencia_keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "nota_recepcion" TEXT,
    "cancelada_por" UUID,
    "cancelada_en" TIMESTAMPTZ,
    "motivo_cancelacion" TEXT,

    CONSTRAINT "remision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "linea_remision" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "remision_id" UUID NOT NULL,
    "categoria_id" UUID NOT NULL,
    "cantidad_planeada" DECIMAL(12,3) NOT NULL,
    "cantidad_recibida" DECIMAL(12,3),

    CONSTRAINT "linea_remision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remision_comprobante" (
    "remision_id" UUID NOT NULL,
    "comprobante_id" UUID NOT NULL,
    "vinculado_por" UUID NOT NULL,
    "vinculado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "remision_comprobante_pkey" PRIMARY KEY ("remision_id","comprobante_id")
);

-- CreateTable
CREATE TABLE "sugerencia" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ronda" TIMESTAMPTZ NOT NULL,
    "emergencia_id" UUID NOT NULL,
    "acopio_id" UUID NOT NULL,
    "zona_id" UUID NOT NULL,
    "categoria_id" UUID NOT NULL,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "puntaje" DECIMAL(6,4) NOT NULL,
    "desglose" JSONB NOT NULL,
    "justificacion" TEXT NOT NULL,
    "estado" "EstadoSugerencia" NOT NULL DEFAULT 'PROPUESTA',
    "cantidad_aprobada" DECIMAL(12,3),
    "remision_id" UUID,
    "motivo_descarte" TEXT,
    "decidida_por" UUID,
    "decidida_en" TIMESTAMPTZ,

    CONSTRAINT "sugerencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporte_necesidad" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "zona_id" UUID NOT NULL,
    "categoria_id" UUID NOT NULL,
    "reportado_por" UUID NOT NULL,
    "nota" TEXT,
    "resuelta" BOOLEAN NOT NULL DEFAULT false,
    "reportado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reporte_necesidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "necesidad_manual" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "zona_id" UUID NOT NULL,
    "categoria_id" UUID NOT NULL,
    "cantidad" DECIMAL(12,3),
    "motivo" TEXT NOT NULL,
    "puesta_por" UUID NOT NULL,
    "puesta_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "necesidad_manual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion_motor" (
    "id" SMALLINT NOT NULL,
    "pesos" JSONB NOT NULL,
    "cantidad_minima" DECIMAL(12,3) NOT NULL,
    "actualizado_por" UUID,
    "actualizado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "configuracion_motor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "remision_codigo_key" ON "remision"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "remision_qr_token_key" ON "remision"("qr_token");

-- CreateIndex
CREATE INDEX "remision_estado_acopio_origen_id_idx" ON "remision"("estado", "acopio_origen_id");

-- CreateIndex
CREATE INDEX "remision_estado_zona_destino_id_idx" ON "remision"("estado", "zona_destino_id");

-- CreateIndex
CREATE UNIQUE INDEX "linea_remision_remision_id_categoria_id_key" ON "linea_remision"("remision_id", "categoria_id");

-- CreateIndex
CREATE INDEX "remision_comprobante_comprobante_id_idx" ON "remision_comprobante"("comprobante_id");

-- CreateIndex
CREATE INDEX "sugerencia_estado_puntaje_idx" ON "sugerencia"("estado", "puntaje");

-- CreateIndex
CREATE INDEX "sugerencia_acopio_id_zona_id_categoria_id_decidida_en_idx" ON "sugerencia"("acopio_id", "zona_id", "categoria_id", "decidida_en");

-- CreateIndex
CREATE INDEX "reporte_necesidad_zona_id_categoria_id_reportado_en_idx" ON "reporte_necesidad"("zona_id", "categoria_id", "reportado_en");

-- CreateIndex
CREATE INDEX "necesidad_manual_zona_id_categoria_id_puesta_en_idx" ON "necesidad_manual"("zona_id", "categoria_id", "puesta_en");

-- CreateIndex
CREATE INDEX "movimiento_zona_id_categoria_id_ocurrido_en_idx" ON "movimiento"("zona_id", "categoria_id", "ocurrido_en");

-- AddForeignKey
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_acopio_id_fkey" FOREIGN KEY ("acopio_id") REFERENCES "acopio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_zona_id_fkey" FOREIGN KEY ("zona_id") REFERENCES "zona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_remision_id_fkey" FOREIGN KEY ("remision_id") REFERENCES "remision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remision" ADD CONSTRAINT "remision_acopio_origen_id_fkey" FOREIGN KEY ("acopio_origen_id") REFERENCES "acopio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remision" ADD CONSTRAINT "remision_zona_destino_id_fkey" FOREIGN KEY ("zona_destino_id") REFERENCES "zona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remision" ADD CONSTRAINT "remision_creada_por_fkey" FOREIGN KEY ("creada_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remision" ADD CONSTRAINT "remision_despachada_por_fkey" FOREIGN KEY ("despachada_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remision" ADD CONSTRAINT "remision_recibida_por_fkey" FOREIGN KEY ("recibida_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remision" ADD CONSTRAINT "remision_cancelada_por_fkey" FOREIGN KEY ("cancelada_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linea_remision" ADD CONSTRAINT "linea_remision_remision_id_fkey" FOREIGN KEY ("remision_id") REFERENCES "remision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linea_remision" ADD CONSTRAINT "linea_remision_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remision_comprobante" ADD CONSTRAINT "remision_comprobante_remision_id_fkey" FOREIGN KEY ("remision_id") REFERENCES "remision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remision_comprobante" ADD CONSTRAINT "remision_comprobante_comprobante_id_fkey" FOREIGN KEY ("comprobante_id") REFERENCES "comprobante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remision_comprobante" ADD CONSTRAINT "remision_comprobante_vinculado_por_fkey" FOREIGN KEY ("vinculado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sugerencia" ADD CONSTRAINT "sugerencia_emergencia_id_fkey" FOREIGN KEY ("emergencia_id") REFERENCES "emergencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sugerencia" ADD CONSTRAINT "sugerencia_acopio_id_fkey" FOREIGN KEY ("acopio_id") REFERENCES "acopio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sugerencia" ADD CONSTRAINT "sugerencia_zona_id_fkey" FOREIGN KEY ("zona_id") REFERENCES "zona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sugerencia" ADD CONSTRAINT "sugerencia_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sugerencia" ADD CONSTRAINT "sugerencia_remision_id_fkey" FOREIGN KEY ("remision_id") REFERENCES "remision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sugerencia" ADD CONSTRAINT "sugerencia_decidida_por_fkey" FOREIGN KEY ("decidida_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporte_necesidad" ADD CONSTRAINT "reporte_necesidad_zona_id_fkey" FOREIGN KEY ("zona_id") REFERENCES "zona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporte_necesidad" ADD CONSTRAINT "reporte_necesidad_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporte_necesidad" ADD CONSTRAINT "reporte_necesidad_reportado_por_fkey" FOREIGN KEY ("reportado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "necesidad_manual" ADD CONSTRAINT "necesidad_manual_zona_id_fkey" FOREIGN KEY ("zona_id") REFERENCES "zona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "necesidad_manual" ADD CONSTRAINT "necesidad_manual_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "necesidad_manual" ADD CONSTRAINT "necesidad_manual_puesta_por_fkey" FOREIGN KEY ("puesta_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracion_motor" ADD CONSTRAINT "configuracion_motor_actualizado_por_fkey" FOREIGN KEY ("actualizado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ── Motor (Bloque 4) ────────────────────────────────────────────────────────
-- RECEPCION se agrega en esta misma transacción: los CHECK comparan tipo::text,
-- porque PostgreSQL no deja usar un valor de enum nuevo antes del commit
-- Un movimiento es de un acopio o de una zona, nunca de los dos (M-01, ADR-0018)
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_acopio_o_zona"
  CHECK (("acopio_id" IS NULL) <> ("zona_id" IS NULL));
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_recepcion_en_zona"
  CHECK (("tipo"::text = 'RECEPCION') = ("zona_id" IS NOT NULL));
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_recepcion_con_remision"
  CHECK ("tipo"::text <> 'RECEPCION' OR ("remision_id" IS NOT NULL AND "signo" = 1));

-- Las zonas no tienen saldo: el disparador solo corre en movimientos de acopio
DROP TRIGGER movimiento_actualiza_saldo ON movimiento;
CREATE TRIGGER movimiento_actualiza_saldo
  AFTER INSERT ON movimiento
  FOR EACH ROW WHEN (NEW.acopio_id IS NOT NULL)
  EXECUTE FUNCTION inventario_actualizar_saldo();

ALTER TABLE "remision" ADD CONSTRAINT "remision_codigo_formato"
  CHECK ("codigo" ~ '^R-[0-9]{4}-[A-HJ-NP-Z2-9]{5}$');
ALTER TABLE "remision" ADD CONSTRAINT "remision_recibida_completa"
  CHECK ("estado" <> 'RECIBIDA' OR ("zona_destino_id" IS NOT NULL
         AND "recibida_en" IS NOT NULL AND cardinality("evidencia_keys") >= 1));
ALTER TABLE "remision" ADD CONSTRAINT "remision_despachada_con_responsable"
  CHECK ("estado" IN ('BORRADOR', 'CANCELADA') OR length(trim(coalesce("responsable", ''))) > 0);
ALTER TABLE "remision" ADD CONSTRAINT "remision_cancelada_con_motivo"
  CHECK ("estado" <> 'CANCELADA' OR length(trim(coalesce("motivo_cancelacion", ''))) >= 10);
ALTER TABLE "linea_remision" ADD CONSTRAINT "linea_remision_planeada_positiva"
  CHECK ("cantidad_planeada" > 0);
ALTER TABLE "linea_remision" ADD CONSTRAINT "linea_remision_recibida_no_negativa"
  CHECK ("cantidad_recibida" IS NULL OR "cantidad_recibida" >= 0);
ALTER TABLE "sugerencia" ADD CONSTRAINT "sugerencia_cantidad_positiva"
  CHECK ("cantidad" > 0);
ALTER TABLE "sugerencia" ADD CONSTRAINT "sugerencia_descartada_con_motivo"
  CHECK ("estado" <> 'DESCARTADA' OR length(trim(coalesce("motivo_descarte", ''))) >= 10);
ALTER TABLE "sugerencia" ADD CONSTRAINT "sugerencia_aprobada_con_remision"
  CHECK ("estado" <> 'APROBADA' OR ("remision_id" IS NOT NULL AND "cantidad_aprobada" > 0));
ALTER TABLE "necesidad_manual" ADD CONSTRAINT "necesidad_manual_cantidad"
  CHECK ("cantidad" IS NULL OR "cantidad" >= 0);
ALTER TABLE "necesidad_manual" ADD CONSTRAINT "necesidad_manual_motivo"
  CHECK (length(trim("motivo")) >= 10);
ALTER TABLE "configuracion_motor" ADD CONSTRAINT "configuracion_motor_una_fila"
  CHECK ("id" = 1);
ALTER TABLE "configuracion_motor" ADD CONSTRAINT "configuracion_motor_minimo"
  CHECK ("cantidad_minima" >= 0);

-- Las líneas se editan solo en BORRADOR. En tránsito solo cambia cantidad_recibida,
-- que la recepción iguala a la planeada (RF-MOT-009)
CREATE FUNCTION motor_linea_editable() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  rid uuid;
  e text;
BEGIN
  IF TG_OP = 'DELETE' THEN rid := OLD.remision_id; ELSE rid := NEW.remision_id; END IF;
  SELECT estado::text INTO e FROM remision WHERE id = rid;
  IF e = 'BORRADOR' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND e = 'EN_TRANSITO'
     AND NEW.remision_id = OLD.remision_id AND NEW.categoria_id = OLD.categoria_id
     AND NEW.cantidad_planeada = OLD.cantidad_planeada THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'linea_remision_no_editable: la remisión está %', e
    USING ERRCODE = 'check_violation';
END
$$;
CREATE TRIGGER linea_remision_editable
  BEFORE INSERT OR UPDATE OR DELETE ON linea_remision
  FOR EACH ROW EXECUTE FUNCTION motor_linea_editable();

-- Una sugerencia decidida no se borra; las PROPUESTA sí, en cada recálculo (M-04)
CREATE FUNCTION motor_sugerencia_borrable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.estado <> 'PROPUESTA' THEN
    RAISE EXCEPTION 'sugerencia_decidida_no_se_borra' USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END
$$;
CREATE TRIGGER sugerencia_borrable
  BEFORE DELETE ON sugerencia
  FOR EACH ROW EXECUTE FUNCTION motor_sugerencia_borrable();

-- Solo inserción (§4 de la especificación)
REVOKE UPDATE, DELETE, TRUNCATE ON "reporte_necesidad", "necesidad_manual", "remision_comprobante" FROM acopio_app;
-- Una remisión se cancela, no se borra; la configuración es una fila fija
REVOKE DELETE, TRUNCATE ON "remision", "configuracion_motor" FROM acopio_app;
