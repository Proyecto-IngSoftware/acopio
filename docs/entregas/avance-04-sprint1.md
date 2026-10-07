---
title: "Avance 4 — Sprint 1: incremento funcional y arquitectura de desarrollo"
type: entrega
tags: [entrega, is1, sprint-1]
estado: borrador
actualizado: 2026-10-07
---

# Avance 4 — Sprint 1: incremento funcional y arquitectura de desarrollo

**Guía:** [Avance de Proyecto 4 – IS1](../talleres/Avance%20de%20Proyecto%204%20–%20IS1.pdf)
· Docente: Juan Pablo Bustamante Moreno

**Sprint 1:** semanas 8 a 10, del lunes 21 de septiembre al domingo 11 de octubre de
2026 ([calendario](calendario.md)).

**Dónde se entrega:** en el mismo Word de OneDrive del proyecto, después del Avance 3.
El avance no se califica solo; se revisa y entra como evidencia en la sustentación del
segundo corte. El Word de esta entrega sale de [generar-avance-04.py](generar-avance-04.py)
y después se une a los anteriores con [unificar-avances.py](unificar-avances.py).

**Repositorio (público desde el 2026-10-07):**
<https://github.com/Proyecto-IngSoftware/acopio>

Esta nota es a la vez el tablero de trabajo del avance y la fuente del texto del Word.
Lo que todavía depende de una reunión del equipo está marcado como pendiente.

## Lo que falta

