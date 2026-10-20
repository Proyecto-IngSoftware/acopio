-- Presentaciones genéricas y estado del código de barras (ADR-0021, P-081).

CREATE TYPE "EstadoCatalogo" AS ENUM ('PROPUESTO', 'VALIDADO');

CREATE TABLE "presentacion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "categoria_id" UUID NOT NULL,
    "nombre" CITEXT NOT NULL,
    "tamano" DECIMAL(12,3),
    "contiene_id" UUID,
    "unidades" INTEGER,
    "estado" "EstadoCatalogo" NOT NULL,
    "creado_por" UUID NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "presentacion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "presentacion_categoria_id_nombre_key" ON "presentacion"("categoria_id", "nombre");
CREATE INDEX "presentacion_contiene_id_idx" ON "presentacion"("contiene_id");

ALTER TABLE "presentacion" ADD CONSTRAINT "presentacion_categoria_id_fkey"
  FOREIGN KEY ("categoria_id") REFERENCES "categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "presentacion" ADD CONSTRAINT "presentacion_contiene_id_fkey"
  FOREIGN KEY ("contiene_id") REFERENCES "presentacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Suelta: tamaño en la unidad base. Paquete: contiene otra presentación, de 2 a 1000 veces.
ALTER TABLE "presentacion" ADD CONSTRAINT "presentacion_clase" CHECK (
  ("tamano" IS NOT NULL AND "tamano" > 0 AND "contiene_id" IS NULL AND "unidades" IS NULL)
  OR ("tamano" IS NULL AND "contiene_id" IS NOT NULL AND "unidades" BETWEEN 2 AND 1000)
);

ALTER TABLE "codigo_barras"
  ADD COLUMN "presentacion_id" UUID,
  ADD COLUMN "estado" "EstadoCatalogo" NOT NULL DEFAULT 'VALIDADO',
  ADD COLUMN "por_revisar" BOOLEAN NOT NULL DEFAULT false;

-- Datos: una presentación suelta por cada par (categoría, contenido) de los códigos con contenido.
INSERT INTO "presentacion" ("categoria_id", "nombre", "tamano", "estado", "creado_por", "creado_en")
SELECT DISTINCT ON (cb."categoria_id", cb."contenido")
  cb."categoria_id",
  c."nombre" || ' ' || trim_scale(cb."contenido")::text || ' ' ||
    CASE c."unidad_base" WHEN 'KILOGRAMO' THEN 'kg' WHEN 'LITRO' THEN 'L' ELSE 'und.' END,
  cb."contenido",
  'VALIDADO',
  cb."creado_por",
  cb."creado_en"
FROM "codigo_barras" cb
JOIN "categoria" c ON c."id" = cb."categoria_id"
WHERE cb."contenido" IS NOT NULL
ORDER BY cb."categoria_id", cb."contenido", cb."creado_en" ASC, cb."ean" ASC;

UPDATE "codigo_barras" cb
SET "presentacion_id" = p."id"
FROM "presentacion" p
WHERE cb."contenido" IS NOT NULL
  AND p."categoria_id" = cb."categoria_id"
  AND p."tamano" = cb."contenido";

UPDATE "codigo_barras" SET "por_revisar" = true WHERE "presentacion_id" IS NULL;

ALTER TABLE "codigo_barras" DROP CONSTRAINT "codigo_barras_contenido_positivo";
ALTER TABLE "codigo_barras"
  DROP COLUMN "contenido",
  DROP COLUMN "descripcion",
  DROP COLUMN "revisado";

CREATE INDEX "codigo_barras_presentacion_id_idx" ON "codigo_barras"("presentacion_id");
ALTER TABLE "codigo_barras" ADD CONSTRAINT "codigo_barras_presentacion_id_fkey"
  FOREIGN KEY ("presentacion_id") REFERENCES "presentacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
