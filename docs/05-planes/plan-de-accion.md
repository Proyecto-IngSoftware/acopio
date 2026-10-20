---
title: "Plan de acción del proyecto"
type: plan
tags: [plan, seguimiento, cronograma]
estado: vigente
actualizado: 2026-10-20
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
| Miércoles 21 de octubre | Pieza E desplegada en el servidor de pruebas (hecho el 19) |
| Domingo 15 de noviembre | Pieza D del Bloque 1 |
| Viernes 20 de noviembre | Review del Sprint 3 |
| Domingo 29 de noviembre | Congelamiento y calidad |
| Semana 18, hasta el 6 de diciembre | Entrega final y sustentación |

## Ahora: hasta la sustentación del 23 de octubre

| # | Qué | Issue | Fecha | Estado |
|---|---|---|---|---|
| 1 | Fecha de la Review del Sprint 2: el viernes 23, según la guía ([P-072](../01-requerimientos/pendientes.md)) | P-072 | 2026-10-18 | ✅ |
| 2 | Avance 5 en el Word de OneDrive: pantallas con su flujo, patrones, registro del Sprint 2 y enlace al repositorio. Generado y revisado renderizado. El 19 entraron las capturas nuevas de Causas y del mapa, con las plataformas y los puntos de RedAcopio, y el diagrama de paquetes con `importacion`. Ese mismo día entraron las capturas del tablero y del seguimiento, con el tablero al día. Llega a OneDrive con cada push al repositorio. Es una casilla del issue 47, que sigue abierto por la sustentación (fila 4) | — | 2026-10-22 | ✅ |
| 3 | Lo que falta del Word de avances anteriores. Del Avance 4 ya está la captura del tablero; faltan el seguimiento del 9 de octubre con su captura, las filas de Brayan, Alejandra y Michael, la retrospectiva confirmada y regenerar el Word. Del Avance 2, la revisión de redacción ([P-012](../01-requerimientos/pendientes.md)) y la captura de la vista Board | #45, #23, #21 | 2026-10-22 | ⬜ |
| 4 | Sustentación: proyecto en ejecución sobre la demo del servidor y diagrama de paquetes. La demo ya tiene el balance de la portada, los 85 puntos de RedAcopio en el mapa, las causas con su ilustración y los logos reales de sus fundaciones, y las otras plataformas con foto al final de Causas. El diagrama de paquetes tiene `importacion` desde el 19, medido con dependency-cruiser. Ese día, en el servidor, pasaron los recorridos públicos y entraron las cuatro cuentas de rol. También el 19 quedó una sola pantalla para entrar, `/entrar`, con la barra del portal. Falta que Joseph ensaye la presentación | #47 | 2026-10-23 | 🟡 |
| 5 | Ronda de pruebas en el servidor, por rol, con los escenarios de `escenarios-por-rol.md`; cada hallazgo entra como issue `hallazgo`. El 19 se hicieron en el servidor los escenarios que no gastan la demo (#150 a #154). Quedan el 21 revisar el 15 (el 20 Sal seguía en «no recibir», como debe: la fecha es el último día sin recibir), y el 24 los que gastan datos: 7, 8, 18 a 20, 22, 23 y 28 a 31 | #58 | 2026-10-25 | 🟡 |
| 6 | Cierre del Sprint 2: Review historia por historia el 23, seguimiento de la semana 12 con captura y retrospectiva con una acción para el Sprint 3 | #47 | 2026-10-25 | ⬜ |

## Sprint 3: del 26 de octubre al 22 de noviembre

| # | Qué | Issue | Fecha | Estado |
|---|---|---|---|---|
| 7 | Planning del Sprint 3 | #51 | 2026-10-26 | ⬜ |
| 8 | Pieza E, lo que queda: las cuatro casillas de RF-RED-011 (P-076), los menores de la revisión final (P-077) y las fotos de cuatro plataformas (P-078). Va antes de prender la lectura programada | P-076 | 2026-11-15 | ⬜ |
| 9 | Pieza D: contenido del home, páginas legales y Open Graph, con su ADR. El balance de la portada (P-073) ya quedó hecho. Joseph la une a la pieza E: el Open Graph de la ficha del acopio, referenciado u operado, sigue a la ficha de la fila 8d | #50 | 2026-11-15 | ⬜ |
| 10 | Escáner probado con un teléfono y un código real contra el servidor. El 20, en Android con Chrome, abría y no leía: pedía 640 × 480. Ahora pide 1920 × 1080 y enfoque continuo ([P-037](../01-requerimientos/pendientes.md)); falta repetir la prueba en el teléfono | #40 | 2026-11-15 | 🟡 |
| 20 | Presentaciones, códigos de barras y unidades ([P-081](../01-requerimientos/pendientes.md), [plan](2026-10-20-presentaciones.md)). Las pantallas esperan las maquetas de Stitch aprobadas por Joseph | #163 | 2026-11-15 | ⬜ |
| 11 | Review y retrospectiva del Sprint 3 | #51 | 2026-11-20 | ⬜ |
| 12 | Bloque 6: bitácora enriquecida, transparencia y publicaciones. Es lo primero que se recorta | #37 | 2026-11-22 | ⬜ |
| 13 | Deuda de las revisiones: menores de los bloques 1 a 3 (P-034, P-038 y los del Bloque 3) y la imagen que falta en Garage (P-058). Los del cierre del Bloque 5 (P-070, P-071, #129) quedaron hechos el 18 de octubre. De la ronda por rol del 19: los datos de inventario de más de 6 horas (#151), el «no recibir» de un acopio ajeno (#152), estos dos hechos el 20 de octubre, y la frase de la bitácora para un cambio de fecha (#153). De la revisión de la entrada única, el correo de una cuenta activa y su credencial (P-080) quedó hecho el 19 de octubre | #43, #153 | 2026-11-22 | 🟡 |
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
| Logos reales de Cruz Roja Colombiana y UNICEF Colombia en las causas de la demo (PR 145) | | 2026-10-19 | ✅ |
| Otras plataformas al final de Causas con foto de cada sitio, causas de la demo con la ilustración nueva y mapa con grupos por tipo y pines de Stitch (PR 143 y 144) | | 2026-10-19 | ✅ |
| Pieza E: puntos de RedAcopio como referenciados desde la copia guardada, carga por CSV para ocho formatos, P05 y P06 del referenciado, desplegada en el servidor (PR 140, 141 y 142) | #49 | 2026-10-19 | ✅ |
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
- 2026-10-19: filas 8a a 8d hechas en la rama `pieza-e`. La demo importa 85 puntos de la copia
  de RedAcopio (tres vienen en 0, 0 y se omiten) y las 9 plataformas de `/herramientas`. Hay
  carga por CSV para ocho formatos y las pantallas P05, P06 y P14. La fila 8e queda en curso
  hasta revisar el servidor. Lo que falta de RF-RED-011 pasa a P-076.
- 2026-10-19: fila 8e hecha y #49 cerrado. El servidor de pruebas tiene los 85 puntos de
  RedAcopio y las 9 plataformas, y `referenciados.mjs` pasó 6 de 6 contra él. El primer
  despliegue no arrancó la versión nueva porque la imagen no traía la copia de RedAcopio; #141
  lo arregló.
- 2026-10-19: Joseph pidió llevar las otras plataformas a Causas, con foto real de cada sitio, y
  que el mapa distinga los puntos. Ya está: sección al final de Causas, grupos del mapa por tipo y
  pines tipo píldora de Stitch. Las cuatro plataformas sin foto quedan en P-078.
- 2026-10-19: cierre de la jornada. La pieza E y los cambios que pidió Joseph después (plataformas
  en Causas con foto, mapa por tipo y logos reales de las fundaciones) pasan a «Hecho». La
  sección «Pieza E en esta semana» sale del plan porque sus filas 8a a 8e quedaron hechas, y la
  fila 8 junta lo que queda (P-076, P-077 y P-078). Las filas 2 y 4 suman lo que falta para el 23:
  volver a tomar las capturas del mapa y de Causas, ensayar la demo y regenerar el diagrama de
  paquetes con `importacion`.
- 2026-10-19: la fila 4 pasa a en curso. El diagrama de paquetes de la API suma `importacion`
  arriba de todo, con las dependencias medidas ese día, y la página publicada quedó al día. En el
  servidor pasaron `referenciados.mjs`, `portal-causas.mjs` y `portal-turnos.mjs`, y entraron
  `operador1`, `operador2`, `auditor1` y `receptor1`. Falta que Joseph ensaye la presentación.
- 2026-10-19: el Word del Avance 5 se regeneró con las capturas nuevas de Causas y del mapa,
  dos figuras más (plataformas y puntos de RedAcopio) y el diagrama de paquetes con
  `importacion`. Quedó en 18 páginas, revisado renderizado. Al tomar las capturas salieron dos
  arreglos: el nombre accesible de los pines del mapa y una espera en `consola-causas.mjs`. A
  la fila 2 le faltan las capturas del tablero y del seguimiento, y subirlo.
- 2026-10-19: el tablero del Project quedó al día con el Sprint 2 (historias del Planning y HU-03
  en Done, con su sprint corregido) y el Word del Avance 5 suma las capturas del tablero y del
  seguimiento. A la fila 2 solo le falta subirlo a OneDrive.
- 2026-10-19: la fila 5 pasa a en curso. La ronda por rol se hizo en el servidor con los
  escenarios que no gastan la demo, y salieron cinco hallazgos (#150 a #154). Se arreglan en el
  mismo PR el aviso con el id de la categoría al donar (#150), la frase de la bitácora para una
  necesidad resuelta (#153) y la guía de escenarios (#154). Quedan abiertos #151 (datos de más de
  6 horas) y #152. Joseph decidió dejar para el sábado 24 los escenarios que gastan la demo.
- 2026-10-19: en la ronda por rol Joseph se confundió entre las dos entradas y decidió una sola
  ([P-079](../01-requerimientos/pendientes.md)). Todas las cuentas entran por C01 con «Correo o
  nombre de usuario» y P13 solo crea la cuenta de donador. En el mismo cambio `identidad` pasó a
  DAO. Los doce recorridos pasan en local. No cambia ninguna fila: entra antes de la
  sustentación del 23 y la demo se ve igual salvo la pantalla de entrada.
- 2026-10-19: un revisor independiente pasó por la entrada única. Dos fallas de la web quedaron
  arregladas (el mensaje de C01 sin red y `?volver=` con un tabulador) y un problema anterior quedó
  en [P-080](../01-requerimientos/pendientes.md). En el servidor ya entran todas las cuentas por
  `/entrar`.
- 2026-10-19: P-080 queda resuelto. Al cambiar el correo de una cuenta activa, la API cambia
  también el de su credencial, y la persona sigue entrando con su usuario y con el correo nuevo.
- 2026-10-19: cierre de la sesión. `/entrar` va dentro del marco del portal y P-080
  quedó resuelto. La fila 4 nombra la entrada nueva. Para Joseph quedan las filas 2, 4 y
  5.
- 2026-10-20: arreglados #151 y #152. El inventario atenúa la fila con más de 6 horas sin
  movimientos y lo advierte, y «no recibir» niega desde que abre un acopio que no está asignado.
  El escenario 15 se revisa el 21: la fecha de «no recibir hasta» es el último día sin recibir, y
  el 20 Sal seguía marcada en Chapinero, como debía.
- 2026-10-20: la fila 2 queda hecha, porque el Word llega a OneDrive con cada push (lo dijo
  Joseph). La fila 10 pasa a en curso: el escáner abría y no leía en Android, y ahora pide la
  cámara en 1920 × 1080 (P-037).
- 2026-10-20: la fila 2 deja de nombrar a #47 en la columna del issue, que sigue abierto por la
  sustentación. En #47 se marcaron la casilla del Word y la de la captura del seguimiento.
- 2026-10-20: entra la fila 20, con el diseño y el plan de presentaciones, códigos de barras y
  unidades (P-081, #163). Joseph aprobó el diseño; el trabajo arranca después del 23.
