-- Bloque 4, etapa 2: dos menores de la revisión final de la etapa 1.

-- Una sugerencia decidida no se edita: solo una PROPUESTA cambia (pasa a APROBADA o DESCARTADA)
CREATE FUNCTION motor_sugerencia_inmutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.estado <> 'PROPUESTA' THEN
    RAISE EXCEPTION 'sugerencia_decidida: la sugerencia % ya se decidió', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER sugerencia_inmutable
  BEFORE UPDATE ON sugerencia
  FOR EACH ROW EXECUTE FUNCTION motor_sugerencia_inmutable();

-- Una línea no cambia de remisión ni de categoría, tampoco en BORRADOR
CREATE FUNCTION motor_linea_fija() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.remision_id <> OLD.remision_id OR NEW.categoria_id <> OLD.categoria_id THEN
    RAISE EXCEPTION 'linea_remision_fija: la línea % no cambia de remisión ni de categoría', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER linea_remision_fija
  BEFORE UPDATE ON linea_remision
  FOR EACH ROW EXECUTE FUNCTION motor_linea_fija();
