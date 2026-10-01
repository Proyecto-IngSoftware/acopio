-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE');

-- CreateEnum
CREATE TYPE "MotivoSalida" AS ENUM ('ENTREGA_FAMILIAS', 'TRASLADO', 'VENCIDO', 'OTRO');

-- CreateTable
CREATE TABLE "movimiento" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "acopio_id" UUID NOT NULL,
    "categoria_id" UUID NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "signo" SMALLINT NOT NULL,
    "motivo_salida" "MotivoSalida",
    "nota" TEXT,
    "motivo" TEXT,
    "vence_en" DATE,
    "usuario_id" UUID NOT NULL,
    "ocurrido_en" TIMESTAMPTZ NOT NULL,
    "registrado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "origen_offline" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "movimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saldo" (
    "acopio_id" UUID NOT NULL,
    "categoria_id" UUID NOT NULL,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "ultimo_movimiento" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "saldo_pkey" PRIMARY KEY ("acopio_id","categoria_id")
);

-- CreateTable
CREATE TABLE "umbral" (
    "acopio_id" UUID NOT NULL,
    "categoria_id" UUID NOT NULL,
    "minimo" DECIMAL(12,3) NOT NULL,
    "maximo" DECIMAL(12,3) NOT NULL,
    "actualizado_por" UUID NOT NULL,
    "actualizado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "umbral_pkey" PRIMARY KEY ("acopio_id","categoria_id")
);

-- CreateTable
CREATE TABLE "codigo_barras" (
    "ean" TEXT NOT NULL,
    "categoria_id" UUID NOT NULL,
    "contenido" DECIMAL(12,3),
    "descripcion" TEXT,
    "creado_por" UUID NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revisado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "codigo_barras_pkey" PRIMARY KEY ("ean")
);

-- CreateIndex
CREATE INDEX "movimiento_acopio_id_categoria_id_registrado_en_idx" ON "movimiento"("acopio_id", "categoria_id", "registrado_en");

-- CreateIndex
CREATE INDEX "movimiento_registrado_en_idx" ON "movimiento"("registrado_en");

-- CreateIndex
CREATE INDEX "codigo_barras_categoria_id_idx" ON "codigo_barras"("categoria_id");

-- AddForeignKey
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_acopio_id_fkey" FOREIGN KEY ("acopio_id") REFERENCES "acopio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saldo" ADD CONSTRAINT "saldo_acopio_id_fkey" FOREIGN KEY ("acopio_id") REFERENCES "acopio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saldo" ADD CONSTRAINT "saldo_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umbral" ADD CONSTRAINT "umbral_acopio_id_fkey" FOREIGN KEY ("acopio_id") REFERENCES "acopio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umbral" ADD CONSTRAINT "umbral_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codigo_barras" ADD CONSTRAINT "codigo_barras_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── Reglas del inventario (Bloque 2) ─────────────────────────────────────────
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_cantidad_positiva" CHECK ("cantidad" > 0);
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_signo_valido" CHECK ("signo" IN (1, -1));
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_signo_de_entrada" CHECK ("tipo" <> 'ENTRADA' OR "signo" = 1);
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_signo_de_salida" CHECK ("tipo" <> 'SALIDA' OR "signo" = -1);
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_salida_con_motivo"
  CHECK ("tipo" <> 'SALIDA' OR "motivo_salida" IS NOT NULL);
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_motivo_solo_en_salida"
  CHECK ("tipo" = 'SALIDA' OR "motivo_salida" IS NULL);
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_nota_obligatoria"
  CHECK ("motivo_salida" IS NULL OR "motivo_salida" NOT IN ('TRASLADO', 'OTRO') OR length(trim(coalesce("nota", ''))) > 0);
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_ajuste_con_motivo"
  CHECK ("tipo" <> 'AJUSTE' OR length(trim(coalesce("motivo", ''))) >= 10);
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_vence_solo_en_entrada"
  CHECK ("tipo" = 'ENTRADA' OR "vence_en" IS NULL);

ALTER TABLE "saldo" ADD CONSTRAINT "saldo_cantidad_no_negativa" CHECK ("cantidad" >= 0);
ALTER TABLE "umbral" ADD CONSTRAINT "umbral_rango" CHECK ("minimo" >= 0 AND "minimo" <= "maximo");
ALTER TABLE "codigo_barras" ADD CONSTRAINT "codigo_barras_contenido_positivo"
  CHECK ("contenido" IS NULL OR "contenido" > 0);

-- El saldo lo mantiene la base (ADR-0015). La función corre como su dueño, así
-- acopio_app no necesita escribir en saldo. Si el resultado fuera negativo, el CHECK
-- de saldo hace fallar la transacción entera.
CREATE FUNCTION inventario_actualizar_saldo() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO saldo (acopio_id, categoria_id, cantidad, ultimo_movimiento)
  VALUES (NEW.acopio_id, NEW.categoria_id, NEW.cantidad * NEW.signo, NEW.registrado_en)
  ON CONFLICT (acopio_id, categoria_id) DO UPDATE
    SET cantidad = saldo.cantidad + EXCLUDED.cantidad,
        ultimo_movimiento = GREATEST(saldo.ultimo_movimiento, EXCLUDED.ultimo_movimiento);
  RETURN NULL;
END
$$;

CREATE TRIGGER movimiento_actualiza_saldo
  AFTER INSERT ON movimiento
  FOR EACH ROW EXECUTE FUNCTION inventario_actualizar_saldo();

-- Movimientos append-only y saldo solo de lectura para la API (RF-INV-011)
REVOKE UPDATE, DELETE, TRUNCATE ON "movimiento" FROM acopio_app;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON "saldo" FROM acopio_app;
-- Un código de barras no se borra: se corrige
REVOKE DELETE, TRUNCATE ON "codigo_barras" FROM acopio_app;
