BEGIN;

LOCK TABLE movimiento IN SHARE ROW EXCLUSIVE MODE;

CREATE INDEX movimiento_acopio_id_categoria_id_secuencia_idx
  ON movimiento (acopio_id, categoria_id, secuencia);

CREATE TABLE saldo_historial_bloque (
  acopio_id uuid NOT NULL,
  categoria_id uuid NOT NULL,
  bloque bigint NOT NULL,
  variacion numeric NOT NULL,
  PRIMARY KEY (acopio_id, categoria_id, bloque)
);
REVOKE INSERT, UPDATE, DELETE ON saldo_historial_bloque FROM acopio_app;
GRANT SELECT ON saldo_historial_bloque TO acopio_app;

INSERT INTO saldo_historial_bloque (acopio_id, categoria_id, bloque, variacion)
SELECT acopio_id, categoria_id, secuencia / 1024, SUM(cantidad * signo)
FROM movimiento
WHERE acopio_id IS NOT NULL
GROUP BY acopio_id, categoria_id, secuencia / 1024;

CREATE FUNCTION inventario_actualizar_bloque_historial() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO saldo_historial_bloque (acopio_id, categoria_id, bloque, variacion)
  VALUES (NEW.acopio_id, NEW.categoria_id, NEW.secuencia / 1024, NEW.cantidad * NEW.signo)
  ON CONFLICT (acopio_id, categoria_id, bloque) DO UPDATE
    SET variacion = saldo_historial_bloque.variacion + EXCLUDED.variacion;
  RETURN NULL;
END
$$;

CREATE TRIGGER movimiento_actualiza_saldo_historial
  AFTER INSERT ON movimiento
  FOR EACH ROW WHEN (NEW.acopio_id IS NOT NULL)
  EXECUTE FUNCTION inventario_actualizar_bloque_historial();

COMMIT;