| Pide la guía | Estado | Qué falta |
|---|---|---|
| 1. Incremento funcional mínimo | ✅ | Nada. Evidencia en [§1](#1-incremento-funcional) |
| Repositorio público | ✅ | Se publicó el 2026-10-07 |
| 2. Diagrama de paquetes | ✅ | Dos vistas en [vista-general.md](../02-arquitectura/vista-general.md#diagrama-de-paquetes) |
| 3a. Tabla del Sprint Planning | ✅ | |
| 3a. Captura del tablero con las historias del Sprint 1 | ⚠️ | El Project ya tiene las historias y el campo «Sprint» (2026-10-07). Falta crear la vista Board y tomar la captura ([#21](https://github.com/Proyecto-IngSoftware/acopio/issues/21), [#45](https://github.com/Proyecto-IngSoftware/acopio/issues/45)) |
| 3b. Evidencia del seguimiento (captura o foto) | ❌ | Seguimiento del viernes 9 de octubre |
| 3b. Tabla del seguimiento | ⚠️ | Falta la fila de Brayan, Alejandra y Michael |
| 3c. Evidencia de la revisión | ✅ | [Pruebas con curl](evidencia/avance-04/pruebas-api.txt) y [contenedores](evidencia/avance-04/contenedores.txt) |
| 3c. Tabla del Sprint Review | ✅ | |
| 3c. Retrospectiva | ⚠️ | Borrador; el equipo la confirma en el seguimiento del 9 de octubre |

## 1. Incremento funcional

La guía pide como mínimo una API REST del dominio con base de datos en Docker. El
Sprint 1 entregó la API y también la interfaz web de los mismos bloques.

| Pide la guía | Cómo se cumple |
|---|---|
| API REST funcional | NestJS 11 en `apps/api`, con 10 módulos de dominio. El contrato OpenAPI está en [openapi.json](../03-diseno/api/openapi.json) |
| Base de datos real dentro de Docker | PostgreSQL 16 en el servicio `db` de `infra/docker-compose.yml`, con 10 migraciones de Prisma |
| Ejecutable con Docker Compose | `bun run servicios:todo` levanta `db`, `storage` (Garage), `mailpit` y la `api` construida desde su Dockerfile. Cada servicio tiene `healthcheck` |
| Variables de entorno | Todo sale del `.env` (plantilla en `.env.example`). La API valida las variables con Zod al arrancar (`src/config/entorno.ts`) y se niega a arrancar si falta una |
| Persistencia con volumen | Volúmenes `acopio_pgdata` (base), `acopio_garagedata` y `acopio_garagemeta` (archivos) y `acopio_llaves` |
| Colaboración en GitHub | Repositorio de la organización `Proyecto-IngSoftware`, 39 issues, el Project «Acopio · Product Backlog» y CI en cada push. Ver la nota de abajo |
| CRUD y estado del servicio | `GET /api/salud` responde 200 si la API y la base contestan, y 503 si la base no. Las categorías del catálogo tienen CRUD completo; acopios, zonas, entidades y usuarios tienen crear, consultar y modificar |
| Manejo básico de errores | Un filtro global (`comun/errores/filtro-errores.ts`) devuelve siempre `{estado, codigo, mensaje}` y, en errores de validación, `detalles` por campo |
| Seguridad mínima | El filtro nunca devuelve la traza ni el mensaje interno de un error inesperado. La sesión va en una cookie `HttpOnly` y `SameSite=Strict`. Un guard rechaza escrituras desde otro origen. Contraseñas con hash, intentos de inicio de sesión limitados y ningún secreto en el repositorio |
| Pruebas manuales | [scripts/pruebas-manuales.sh](../../scripts/pruebas-manuales.sh) corre 11 peticiones con curl contra la API del Compose. La salida del 2026-10-07 está en [pruebas-api.txt](evidencia/avance-04/pruebas-api.txt) |

Además de las pruebas manuales, el CI corre lint, tipos, límites entre módulos
(dependency-cruiser), 89 archivos de pruebas unitarias (API, web y `shared`), 27 de
integración contra PostgreSQL y el `docker build` de la API. Hay cuatro recorridos de
punta a punta en Chromium (`apps/web/recorridos/`).

**Sobre la colaboración.** De los 241 commits del repositorio, 233 son de Joseph. El
trabajo de los demás integrantes durante el Sprint 1 está en los issues del Project
(revisión de requisitos, diagramas y decisiones), no en código. El documento no lo
disimula: lo dice la retrospectiva y la acción del Sprint 2 apunta a eso.

## 2. Diagrama de paquetes

Está en la bóveda, en
[vista-general.md § Diagrama de paquetes](../02-arquitectura/vista-general.md#diagrama-de-paquetes),
en dos vistas:

1. **Paquetes del monorepo** (`arquitectura-03-paquetes-del-monorepo.png`): `apps/web`,
   `apps/api`, `packages/shared`, `packages/ui-tokens`, `prisma/` e `infra/`, y los dos
   caminos que unen la web con la API, que son las funciones de `shared` y el contrato
   OpenAPI.
2. **Paquetes de la API** (`arquitectura-04-paquetes-de-la-api.png`): los 10 módulos de
   `apps/api/src/modulos/` con sus servicios, controladores e interfaces reales, y las
   importaciones entre ellos medidas con dependency-cruiser el 2026-10-07.

Cada caja lleva la ruta de su carpeta. La leyenda está en la misma sección. Los dos
salen del Mermaid de la bóveda con `node build.mjs` y `node renderizar.mjs` en
`docs/02-arquitectura/diagramas/`.

Corresponde al ADR-001 ([ADR-0008](../02-arquitectura/adr/ADR-0008-arquitectura-stack-inicial.md)),
que eligió cliente-servidor con un monolito modular en capas: un solo proceso de API,
con módulos de dominio cuyos límites hace cumplir el CI.

## 3. Registro documental del Sprint

### 3a. Sprint Planning

El Sprint 0 cerró con la reunión del equipo del 28 de septiembre
([#22](https://github.com/Proyecto-IngSoftware/acopio/issues/22)). En ella se
confirmó la estimación de las historias con Planning Poker (83 puntos, HU-10 dividida
en HU-10a y HU-10b, [#13](https://github.com/Proyecto-IngSoftware/acopio/issues/13)).

El ADR-001 había limitado el Sprint 1 al Bloque 0 (cimientos y spike de NestJS),
porque NestJS era nuevo para el equipo. El spike salió rápido y el sprint se fue
ampliando bloque por bloque, cada uno con su especificación y su plan escrito antes
de empezar ([docs/05-planes](../05-planes/README.md)). La tabla registra lo que
terminó siendo el Sprint 1, no solo lo previsto el 28 de septiembre.

| Elemento | Contenido |
|---|---|
| Sprint Goal | Un donante puede ver en el mapa qué recibe cada acopio y llevarle una donación con folio, y el acopio puede registrar lo que entra y sale y conciliar esa donación, con el saldo de inventario siempre derivado de los movimientos |
| Historias seleccionadas | HU-14 Dar acceso sin conocer contraseñas (8) · HU-01 Saber qué comprar antes de salir (8) · HU-02 Donar a una causa real (3) · HU-15 No dirigir donantes a una estafa (3) · HU-04 Registrar sin frenar la fila (8) · HU-05 Ver qué sobra y qué falta (5) · HU-06 Frenar lo que ya sobra (3) · HU-07 Preparar una donación que pueda demostrar (8) · HU-08 Conciliar sin depender de una foto (5) · HU-09 Comprobar que mi donación llegó (3). Suman 54 puntos. Los criterios de aceptación de cada una están en el [Avance 2](avance-02-requisitos.md#historias). Si sobraba tiempo, se abría HU-10a y HU-10b (13 puntos) |
| Tareas técnicas | Bloque 0: monorepo con Bun, Compose, Prisma con dos roles de base de datos, identidad (sesión, invitaciones, usuarios), catálogo, cola de correo, CI y contrato OpenAPI. Bloque 1: acopios, zonas, entidades, geocodificación con Nominatim, mapa público y portada. Bloque 2: movimientos, saldo por disparador, umbrales, «no recibir», entrada rápida con escáner y captura sin conexión. Bloque 3: donaciones con folio y QR, factura en Garage, recepción, conciliación y seguimiento público. Bloque 4, etapa 1: cálculo de necesidad y excedentes, sugerencias, pesos, aprobar y descartar |
| Responsables iniciales | Según el reparto de la [especificación §4](../superpowers/specs/2026-08-20-acopio-design.md#reparto-entre-las-4-personas-del-equipo): Joseph en `catalogo`, `inventario`, `comprobantes` y `motor`; Michael en `identidad` y `auditoria`; Alejandra en `acopios` y las pantallas del portal P09 a P12; Brayan en las pantallas P01 a P08. En la práctica, Joseph construyó todos los módulos y pantallas del sprint |
| Dependencias o riesgos | RTA-01, NestJS nuevo para el equipo: se resolvió con el spike ([#19](https://github.com/Proyecto-IngSoftware/acopio/issues/19)). RTA-02, concurrencia del inventario: prueba contra PostgreSQL en contenedor ([#27](https://github.com/Proyecto-IngSoftware/acopio/issues/27)). Canasta estándar y población por zona, que bloqueaban el motor ([#20](https://github.com/Proyecto-IngSoftware/acopio/issues/20)). Proveedor del VPS, dominio y remitente de correo, todavía abierto ([#26](https://github.com/Proyecto-IngSoftware/acopio/issues/26)). Que una sola persona construya todo |
| Definition of Done | Pasan `lint`, `typecheck`, `depcruise`, las pruebas unitarias, las de integración y `scripts/revisar-colores.sh`, en local y en el CI de `main`. Si cambió un endpoint, el contrato OpenAPI y los tipos de la web están regenerados. Si tocó el Compose o el Dockerfile, levanta con `bun run servicios:todo`. Al cerrar el bloque pasa su recorrido de punta a punta. Los criterios de aceptación de la historia están verificados. El plan del bloque y la sección «Cambios al construir» de su especificación están al día |

**Falta la captura del tablero.** El 2026-10-07 se agregó al Project el campo
«Sprint», una tarjeta por historia con su estado según el Review y los issues cerrados
pasaron a «Done». Falta crear a mano la vista Board filtrada por «Sprint 1» (la API de
GitHub no crea vistas) y guardar la captura en `evidencia/avance-04/tablero.png`.

### 3b. Seguimiento del equipo (Daily Scrum)

El equipo no se reúne a diario: hace un seguimiento por semana, el miércoles o el
viernes ([calendario](calendario.md#seguimiento-del-equipo)). El del Sprint 1 es el
**viernes 9 de octubre**. Se toma una captura de la videollamada o una foto y cada
integrante llena su fila.

| Integrante | ¿Qué terminé desde el último seguimiento? | ¿Qué haré a continuación? | ¿Qué bloqueo o ayuda necesito? |
|---|---|---|---|
| Joseph | Bloque 3 completo: donaciones con folio, recepción, conciliación y seguimiento, con su interfaz. Etapa 1 de la API del motor: necesidad, excedentes, sugerencias, aprobar y descartar | Etapa 2 de la API del motor: remisiones, recepción en zona y reportes de necesidad | Que alguien más pruebe el escáner con un teléfono real (P-037) |
| Brayan | Pendiente: se llena en el seguimiento | | |
| Alejandra | Pendiente: se llena en el seguimiento | | |
| Michael | Pendiente: se llena en el seguimiento | | |

### 3c. Sprint Review y retrospectiva

**Evidencia.** La revisión se hizo el 2026-10-07 contra la API del Compose:

- [pruebas-api.txt](evidencia/avance-04/pruebas-api.txt): 11 peticiones con curl.
  Estado del servicio, 401 sin sesión, inicio de sesión con la cookie `HttpOnly`, CRUD
  completo de una categoría, un 400 de validación con el campo que falla, un 404 con
  el formato único de error y el mensaje genérico del seguimiento de un folio que no
  existe.
- [contenedores.txt](evidencia/avance-04/contenedores.txt): `docker ps` con los cuatro
  servicios sanos y los volúmenes.
- Recorridos de punta a punta en Chromium: `donador.mjs`, `consola-comprobantes.mjs`,
  `sin-conexion.mjs` y `validacion-general.mjs` ([cómo se corren](../06-operacion/recorridos.md)).

| Historia | ¿Se cumplió? | Criterios pendientes, ajustes u observaciones |
|---|---|---|
| HU-14 Dar acceso sin conocer contraseñas | Sí | Los tres criterios. La invitación vencida o usada da un mensaje genérico; el guard lee el estado del usuario en cada petición, así que la suspensión aplica desde la siguiente; sin correo, el formulario avisa que el enlace va por WhatsApp |
| HU-01 Saber qué comprar antes de salir | Parcialmente | Cumple el filtro «qué no recibe» y «cerca de mí» con búsqueda por dirección cuando no hay permiso de ubicación. Ajuste: el mapa oculta los acopios que no reciben la categoría y dice cuántos ocultó, en vez de mostrarlos con un aviso. Falta el criterio 2: el importador de RedAcopio Bogotá no se ha construido |
| HU-02 Donar a una causa real | No | Las causas y su paso a paso quedaron fuera del Bloque 1, junto con la verificación de entidades. La portada ya enlaza a `/causas`, que hoy muestra una página de «aún no construido» |
| HU-15 No dirigir donantes a una estafa | No | La verificación de entidades con documento soporte y su vencimiento a los 6 meses no se construyeron. Mismo motivo que HU-02 |
| HU-04 Registrar sin frenar la fila | Sí | Los tres criterios: escáner con saldo resultante, vencimiento obligatorio en perecederos y aviso (sin bloqueo) si la categoría está en «no recibir». Falta probar el escáner con un teléfono y un código real (P-037) |
| HU-05 Ver qué sobra y qué falta | Parcialmente | Cumple el criterio 1: el nivel bajo sale con ícono y texto, no solo color. Del criterio 2, cada fila muestra el tiempo desde el último movimiento, pero no se atenúa ni advierte pasadas 6 horas |
| HU-06 Frenar lo que ya sobra | Sí | Los tres criterios: aparece en el filtro del mapa, la fecha de reapertura se respeta sola y un operador no asignado recibe rechazo |
| HU-07 Preparar una donación que pueda demostrar | Sí | Los tres criterios: el mismo producto suma en la misma línea, la sugerencia de dónde entregar marca las líneas que el acopio no recibe y la sexta donación preparada se rechaza con su motivo |
| HU-08 Conciliar sin depender de una foto | Sí | Conciliar deja quién y cuándo en la bitácora. Rechazar exige motivo, avisa al Donador por correo y no toca el inventario |
| HU-09 Comprobar que mi donación llegó | Sí | El seguimiento público muestra lo donado y el estado sin datos del donante ni la factura; un folio inexistente da el mensaje genérico. El vínculo con un despacho (RF-CMP-007) llega con las remisiones del Bloque 4 |
| HU-10a Ver a dónde falta y de dónde sobra | Parcialmente | Fuera del compromiso inicial. La API calcula el ranking de sugerencias con su justificación; falta la pantalla del administrador |
| HU-10b Aprobar o descartar un traslado | Parcialmente | Fuera del compromiso inicial. La API aprueba (crea la remisión en borrador y registra quién) y descarta con motivo obligatorio; falta la pantalla |

De los 54 puntos comprometidos se terminaron 40 (HU-14, 04, 06, 07, 08 y 09). Quedan
parciales 13 (HU-01 y HU-05) y sin empezar 6 (HU-02 y HU-15). De lo que no estaba
comprometido avanzaron HU-10a y HU-10b, sin interfaz.

#### Retrospectiva (borrador para confirmar el 9 de octubre)

**Qué funcionó bien.** Escribir la especificación y el plan de cada bloque antes de
programar evitó rehacer trabajo: los cuatro bloques cerraron en nueve días. El CI con
límites entre módulos, pruebas de integración contra PostgreSQL real y recorridos en
el navegador encontró errores antes de que llegaran a `main`. Derivar el saldo de los
movimientos con un disparador en la base hizo imposible un saldo negativo, aun con
dos registros al mismo tiempo.

**Qué no funcionó o dificultó el trabajo.** Casi todo el código lo escribió una sola
persona, y el resto del equipo no tocó el repositorio; si Joseph se detiene, el
proyecto se detiene. El tablero del Project dejó de reflejar el trabajo: los bloques
se siguieron en los planes de la bóveda y en issues, y las historias nunca llegaron al
tablero. Dos historias Must (HU-02 y HU-15) se apartaron en una especificación aparte
del Bloque 1 y nadie las volvió a programar, hasta que la revisión del sprint lo
encontró.

**Qué aprendimos.** Que un plan escrito antes de cada bloque rinde más que una
estimación global. Que la revisión tiene que hacerse historia por historia contra sus
criterios de aceptación: contra la lista de bloques cerrados, HU-02 y HU-15 se veían
completas sin estarlo. Y que una tarea apartada para después necesita un issue el
mismo día, o se pierde.

**Qué acción concreta aplicaremos en el Sprint 2.** Cada integrante abre, como
mínimo, un pull request que otro integrante revisa y aprueba antes de fusionarlo, y
todas las historias del Sprint 2 están en el tablero con el campo «Sprint» desde el
Planning. Se verifica en el seguimiento de cierre del Sprint 2 con
`gh pr list --state merged` y con la captura del tablero.
