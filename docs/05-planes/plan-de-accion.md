---
title: "Plan de acción del proyecto"
type: plan
tags: [plan, seguimiento, cronograma]
estado: vigente
actualizado: 2026-10-18
---

# Plan de acción del proyecto

Lista única de lo que falta hasta la entrega final, en orden de prioridad, con el issue que
lleva cada punto. Los planes de cada bloque dicen cómo se construye algo; este dice qué sigue
y si va a tiempo. Las fechas máximas por semana vienen del [cronograma](cronograma.md). Las
fechas objetivo anteriores al 23 de octubre las propuso Claude el 2026-10-18 y Joseph las
puede mover.

## Cómo se mantiene

El plan se corrige cada vez que pasa algo, no al final de la semana:

- Se cierra, se abre o se crea un issue, o se fusiona un PR: se corrige la fila que toca y se
  agrega una línea al [registro de cambios](#registro-de-cambios). El hook
  `.claude/hooks/plan-de-accion.mjs` lo recuerda después de cada `gh issue` y `gh pr merge`.
- Aparece un hallazgo, una consigna nueva del curso o una decisión de Joseph: entra como
  `P-0NN` o issue, y si cambia una prioridad o una fecha, también aquí.
- Al retomar una sesión se corre `node scripts/revisar-plan.mjs`. Compara cada fila con
  GitHub y avisa si una fila dice hecho y el issue sigue abierto, si un issue cerrado sigue
  como pendiente, si una fecha ya pasó o si hay un issue abierto que el plan no nombra. Sale
  con 1 si encuentra algo.
- Al cerrar una sesión, el informe enlaza las filas que cambiaron.

Estados de una fila: ✅ hecho, 🟡 en curso, ⬜ pendiente y ⛔ bloqueado. Todo lo ejecuta Joseph
(CLAUDE.md, «Flujo de trabajo»); los issues conservan el reparto por rol del curso.

Si el tiempo no alcanza, se recorta en este orden: el Bloque 6, la pieza D y la deuda menor.
La pieza E no se recorta porque completa HU-01, que es Must.

## Fechas que mandan

| Fecha | Qué pasa |
|---|---|
| Viernes 23 de octubre | Sustentación del segundo corte y Review del Sprint 2 |
| Domingo 25 de octubre | Fin del Sprint 2 ([P-047](../01-requerimientos/pendientes.md)) |
| Lunes 26 de octubre | Planning del Sprint 3 |
| Miércoles 21 de octubre | Pieza E desplegada en el servidor de pruebas |
| Domingo 15 de noviembre | Pieza D del Bloque 1 |
| Viernes 20 de noviembre | Review del Sprint 3 |
| Domingo 29 de noviembre | Congelamiento y calidad |
| Semana 18, hasta el 6 de diciembre | Entrega final y sustentación |

## Ahora: hasta la sustentación del 23 de octubre

| # | Qué | Issue | Fecha | Estado |
|---|---|---|---|---|
| 1 | Fecha de la Review del Sprint 2: el viernes 23, según la guía ([P-072](../01-requerimientos/pendientes.md)) | P-072 | 2026-10-18 | ✅ |
| 2 | Avance 5 en el Word de OneDrive: pantallas con su flujo, patrones, registro del Sprint 2 y enlace al repositorio. Generado y revisado renderizado; faltan la captura del tablero, la del seguimiento y subirlo | #47 | 2026-10-22 | 🟡 |
| 3 | Lo que falta del Word de avances anteriores. Del Avance 4 ya está la captura del tablero; faltan el seguimiento del 9 de octubre con su captura, las filas de Brayan, Alejandra y Michael, la retrospectiva confirmada y regenerar el Word. Del Avance 2, la revisión de redacción ([P-012](../01-requerimientos/pendientes.md)) y la captura de la vista Board | #45, #23, #21 | 2026-10-22 | ⬜ |
| 4 | Sustentación: proyecto en ejecución sobre la demo del servidor y diagrama de paquetes. La demo del servidor ya tiene el balance de la portada y las causas con imagen, y el diagrama de paquetes está al día con turnos | #47 | 2026-10-23 | ⬜ |
| 5 | Ronda de pruebas en el servidor, por rol, con los escenarios de `escenarios-por-rol.md`; cada hallazgo entra como issue `hallazgo` | #58 | 2026-10-25 | ⬜ |
| 6 | Cierre del Sprint 2: Review historia por historia el 23, seguimiento de la semana 12 con captura y retrospectiva con una acción para el Sprint 3 | #47 | 2026-10-25 | ⬜ |

### Pieza E en esta semana

Joseph decidió el 2026-10-18 adelantar la pieza E y mostrarla en el servidor para la
sustentación. Si las maquetas no están aprobadas el martes 20 por la noche, se despliega solo el
backend con los puntos ocultos en el portal, y las pantallas pasan a después del 23.

| # | Qué | Issue | Fecha | Estado |
|---|---|---|---|---|
| 8a | Especificación: acopio referenciado, módulo `importacion`, copia guardada de RedAcopio, carga por CSV para todos los módulos (solo backend, con los endpoints listos para una pantalla futura) y lista de «otras plataformas» de `/herramientas`. La lectura programada cada 60 minutos queda escrita y apagada | #49 | 2026-10-18 | 🟡 |
| 8b | Maquetas en Stitch: marcador de referenciado en P05, ficha de referenciado en P06 y lista de otras plataformas. Las aprueba Joseph | #49 | 2026-10-19 | ⬜ |
| 8c | Backend: migración, importador con la copia guardada, carga por CSV y sus pruebas | #49 | 2026-10-20 | ⬜ |
| 8d | Pantallas P05, P06 y otras plataformas | #49 | 2026-10-21 | ⬜ |
| 8e | Despliegue en Dokploy con los 88 puntos y recorridos contra el servidor | #49 | 2026-10-21 | ⬜ |

## Sprint 3: del 26 de octubre al 22 de noviembre

| # | Qué | Issue | Fecha | Estado |
|---|---|---|---|---|
| 7 | Planning del Sprint 3 | #51 | 2026-10-26 | ⬜ |
| 8 | Pieza E: pasó a esta semana, filas 8a a 8e. Lo que no alcance antes del 23 vuelve aquí | #49 | 2026-11-15 | 🟡 |
| 9 | Pieza D: contenido del home, páginas legales y Open Graph, con su ADR. El balance de la portada (P-073) ya quedó hecho. Joseph la une a la pieza E: el Open Graph de la ficha del acopio, referenciado u operado, sigue a la ficha de la fila 8d | #50 | 2026-11-15 | ⬜ |
| 10 | Escáner probado con un teléfono y un código real contra el servidor | #40 | 2026-11-15 | ⬜ |
| 11 | Review y retrospectiva del Sprint 3 | #51 | 2026-11-20 | ⬜ |
| 12 | Bloque 6: bitácora enriquecida, transparencia y publicaciones. Es lo primero que se recorta | #37 | 2026-11-22 | ⬜ |
| 13 | Deuda de las revisiones: menores de los bloques 1 a 3 (P-034, P-038 y los del Bloque 3) y la imagen que falta en Garage (P-058). Los del cierre del Bloque 5 (P-070, P-071, #129) quedaron hechos el 18 de octubre | #43 | 2026-11-22 | 🟡 |
| 14 | P5 de Stitch con el filtro viejo | #39 | 2026-11-22 | ⬜ |
| 15 | Íconos que se ven como texto mientras baja su fuente | #41 | 2026-11-22 | ⬜ |

## Cierre: del 23 de noviembre al 6 de diciembre

| # | Qué | Issue | Fecha | Estado |
|---|---|---|---|---|
| 16 | RNF y escenarios de calidad verificados, cada uno con su prueba | #25 | 2026-11-29 | ⬜ |
| 17 | Revisión final del ADR-001 y su matriz de riesgos | #24 | 2026-11-29 | ⬜ |
| 18 | Despliegue: probar el SMTP desde Supabase y decidir cómo se lee Garage en producción (P-041) | #26 | 2026-11-29 | ⬜ |
| 19 | Congelamiento, recorridos contra el servidor, Word final, ensayo y sustentación final | #52 | 2026-12-06 | ⬜ |

## Se vigila sin fecha

Estos pendientes no tienen issue propio. Se revisan cuando se toca su tema:
[P-057](../01-requerimientos/pendientes.md) (fallos de red intermitentes contra el servidor,
dentro de #58), P-060 (el usuario recordado no vence, para después de la presentación),
P-063 (el hook de commits fuera del repositorio, cuando se sume otra persona) y P-050 (DAO en
el Avance 5). P-043 (pantalla del simulador del motor) y P-044 (estado automático de una
zona) son mejoras del motor que ninguna historia Must pide; se revisan en el Planning del
Sprint 3.

## Hecho

| Qué | Issue | Cerrado | Estado |
|---|---|---|---|
| Grises piedra en fondos y bordes (ADR-0020), íconos por grupo de categoría y en la bitácora, «Lo que urge» y jornadas de la portada conectados (P-074) | | 2026-10-18 | ✅ |
| Bloque 5, turnos: API, interfaz y cierre, con HU-03 revisada en el servidor | #36 | 2026-10-18 | ✅ |
| Pieza C: verificación de entidades y causas, con HU-02 y HU-15 | #48 | 2026-10-18 | ✅ |
| Bloque 4, motor: API y los tres ciclos de interfaz | #35 | 2026-10-18 | ✅ |
| Escenarios de prueba por rol | #55 | 2026-10-18 | ✅ |
| Plan de acción con `revisar-plan.mjs` y el hook que recuerda actualizarlo (PR 130) | | 2026-10-18 | ✅ |
| Balance de la portada conectado a la API, P-073 (PR 134) | | 2026-10-18 | ✅ |
| Causas de la demo con imagen y entidades con logotipo (PR 134) | | 2026-10-18 | ✅ |
| Diagrama de paquetes con turnos y PNG de todos los diagramas regenerados (PR 132) | | 2026-10-18 | ✅ |
| Recorridos que guardan capturas para el Word con `CAPTURAS_WORD` (PR 134) | | 2026-10-18 | ✅ |
| Contenedor para renderizar los Word de los avances, `render.Dockerfile` (PR 133) | | 2026-10-18 | ✅ |

## Registro de cambios

- 2026-10-18: se crea el plan a partir del estado de GitHub, los pendientes y el cronograma.
  Se cierran #35 y #55, que ya estaban hechos. #45, #23 y #21 pasan a la semana 12 y #26 a la
  17. Nace #129 con P-070 y P-071. #47 suma las casillas del Avance 5 y de la sustentación.
- 2026-10-18: P-072 resuelto, la Review es el 23. El Word del Avance 5 queda generado con
  `generar-avance-05.py` y unido al documento de avances; pasa a en curso hasta que estén las
  dos capturas, la retrospectiva y la subida a OneDrive.
- 2026-10-18: el Word del Avance 5 suma los diagramas al día (paquetes con turnos,
  contenedores y tres modelos de datos) y tres pantallas más. Al tomar las capturas apareció
  [P-073](../01-requerimientos/pendientes.md): el balance de la portada nunca se conectó a la
  API; queda en la pieza D (#50).
- 2026-10-18: el Word del Avance 5 se revisó renderizado en un contenedor de LibreOffice; las
  capturas van en galerías y queda en 17 páginas. Joseph escribió la retrospectiva. Faltan las
  dos capturas y subirlo.
- 2026-10-18: P-073 resuelto, la portada muestra el balance con datos de inventario. La demo
  sube imagen a las causas y logotipo a sus entidades. Los recorridos guardan capturas para el
  Word con `CAPTURAS_WORD`, y el Avance 5 usa 22 de ellas.
- 2026-10-18, cierre de la jornada: se fusionaron los PR #128 a #134 con el CI en verde. La
  tabla «Hecho» suma lo terminado en el día. El resumen completo está en el
  [informe de la jornada](../06-operacion/sesiones/2026-10-18-resumen-de-la-jornada.md). Lo
  siguiente es la fila 2: las dos capturas del Avance 5 y subirlo a OneDrive.
- 2026-10-18: el Sprint 2 cierra el domingo 25 de octubre, como dicen P-047 y el cronograma;
  el plan y #47 todavía decían el 1 de noviembre. La Review y la retrospectiva pasan a la
  fila 6, antes del Planning del Sprint 3. En #45 queda marcada la captura del tablero del
  Avance 4, que estaba desde el 16 de octubre. La fila 13 nombra P-034, P-038 y P-058, y
  P-043 y P-044 quedan en «Se vigila sin fecha».
- 2026-10-18: #129 cerrado. P-070 y P-071 quedan resueltos: los plazos de cancelar y de marcar
  asistencia los decide la API, las fechas que no existen dan 400 y salen los demás menores de
  turnos y causas. La fila 13 sigue con #43. La pieza E (#49) suma dos casillas pedidas por
  Joseph: una copia de trabajo de RedAcopio para desarrollar sin pedir la página en cada prueba,
  y la lista de plataformas de `/herramientas`, que irá aparte de las causas.
- 2026-10-18: la pieza E (#49) pasa a esta semana en cinco filas, 8a a 8e, con despliegue en el
  servidor el miércoles 21. Joseph pidió la carga por CSV para todos los módulos, solo backend y
  lista para una pantalla futura, y la lista de otras plataformas aparte de las causas. La
  lectura programada queda apagada. La pieza D queda unida a la E por el Open Graph de la ficha.
  No sale ninguna fila: Joseph prefiere sesiones largas para avanzar más cada día, y las fechas
  de lo demás pueden adelantarse.
- 2026-10-18: la app pasa a grises piedra en fondos y bordes (ADR-0020), con el verde bosque, el
  texto y los radios de antes. La auditoría de las 25 pantallas encontró dos bloques sin conectar
  y 22 acciones de la bitácora sin frase (P-074, resuelto) y dos pruebas que se cortan con carga
  (P-075, abierto). Las capturas del Avance 5 se vuelven a tomar con la paleta nueva (fila 2).
