---
title: "Investigaciones — evidencia de decisiones de diseño"
type: contexto
tags: [contexto]
estado: vigente
actualizado: 2026-09-28
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

## I-005 · ¿Un centro de acopio atiende varias emergencias a la vez?

**Fecha:** 2026-09-14
**Pregunta:** ¿hay una fuente que respalde que un mismo centro de acopio —o una red
como la de la Cruz Roja— atiende varias emergencias al mismo tiempo, y que quien
entrega no decide a cuál va su donación?
**Por qué importa:** es el argumento de
[ADR-0010](../02-arquitectura/adr/ADR-0010-varias-emergencias-activas.md) para que el
acopio no pertenezca a una emergencia ([P-024](../01-requerimientos/pendientes.md)).

**Origen:** dos fuentes que propuso el equipo, junto con un resumen: «clasificación de
los centros de acopio en redes unificadas para una misma emergencia y la gestión de
crisis simultáneas para diferentes eventos adversos». Se leyeron completas para
verificar ese resumen.

**Hallazgo — el resumen no se sostiene en el texto.** Ninguna de las dos fuentes habla
de centros de acopio que atiendan varias emergencias a la vez, ni de redes unificadas
ni de crisis simultáneas. En ninguna aparecen «simultáneo», «varias emergencias»,
«múltiples desastres» ni «eventos adversos».

**Hallazgo — el protocolo de la ANDI sí sirve para otras piezas.** *Protocolo de
coordinación del sector privado como parte del Sistema Nacional de Gestión del Riesgo
de Desastres (SNGRD) en la respuesta a emergencias y desastres*, elaborado para la
ANDI por Trust Consultores, 2019. Páginas según la numeración impresa:
- Define el centro de acopio como el lugar donde «se recibe, selecciona, clasifica,
  cuenta, embalaje, etiqueta y se almacena todos los donativos captados [...] para ser
  destinados a los sitios donde se necesita» (p. 20, citando el manual operativo de
  centros de acopio de CEMEFI-Cáritas, México). La donación no llega marcada con un
  destino: el acopio la dirige según la necesidad.
- El destino lo fija quien coordina, a partir de la Evaluación de Daños y Análisis de
  Necesidades (EDAN): la UNGRD emite la solicitud de apoyo con «dónde y en qué tiempo
  deben ser entregados» (p. 20), y la entrega se coordina «en el lugar indicado por la
  UNGRD» (p. 16).
- Los puntos de acopio los administra la UNGRD, o los delega en «la Cruz Roja, la
  Defensa Civil, la Policía, ABACO con sus Bancos de Alimentos» u otra entidad con
  capacidad (p. 24).
- En el punto de acopio se verifica «que la carga corresponde al inventario
  relacionado en el manifiesto» (p. 25), y lo que no se acepta no se guarda: «no
  almacenará provisionalmente cargas no aceptadas» (p. 26).
- La solicitud de apoyo prioriza cada elemento por plazo: «Alta: menos de 48 horas -
  Media: 3 a 7 días - Baja: 5 a 15 días» (Formato 001, p. 48).
- ANDI — <https://www.andi.com.co/Uploads/PROTOCOLO%20DE%20LECTURA.pdf> — consultado 2026-09-14

**Hallazgo — el artículo de SciELO es poco pertinente.** López-Vargas, J. C. y
Cárdenas-Aguirre, D. M. (2017). *Gestión de la logística humanitaria en las etapas
previas al desastre: revisión sistemática de la literatura*. Revista de Investigación,
Desarrollo e Innovación, 7(2), 203-216. doi:10.19053/20278306.v7.n2.2017.6094. Revisa
la literatura sobre la preparación antes del desastre; menciona los centros de acopio
una sola vez, como una decisión de ubicación en esa etapa. No trata la operación de
los acopios durante la respuesta ni las emergencias simultáneas.
- SciELO Colombia — <http://www.scielo.org.co/scielo.php?script=sci_arttext&pid=S2027-83062017000100203> — consultado 2026-09-14. El servidor rechaza HTTPS; se abre por HTTP.

