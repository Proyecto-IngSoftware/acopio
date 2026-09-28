-- Extensiones: citext para usuario y correo sin distinguir mayúsculas; unaccent y
-- pg_trgm para la búsqueda de categorías (RF-CAT-002).
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- unaccent() no es IMMUTABLE y no sirve en índices; esta envoltura sí.
CREATE FUNCTION acopio_sin_tildes(texto text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, lower(texto)) $$;

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'OPERADOR', 'AUDITOR', 'RECEPTOR', 'DONADOR');

-- CreateEnum
CREATE TYPE "EstadoUsuario" AS ENUM ('INVITADO', 'ACTIVO', 'SUSPENDIDO');

-- CreateEnum
CREATE TYPE "TipoUbicacion" AS ENUM ('ACOPIO', 'ZONA');

-- CreateEnum
CREATE TYPE "EstadoCorreo" AS ENUM ('PENDIENTE', 'ENVIADO', 'FALLIDO');

-- CreateEnum
CREATE TYPE "GrupoCategoria" AS ENUM ('ALIMENTOS', 'AGUA_Y_BEBIDAS', 'ASEO_PERSONAL', 'ASEO_DEL_HOGAR', 'SALUD', 'ROPA_Y_ABRIGO', 'BEBE', 'ADULTO_MAYOR', 'ANIMALES', 'HERRAMIENTAS');

-- CreateEnum
CREATE TYPE "UnidadBase" AS ENUM ('LITRO', 'KILOGRAMO', 'UNIDAD');

-- CreateEnum
CREATE TYPE "EstadoEmergencia" AS ENUM ('ACTIVA', 'EN_SEGUIMIENTO', 'CERRADA');

-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "username" CITEXT,
    "nombre" TEXT NOT NULL,
    "correo" CITEXT,
    "correo_sintetico" BOOLEAN NOT NULL DEFAULT false,
    "rol" "Rol" NOT NULL,
    "supabase_uid" UUID,
    "estado" "EstadoUsuario" NOT NULL DEFAULT 'INVITADO',
    "tokens_validos_desde" TIMESTAMPTZ,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario_asignacion" (
    "usuario_id" UUID NOT NULL,
    "ubicacion_tipo" "TipoUbicacion" NOT NULL,
    "ubicacion_id" UUID NOT NULL,
    "asignado_por" UUID NOT NULL,
    "asignado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_asignacion_pkey" PRIMARY KEY ("usuario_id","ubicacion_tipo","ubicacion_id")
);

-- CreateTable
CREATE TABLE "invitacion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "token_hash" BYTEA NOT NULL,
    "expira_en" TIMESTAMPTZ NOT NULL,
    "usada_en" TIMESTAMPTZ,
    "revocada_en" TIMESTAMPTZ,
    "es_restablecimiento" BOOLEAN NOT NULL DEFAULT false,
    "motivo" TEXT,
    "creada_por" UUID,
    "creada_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identidad_local" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "correo" CITEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "correo_confirmado_en" TIMESTAMPTZ,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identidad_local_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bitacora" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidad_id" TEXT,
    "ubicacion_id" UUID,
    "datos_antes" JSONB,
    "datos_despues" JSONB,
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "ocurrido_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bitacora_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "correo_saliente" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "destinatario" CITEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "cuerpo_texto" TEXT NOT NULL,
    "cuerpo_html" TEXT,
    "estado" "EstadoCorreo" NOT NULL DEFAULT 'PENDIENTE',
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "ultimo_error" TEXT,
    "enviar_despues_de" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviado_en" TIMESTAMPTZ,

    CONSTRAINT "correo_saliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categoria" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nombre" CITEXT NOT NULL,
    "grupo" "GrupoCategoria" NOT NULL,
    "unidad_base" "UnidadBase" NOT NULL,
    "perecedero" BOOLEAN NOT NULL DEFAULT false,
    "sinonimos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "archivada" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canasta_estandar" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "categoria_id" UUID NOT NULL,
    "cantidad_persona_dia" DECIMAL(12,4) NOT NULL,
    "fuente" TEXT NOT NULL,
    "vigente_desde" DATE NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "canasta_estandar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergencia" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "inicio" DATE NOT NULL,
    "horizonte_dias" INTEGER NOT NULL DEFAULT 7,
    "estado" "EstadoEmergencia" NOT NULL DEFAULT 'ACTIVA',
    "destacada_hasta" DATE NOT NULL,
    "cerrada_en" TIMESTAMPTZ,
    "motivo_cierre" TEXT,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emergencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_username_key" ON "usuario"("username");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_correo_key" ON "usuario"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_supabase_uid_key" ON "usuario"("supabase_uid");

