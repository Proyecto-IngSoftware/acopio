-- Con INSERT … ON CONFLICT DO UPDATE, PostgreSQL revisa los CHECK sobre la fila
-- propuesta antes de resolver el conflicto: una salida (cantidad negativa) fallaba
-- aunque el saldo alcanzara. Primero se actualiza la fila; solo si no existe se inserta.
CREATE OR REPLACE FUNCTION inventario_actualizar_saldo() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE saldo
     SET cantidad = cantidad + NEW.cantidad * NEW.signo,
         ultimo_movimiento = GREATEST(ultimo_movimiento, NEW.registrado_en)
   WHERE acopio_id = NEW.acopio_id AND categoria_id = NEW.categoria_id;
  IF NOT FOUND THEN
    -- Primera vez de la categoría en el acopio. Si otra transacción la creó en medio,
    -- ON CONFLICT suma sobre esa fila.
    INSERT INTO saldo (acopio_id, categoria_id, cantidad, ultimo_movimiento)
    VALUES (NEW.acopio_id, NEW.categoria_id, NEW.cantidad * NEW.signo, NEW.registrado_en)
    ON CONFLICT (acopio_id, categoria_id) DO UPDATE
      SET cantidad = saldo.cantidad + EXCLUDED.cantidad,
          ultimo_movimiento = GREATEST(saldo.ultimo_movimiento, EXCLUDED.ultimo_movimiento);
  END IF;
  RETURN NULL;
END
$$;
