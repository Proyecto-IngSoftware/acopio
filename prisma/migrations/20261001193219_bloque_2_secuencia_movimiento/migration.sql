-- Orden en que cada movimiento entró a la base. registrado_en es la hora de inicio de
-- la transacción: una salida que esperó el candado puede tener una hora anterior a la
-- entrada que gastó, y ordenar por ella mostraba un saldo corriente negativo. Las filas
-- existentes reciben valores en el orden en que están guardadas.
ALTER TABLE "movimiento" ADD COLUMN "secuencia" BIGSERIAL NOT NULL;
CREATE UNIQUE INDEX "movimiento_secuencia_key" ON "movimiento"("secuencia");

-- Los privilegios por defecto cubren tablas, no secuencias
GRANT USAGE, SELECT ON SEQUENCE "movimiento_secuencia_seq" TO acopio_app;
