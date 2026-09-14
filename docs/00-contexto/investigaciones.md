---
title: "Investigaciones — evidencia de decisiones de diseño"
type: contexto
tags: [contexto]
estado: vigente
actualizado: 2026-09-14
---

# Investigaciones — evidencia de decisiones de diseño

Registro de las búsquedas hechas para sustentar una decisión de diseño concreta —
distinto de la [evidencia inicial del Avance 1](../entregas/avance-01-sprint0.md#evidencia-inicial),
que sustenta el problema en general. Mismo criterio: toda afirmación que viene de
afuera lleva su fuente y su fecha de consulta. Sin fuente, es una suposición, y se
anota como tal.

Se agrega una entrada cada vez que una decisión de diseño se apoya en una búsqueda,
no en un supuesto del equipo.

---

## Formato

```markdown
## I-000 · Pregunta corta
**Fecha:** AAAA-MM-DD
**Pregunta:** qué se necesitaba saber para decidir.
**Por qué importa:** qué decisión de diseño depende de la respuesta.
**Hallazgo:** lo que se encontró, con fuente y fecha de consulta por cada afirmación.
**Conclusión aplicada:** qué se decidió a partir de esto, y dónde quedó escrito.
```

---

## I-001 · Confirmación de recepción en el último tramo (*last mile*)

**Fecha:** 2026-09-12
**Pregunta:** en la práctica real, ¿quien recibe ayuda humanitaria en el punto de
entrega hace un conteo riguroso por unidad, o prioriza la velocidad de reparto sobre
el control, bajo la presión de una emergencia?
**Por qué importa:** define qué tan exigente puede ser [RF-MOT-009](../01-requerimientos/funcionales/motor.md#rf-mot-009)
(confirmación de recepción del Receptor) sin que, bajo presión real, la gente deje
de usarlo — el mismo riesgo que ya obligó a que [RF-INV-001](../01-requerimientos/funcionales/inventario.md)
exija menos de diez segundos.

**Hallazgo — a escala institucional, sí hay control formal.** Una donación
internacional de 77,6 toneladas enviada por China se formalizó con un acta firmada
entre representantes de la *National Pharmaceutical Foreign Trade Corporation* y el
gobierno colombiano, y la UNGRD coordinó su distribución hacia el Valle del Cauca
según necesidades identificadas.
- El Colombiano — <https://www.elcolombiano.com/colombia/china-ayuda-humanitaria-colombia-terremoto-EC40068158> — consultado 2026-09-12
- La República — <https://www.larepublica.co/globoeconomia/llego-a-colombia-ayuda-humanitaria-de-china-para-damnificados-del-reciente-terremoto-4461440> — consultado 2026-09-12
- Semana — <https://www.semana.com/nacion/articulo/china-dona-mas-de-77-toneladas-de-ayuda-humanitaria-a-colombia-tras-terremoto-cargamento-sera-enviado-al-valle-del-cauca/202620/> — consultado 2026-09-12

**Hallazgo — a escala comunitaria y espontánea, que es el contexto real de Acopio,
no lo hay.** El Distrito tuvo que cerrar los puntos de acopio descentralizados «por
incapacidad logística para coordinar múltiples puntos ciegos» y concentrar todo en
el Palacio de los Deportes — ya citado en el
[Avance 1](../entregas/avance-01-sprint0.md#evidencia-inicial). La literatura de
logística humanitaria coincide en que el último tramo es la etapa de mayor
incertidumbre, y donde el control se rompe con más frecuencia:
- *Last Mile Distribution in Humanitarian Relief* — Journal of Intelligent
  Transportation Systems — <https://www.tandfonline.com/doi/abs/10.1080/15472450802023329> — consultado 2026-09-12
- Guía de logística humanitaria — AidWorkers.com — <https://www.aidworkers.com/programme-management/humanitarian-logistics/> — consultado 2026-09-12

**Conclusión aplicada:** [RF-MOT-009](../01-requerimientos/funcionales/motor.md#rf-mot-009)
se diseñó siguiendo la práctica real del contexto comunitario —botón «Recibido» +
foto, sin conteo por categoría—, no la práctica de donaciones interinstitucionales a
gran escala, que no es el caso de uso de Acopio. Un conteo más riguroso queda como
mejora de una fase posterior (ver [pendientes.md](../01-requerimientos/pendientes.md), P-013).

---

## I-002 · Rendición de cuentas en distribución humanitaria (Sphere / CHS)

**Fecha:** 2026-09-12
**Pregunta:** ¿existe un estándar internacional formal —tipo hoja de conteo— sobre
cómo verificar una entrega en el punto de distribución?
**Por qué importa:** si existiera un estándar operativo concreto, sería la base más
defendible para diseñar la confirmación de recepción, en vez de una decisión de
producto sin respaldo externo.

**Hallazgo:** el Core Humanitarian Standard (CHS) y el Manual Esfera exigen, como
compromiso de rendición de cuentas, documentar qué se envió y qué llegó. Ninguna de
las fuentes consultadas especifica una herramienta operativa de campo concreta
—como una hoja de conteo estandarizada— de acceso público.
- Core Humanitarian Standard — Sphere Standards — <https://spherestandards.org/humanitarian-standards/core-humanitarian-standard/> — consultado 2026-09-12
- Manual Esfera — ya citado en el [Avance 1](../entregas/avance-01-sprint0.md#evidencia-inicial)

**Conclusión aplicada:** sin un estándar operativo público que copiar, el diseño se
apoya en I-001 en su lugar. `evidencia_keys` (fotografía obligatoria en
`remision`) cumple el principio de rendición de cuentas del CHS sin exigir una
herramienta de conteo que el Receptor real no puede usar bajo presión.

---

## I-003 · Fuente externa de acopios: RedAcopio Bogotá

**Fecha:** 2026-09-14
**Pregunta:** ¿cómo publica RedAcopio Bogotá sus puntos de acopio, qué datos trae
cada uno, y bajo qué condiciones se pueden reutilizar?
**Por qué importa:** define si el mapa puede traer esos puntos de forma automática
([RF-RED-011](../01-requerimientos/funcionales/red.md#rf-red-011--importar-acopios-de-una-fuente-externa))
y con qué riesgo.

**Hallazgo — cómo publica.** Es una aplicación Next.js servida desde Vercel detrás
de Cloudflare. Los puntos llegan serializados como JSON dentro del HTML de la
portada; no se encontró una ruta `/api` pública. Usa OpenStreetMap para su mapa.
- RedAcopio Bogotá — <https://redacopiobogota.com/> — consultado 2026-09-14

**Hallazgo — qué trae.** 88 puntos, todos con `verification_status: verificado`.
Estados: 55 abiertos, 31 cerrados, 1 lleno, 1 sin información. Última
actualización entre el 2026-08-14 y el 2026-09-13. Campos por punto: `id`, `name`,
`address`, `lat`, `lng`, `status`, `hours`, `flow` (afluencia), `needs` (texto libre
con nivel, por ejemplo `{lvl: urgente, item: Camión}`), `vol` (voluntarios
necesarios), `contact`, `source`, `external_id`, `authorizing_entity` y
`updated_at`. Las necesidades no siguen un catálogo.
- Misma fuente, consultada 2026-09-14

**Hallazgo — condiciones.** La política de privacidad dice *«No compartimos datos
con terceros ni los usamos con fines comerciales»*, y que el sitio coordina *«puntos
de acopio autorizados por IDIGER / Alcaldía de Bogotá»*. No dice nada sobre
reutilización ni licencia de los datos de los puntos. El `robots.txt` permite el
acceso a cualquier agente genérico con `Content-Signal: search=yes, ai-train=no,
use=reference`.
- Privacidad — <https://redacopiobogota.com/privacidad> — consultado 2026-09-14
- robots.txt — <https://redacopiobogota.com/robots.txt> — consultado 2026-09-14

**Hallazgo — fuente oficial.** La Alcaldía lista 6 puntos, sin coordenadas ni datos
descargables, en una página publicada el 2026-08-10.
- Alcaldía de Bogotá — <https://bogota.gov.co/mi-ciudad/seguridad/puntos-de-donacion-en-bogota-para-damnificados-terremoto-en-colombia> — consultado 2026-09-14

**Conclusión aplicada:** importación automática con riesgo aceptado y salvaguardas
([P-022](../01-requerimientos/pendientes.md)). Los puntos entran como
referenciados, sin inventario, con su fuente visible.

---

## I-004 · Condiciones de los servicios externos gratuitos

**Fecha:** 2026-09-14
**Pregunta:** ¿qué límites imponen los servicios gratuitos de los que depende
Acopio —mosaicos de mapa, geocodificación y correo—?
**Por qué importa:** una política de uso incumplida bloquea el servicio el día de
la demostración.

**Hallazgo — mosaicos de OpenStreetMap.** Permiten la visualización interactiva de
una persona; prohíben la descarga masiva o anticipada para uso sin conexión; toda
petición debe identificar al sitio con su `Referer`.
- OSMF Tile Usage Policy — <https://operations.osmfoundation.org/policies/tiles/> — consultado 2026-09-14

**Hallazgo — Nominatim.** Máximo una petición por segundo, resultados guardados en
caché por el cliente, User-Agent o Referer que identifique la aplicación. Las
tareas masivas o recurrentes están restringidas.
- Nominatim Usage Policy — <https://operations.osmfoundation.org/policies/nominatim/> — consultado 2026-09-14

**Hallazgo — correo de Supabase Auth.** Su servidor por defecto envía 2 mensajes
por hora, sin garantía de entrega, y no es para producción. Con SMTP propio el
límite inicial es de 30 por hora y se ajusta.
- Supabase — <https://supabase.com/docs/guides/auth/auth-smtp> — consultado 2026-09-14

**Hallazgo — SMTP de Microsoft 365.** Exchange Online permite el envío SMTP con
usuario y contraseña hasta finales de diciembre de 2026; después exige OAuth. Para
cuentas personales no se encontró la fecha: **supuesto a verificar** en el spike
del Sprint 1.
- Microsoft Tech Community — <https://techcommunity.microsoft.com/blog/exchange/exchange-online-to-retire-basic-auth-for-client-submission-smtp-auth/4114750> — consultado 2026-09-14
- Office 365 for IT Pros — <https://office365itpros.com/2026/01/29/smtp-auth-basic-retirement/> — consultado 2026-09-14

**Conclusión aplicada:** criterios de mapa en
[RF-RED-002](../01-requerimientos/funcionales/red.md#rf-red-002--mapa-público-de-acopios),
geocodificación solo desde la API, Supabase con el SMTP propio
([despliegue.md](../06-operacion/despliegue.md#configuración-de-supabase)), y dos
riesgos en la matriz del ADR-0008.

---

## Relacionado

- [Evidencia inicial del Avance 1](../entregas/avance-01-sprint0.md#evidencia-inicial) — evidencia del problema en general
- [Pendientes](../01-requerimientos/pendientes.md) — P-013, decisión que se apoya en I-001
- [Modelo de datos](../02-arquitectura/modelo-datos.md) — `remision.evidencia_keys`
