BEGIN;

ALTER TABLE correo_saliente ADD COLUMN recordatorio_inicio TIMESTAMPTZ;

-- El inicio sigue siendo el que se usó al encolar estos recordatorios.
UPDATE correo_saliente c
   SET recordatorio_inicio = j.inicio
  FROM reserva r
  JOIN jornada j ON j.id = r.jornada_id
 WHERE c.reserva_id = r.id
   AND c.estado IN ('PENDIENTE', 'FALLIDO')
   AND c.asunto LIKE 'Mañana: %'
   AND position(E'\nDetalle de la jornada:\n' IN c.cuerpo_texto) > 0
   AND r.estado = 'ACTIVA'
   AND j.estado IN ('ABIERTA', 'CERRADA')
   AND j.inicio > now()
   AND j.inicio > r.recordatorio_en
   AND j.inicio <= r.recordatorio_en + interval '24 hours'
   AND (j.movida_en IS NULL OR j.movida_en <= r.recordatorio_en);

-- La bitácora distingue el cambio de inicio de los cambios de lugar o de hora de fin.
UPDATE reserva r
   SET recordatorio_en = NULL
  FROM jornada j
 WHERE j.id = r.jornada_id
   AND r.estado = 'ACTIVA'
   AND j.estado IN ('ABIERTA', 'CERRADA')
   AND j.inicio > now()
   AND j.movida_en > r.recordatorio_en
   AND EXISTS (
       SELECT 1
       FROM bitacora b
       WHERE b.entidad = 'jornada'
         AND b.entidad_id = j.id::text
         AND b.accion = 'jornada.editada'
         AND b.ocurrido_en > r.recordatorio_en
         AND b.datos_antes->>'inicio' <> b.datos_despues->>'inicio'
   );

COMMIT;
