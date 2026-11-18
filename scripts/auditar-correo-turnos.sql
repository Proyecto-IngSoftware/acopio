WITH historicos AS (
    SELECT cuerpo_texto,
           CASE
               WHEN asunto LIKE 'Tu reserva en Acopio: %' THEN 'confirmacion'
               WHEN asunto LIKE 'Cancelaste tu reserva: %' THEN 'cancelacion_reserva'
               WHEN asunto LIKE 'Cambió la jornada: %' THEN 'cambio_jornada'
               WHEN asunto LIKE 'Se canceló la jornada: %' THEN 'cancelacion_jornada'
               WHEN asunto LIKE 'Mañana: %' THEN 'recordatorio'
           END AS plantilla
    FROM correo_saliente
    WHERE reserva_id IS NULL
)
SELECT h.plantilla,
       count(*) AS mensajes_sin_vinculo,
       count(r.id) AS con_codigo_y_enlace_de_reserva,
       count(r.id) FILTER (
           WHERE r.datos_borrados_en IS NOT NULL OR j.fin <= now() - interval '720 hours'
       ) AS vinculables_y_vencidos
FROM historicos h
LEFT JOIN reserva r ON h.plantilla = 'confirmacion'
    AND r.codigo = substring(h.cuerpo_texto FROM E'\nCódigo de reserva: ([A-HJKMNP-Z2-9]{8})\n')
    AND position('/voluntariado/reserva/' || r.codigo || '#' IN h.cuerpo_texto) > 0
LEFT JOIN jornada j ON j.id = r.jornada_id
WHERE h.plantilla IS NOT NULL
GROUP BY h.plantilla
ORDER BY h.plantilla;
