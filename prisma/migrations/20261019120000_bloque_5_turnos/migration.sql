-- CreateEnum
CREATE TYPE "EstadoJornada" AS ENUM ('ABIERTA', 'CERRADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoReserva" AS ENUM ('ACTIVA', 'CANCELADA', 'ASISTIO', 'NO_ASISTIO');

-- CreateEnum
CREATE TYPE "PerfilVoluntario" AS ENUM ('VETERINARIO', 'MEDICO', 'PSICOLOGO', 'CUIDADOR_ADULTO_MAYOR', 'CONDUCTOR_C2');

-- CreateTable
CREATE TABLE "jornada" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "acopio_id" UUID,
    "entidad_id" UUID,
    "direccion" TEXT,
    "municipio" TEXT,
    "lat" DECIMAL(9,6),
    "lng" DECIMAL(9,6),
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "que_llevar" TEXT,
    "inicio" TIMESTAMPTZ NOT NULL,
    "fin" TIMESTAMPTZ NOT NULL,
    "cupo_maximo" INTEGER NOT NULL,
    "requisitos" JSONB NOT NULL DEFAULT '{}',
    "perfil_requerido" "PerfilVoluntario",
    "cupos_ajuste_manual" INTEGER NOT NULL DEFAULT 0,
    "ajuste_actualizado_en" TIMESTAMPTZ,
    "estado" "EstadoJornada" NOT NULL DEFAULT 'ABIERTA',
    "motivo_cancelacion" TEXT,
    "cancelada_en" TIMESTAMPTZ,
    "serie_id" UUID,
    "creada_por" UUID NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jornada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reserva" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "jornada_id" UUID NOT NULL,
    "nombre" TEXT,
    "correo" TEXT,
    "telefono" TEXT,
    "codigo" TEXT NOT NULL,
    "secreto_hash" TEXT NOT NULL,
    "perfil_declarado" BOOLEAN NOT NULL DEFAULT false,
    "estado" "EstadoReserva" NOT NULL DEFAULT 'ACTIVA',
    "consentimiento_en" TIMESTAMPTZ NOT NULL,
    "recordatorio_en" TIMESTAMPTZ,
    "cancelada_en" TIMESTAMPTZ,
    "datos_borrados_en" TIMESTAMPTZ,
    "creada_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reserva_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "jornada_inicio_idx" ON "jornada"("inicio");

-- CreateIndex
CREATE INDEX "jornada_acopio_id_idx" ON "jornada"("acopio_id");

-- CreateIndex
CREATE UNIQUE INDEX "reserva_codigo_key" ON "reserva"("codigo");

-- CreateIndex
CREATE INDEX "reserva_jornada_id_idx" ON "reserva"("jornada_id");

-- AddForeignKey
ALTER TABLE "jornada" ADD CONSTRAINT "jornada_acopio_id_fkey" FOREIGN KEY ("acopio_id") REFERENCES "acopio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jornada" ADD CONSTRAINT "jornada_entidad_id_fkey" FOREIGN KEY ("entidad_id") REFERENCES "entidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jornada" ADD CONSTRAINT "jornada_creada_por_fkey" FOREIGN KEY ("creada_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva" ADD CONSTRAINT "reserva_jornada_id_fkey" FOREIGN KEY ("jornada_id") REFERENCES "jornada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Reglas que Prisma no expresa (Bloque 5, §4 de la especificación)
ALTER TABLE "jornada" ADD CONSTRAINT "jornada_un_dueno" CHECK (("acopio_id" IS NULL) <> ("entidad_id" IS NULL));
ALTER TABLE "jornada" ADD CONSTRAINT "jornada_entidad_con_lugar" CHECK ("entidad_id" IS NULL OR ("direccion" IS NOT NULL AND "municipio" IS NOT NULL));
ALTER TABLE "jornada" ADD CONSTRAINT "jornada_cupo" CHECK ("cupo_maximo" BETWEEN 1 AND 500);
ALTER TABLE "jornada" ADD CONSTRAINT "jornada_ajuste" CHECK ("cupos_ajuste_manual" >= 0);
ALTER TABLE "jornada" ADD CONSTRAINT "jornada_horario" CHECK ("fin" > "inicio");

-- Un correo, una reserva viva por jornada; quien canceló puede volver a reservar (T-10)
CREATE UNIQUE INDEX "reserva_correo_unico" ON "reserva"("jornada_id", "correo") WHERE "estado" <> 'CANCELADA';

-- Las reservas no se borran: sus datos personales se vacían a los 30 días (T-06)
REVOKE DELETE, TRUNCATE ON "reserva" FROM acopio_app;
