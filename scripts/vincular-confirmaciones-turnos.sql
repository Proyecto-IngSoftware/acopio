-- Ejecutar después de revisar los conteos de auditar-correo-turnos.sql.
WITH vinculadas AS (
    UPDATE correo_saliente c
       SET reserva_id = r.id
      FROM reserva r
     WHERE c.reserva_id IS NULL
       AND c.asunto LIKE 'Tu reserva en Acopio: %'
       AND r.codigo = substring(c.cuerpo_texto FROM E'\nCódigo de reserva: ([A-HJKMNP-Z2-9]{8})\n')
       AND r.secreto_hash = encode(sha256(convert_to(substring(c.cuerpo_texto FROM
           '/voluntariado/reserva/' || r.codigo || '#([A-Za-z0-9_-]{24})' || E'\n'), 'UTF8')), 'hex')
    RETURNING 1
)
SELECT count(*) AS confirmaciones_vinculadas FROM vinculadas;