**Conclusión aplicada:**
- La afirmación de ADR-0010 —un mismo acopio atiende varias emergencias a la vez—
  **sigue sin fuente**. Queda como afirmación del equipo, marcada así en ADR-0010 y en
  P-024.
- El protocolo de la ANDI sí respalda la otra mitad del argumento: el acopio no recibe
  donaciones marcadas por quien las entrega, las destina a donde se necesitan, y el
  destino lo fija quien coordina a partir de la evaluación de necesidades. Eso sostiene
  que el acopio no dependa de una emergencia y que el motor ordene por necesidad, con
  aprobación humana (RN-04 y RN-07 del
  [Avance 2](../entregas/avance-02-requisitos.md#3-restricciones-y-reglas-de-negocio)).
- De paso respalda piezas ya diseñadas, sin cambiarlas: verificar la carga contra el
  manifiesto se parece a conciliar lo declarado contra lo confirmado (RF-08); rechazar
  sin almacenar se parece a «no recibir» (RF-06); y la prioridad por plazo es candidata
  para la urgencia del reporte de necesidad (RF-13), por evaluar.

---

## I-006 · Cantidades por persona para la canasta estándar

**Fecha:** 2026-09-28
**Pregunta:** ¿qué fuente dice cuánto necesita una persona al día de cada categoría del
catálogo?
**Por qué importa:** es la base del cálculo de déficit del motor
([P-001](../01-requerimientos/pendientes.md)). Sin fuente, el número no se puede
defender.

**Hallazgo — no hay una cifra única.** Los artículos que buscó el equipo dan cantidades
muy distintas entre sí para casi todo. Solo el agua, la energía y el jabón tienen una
norma aceptada.

**Hallazgo — Manual Esfera 2018.** 15 L de agua por persona al día para beber, cocinar
e higiene (norma 2.1 de abastecimiento de agua). 2.100 kcal por persona al día, sin
fijar qué alimentos. 250 g de jabón de baño y 200 g de jabón de lavar por persona al
mes. **Supuesto a verificar:** las cifras de jabón salen de resultados de búsqueda; el
PDF no se pudo abrir desde el entorno de trabajo.
- Manual Esfera 2018 — <https://spherestandards.org/wp-content/uploads/Sphere-Handbook-2018-EN.pdf> — consultado 2026-09-28
- Specialized Logistics, norma de agua de Esfera — <https://www.specializedlogistics.org/post/sizing-pump-capacity-to-sphere-water-point-standards> — consultado 2026-09-28

**Hallazgo — UNGRD.** El *Manual de estandarización de la ayuda humanitaria de
Colombia* (2013) es la guía oficial de la UNGRD para los kits de ayuda. El kit
alimentario lleva arroz, aceite, leche, pasta, azúcar, sal, café y harina para arepa, y
se entrega por familia según su composición. **Supuesto a verificar:** la lista sale de
resultados de búsqueda; las cantidades por persona no se pudieron leer.
- UNGRD, estandarización de ayuda humanitaria — <https://portal.gestiondelriesgo.gov.co/Documents/Manuales/Manual_de_Estandarizacion_AHE_de_Colombia.pdf> — consultado 2026-09-28
- UNGRD, kit alimentario de emergencia — <https://portal.gestiondelriesgo.gov.co/Paginas/Adquisicion-productos-Kit-Alimentario-de-Emergencia.aspx> — consultado 2026-09-28

**Conclusión aplicada:** solo 10 de las 39 categorías llevan canasta. Los alimentos se
reparten para sumar las 2.100 kcal de Esfera con productos del kit de la UNGRD; es un
cálculo propio, declarado como tal en `canasta_estandar.fuente`. Las demás categorías
se mueven por el reporte del Receptor. Detalle y lista de verificación en
[catalogo-inicial.md](../01-requerimientos/catalogo-inicial.md).

---

## Relacionado

- [Evidencia inicial del Avance 1](../entregas/avance-01-sprint0.md#evidencia-inicial) — evidencia del problema en general
- [Pendientes](../01-requerimientos/pendientes.md) — P-013, decisión que se apoya en I-001
- [Modelo de datos](../02-arquitectura/modelo-datos.md) — `remision.evidencia_keys`
