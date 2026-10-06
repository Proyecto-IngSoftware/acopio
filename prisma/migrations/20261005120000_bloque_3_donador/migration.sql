-- CreateTable
CREATE TABLE "verificacion_correo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "token_hash" BYTEA NOT NULL,
    "vence_en" TIMESTAMPTZ NOT NULL,
    "usado_en" TIMESTAMPTZ,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verificacion_correo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "verificacion_correo_token_hash_key" ON "verificacion_correo"("token_hash");

-- CreateIndex
CREATE INDEX "verificacion_correo_usuario_id_idx" ON "verificacion_correo"("usuario_id");

-- AddForeignKey
ALTER TABLE "verificacion_correo" ADD CONSTRAINT "verificacion_correo_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


REVOKE DELETE, TRUNCATE ON "verificacion_correo" FROM acopio_app;
