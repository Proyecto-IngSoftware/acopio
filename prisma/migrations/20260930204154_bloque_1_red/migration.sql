-- CreateEnum
CREATE TYPE "EstadoVerificacion" AS ENUM ('SIN_VERIFICAR', 'VERIFICADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "EstadoAcopio" AS ENUM ('ACTIVO', 'PAUSADO', 'CERRADO');

-- CreateEnum
CREATE TYPE "EstadoZona" AS ENUM ('SIN_ATENDER', 'EN_ATENCION', 'CUBIERTA');

-- CreateTable
CREATE TABLE "entidad" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nombre" CITEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nit" TEXT,
    "sitio_web" TEXT,
    "telefono" TEXT,
    "correo" TEXT,
    "descripcion" TEXT,
    "verificacion" "EstadoVerificacion" NOT NULL DEFAULT 'SIN_VERIFICAR',
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acopio" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entidad_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "lat" DECIMAL(9,6) NOT NULL,
    "lng" DECIMAL(9,6) NOT NULL,
    "telefono" TEXT,
    "indicaciones_acceso" TEXT,
    "horario" JSONB NOT NULL,
    "estado" "EstadoAcopio" NOT NULL DEFAULT 'ACTIVO',
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acopio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zona" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "emergencia_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "lat" DECIMAL(9,6) NOT NULL,
    "lng" DECIMAL(9,6) NOT NULL,
    "poblacion_estimada" INTEGER NOT NULL,
    "poblacion_fuente" TEXT NOT NULL,
    "poblacion_fecha" DATE NOT NULL,
    "estado" "EstadoZona" NOT NULL DEFAULT 'SIN_ATENDER',
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "no_recibir" (
    "acopio_id" UUID NOT NULL,
    "categoria_id" UUID NOT NULL,
    "hasta" DATE,
    "marcado_por" UUID NOT NULL,
    "marcado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "no_recibir_pkey" PRIMARY KEY ("acopio_id","categoria_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "entidad_nombre_key" ON "entidad"("nombre");

-- CreateIndex
CREATE INDEX "acopio_estado_idx" ON "acopio"("estado");

-- CreateIndex
CREATE INDEX "zona_emergencia_id_idx" ON "zona"("emergencia_id");

-- CreateIndex
CREATE INDEX "no_recibir_categoria_id_idx" ON "no_recibir"("categoria_id");

-- AddForeignKey
ALTER TABLE "acopio" ADD CONSTRAINT "acopio_entidad_id_fkey" FOREIGN KEY ("entidad_id") REFERENCES "entidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zona" ADD CONSTRAINT "zona_emergencia_id_fkey" FOREIGN KEY ("emergencia_id") REFERENCES "emergencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "no_recibir" ADD CONSTRAINT "no_recibir_acopio_id_fkey" FOREIGN KEY ("acopio_id") REFERENCES "acopio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "no_recibir" ADD CONSTRAINT "no_recibir_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── Reglas de la red (Bloque 1) ──────────────────────────────────────────────
-- Colombia continental e insular, con margen: evita un pin al otro lado del mundo
ALTER TABLE "acopio" ADD CONSTRAINT "acopio_coordenadas_colombia"
  CHECK ("lat" BETWEEN -5 AND 14 AND "lng" BETWEEN -82 AND -66);
ALTER TABLE "zona" ADD CONSTRAINT "zona_coordenadas_colombia"
  CHECK ("lat" BETWEEN -5 AND 14 AND "lng" BETWEEN -82 AND -66);
ALTER TABLE "zona" ADD CONSTRAINT "zona_poblacion_no_negativa"
  CHECK ("poblacion_estimada" >= 0);

-- Un acopio, una entidad o una zona con historia no se borran: se cierran (RF-RED-001).
-- no_recibir sí se borra: desmarcar es borrar la fila.
REVOKE DELETE, TRUNCATE ON "entidad", "acopio", "zona" FROM acopio_app;