-- CreateIndex
CREATE INDEX "usuario_asignacion_usuario_id_ubicacion_id_idx" ON "usuario_asignacion"("usuario_id", "ubicacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "invitacion_token_hash_key" ON "invitacion"("token_hash");

-- CreateIndex
CREATE INDEX "invitacion_usuario_id_idx" ON "invitacion"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "identidad_local_correo_key" ON "identidad_local"("correo");

-- CreateIndex
CREATE INDEX "bitacora_usuario_id_ocurrido_en_idx" ON "bitacora"("usuario_id", "ocurrido_en");

-- CreateIndex
CREATE INDEX "bitacora_entidad_entidad_id_idx" ON "bitacora"("entidad", "entidad_id");

-- CreateIndex
CREATE INDEX "bitacora_ocurrido_en_idx" ON "bitacora"("ocurrido_en");

-- CreateIndex
CREATE INDEX "correo_saliente_estado_enviar_despues_de_idx" ON "correo_saliente"("estado", "enviar_despues_de");

-- CreateIndex
CREATE UNIQUE INDEX "categoria_nombre_key" ON "categoria"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "canasta_estandar_categoria_id_vigente_desde_key" ON "canasta_estandar"("categoria_id", "vigente_desde");

-- AddForeignKey
ALTER TABLE "usuario_asignacion" ADD CONSTRAINT "usuario_asignacion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_asignacion" ADD CONSTRAINT "usuario_asignacion_asignado_por_fkey" FOREIGN KEY ("asignado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitacion" ADD CONSTRAINT "invitacion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitacion" ADD CONSTRAINT "invitacion_creada_por_fkey" FOREIGN KEY ("creada_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bitacora" ADD CONSTRAINT "bitacora_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canasta_estandar" ADD CONSTRAINT "canasta_estandar_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── Restricciones que Prisma no expresa ───────────────────────────────────────

-- Un usuario interno tiene username; un Donador, correo real (modelo de datos)
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_interno_con_username"
  CHECK ("rol" = 'DONADOR' OR "username" IS NOT NULL);
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_donador_con_correo_real"
  CHECK ("rol" <> 'DONADOR' OR ("correo" IS NOT NULL AND NOT "correo_sintetico"));
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_nombre_no_vacio"
  CHECK (char_length(btrim("nombre")) > 0);

-- Restablecer acceso exige motivo de 20 caracteres o más (RF-IDE-009)
ALTER TABLE "invitacion" ADD CONSTRAINT "invitacion_restablecimiento_con_motivo"
  CHECK (NOT "es_restablecimiento" OR char_length(btrim("motivo")) >= 20);

ALTER TABLE "correo_saliente" ADD CONSTRAINT "correo_enviado_con_fecha"
  CHECK ("estado" <> 'ENVIADO' OR "enviado_en" IS NOT NULL);
ALTER TABLE "correo_saliente" ADD CONSTRAINT "correo_intentos_no_negativos"
  CHECK ("intentos" >= 0);

ALTER TABLE "categoria" ADD CONSTRAINT "categoria_nombre_no_vacio"
  CHECK (char_length(btrim("nombre")) > 0);

-- La canasta siempre cita su fuente (RF-CAT-003)
ALTER TABLE "canasta_estandar" ADD CONSTRAINT "canasta_cantidad_positiva"
  CHECK ("cantidad_persona_dia" > 0);
ALTER TABLE "canasta_estandar" ADD CONSTRAINT "canasta_con_fuente"
  CHECK (char_length(btrim("fuente")) > 0);

ALTER TABLE "emergencia" ADD CONSTRAINT "emergencia_cerrada_con_fecha"
  CHECK ("estado" <> 'CERRADA' OR "cerrada_en" IS NOT NULL);
ALTER TABLE "emergencia" ADD CONSTRAINT "emergencia_horizonte_positivo"
  CHECK ("horizonte_dias" > 0);

-- ── Permisos del rol de la API ────────────────────────────────────────────────
-- Las migraciones corren como dueño. La API se conecta como acopio_app. En Docker
-- el rol lo crea infra/db/init; aquí se asegura para entornos sin ese script.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'acopio_app') THEN
    CREATE ROLE acopio_app NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO acopio_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO acopio_app;
GRANT EXECUTE ON FUNCTION acopio_sin_tildes(text) TO acopio_app;

-- Las tablas futuras nacen con los mismos permisos. Las que deban ser append-only
-- (movimiento, reporte_necesidad) los revocan en su propia migración.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO acopio_app;

-- La bitácora es append-only (RF-IDE-012, RNF-10)
REVOKE UPDATE, DELETE, TRUNCATE ON "bitacora" FROM acopio_app;

-- La API no toca el historial de migraciones. La tabla no existe en la base
-- temporal con la que Prisma valida las migraciones.
DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    REVOKE ALL ON "_prisma_migrations" FROM acopio_app;
  END IF;
END
$$;
