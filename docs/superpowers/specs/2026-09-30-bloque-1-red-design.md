---
title: "Bloque 1 · Red de acopios y mapa público · especificación"
type: spec
tags: [spec, bloque-1]
estado: vigente
bloque: 1
actualizado: 2026-10-01
---

# Bloque 1 · Red de acopios y mapa público · especificación

**Fecha:** 2026-09-30
**Estado:** aprobada por Joseph el 2026-09-30
**Deriva de:** [especificación general](2026-08-20-acopio-design.md) §13,
[RF-RED](../../01-requerimientos/funcionales/red.md),
[RF-MOT-001](../../01-requerimientos/funcionales/motor.md#rf-mot-001--registrar-zona-afectada)
y [RF-INV-008](../../01-requerimientos/funcionales/inventario.md#rf-inv-008--marcar-no-recibir)
**Plan:** [API](../../05-planes/2026-09-30-bloque-1-api.md); las interfaces, un plan por ciclo

---

## 1. Objetivo

Que existan los acopios, las zonas y las entidades de verdad, con nombre y lugar, y
que cualquiera pueda ver en un mapa dónde queda cada acopio, si está abierto y qué no
debe llevarle.

**El bloque termina cuando**, en el Compose local:

1. El Administrador crea una entidad, un acopio con su pin en el mapa y una zona.
2. Invita a un Operador y le asigna ese acopio eligiéndolo por su nombre.
3. El Operador entra, ve su acopio en el selector de la cabecera, lo pausa y marca
   «no recibir» ropa hasta una fecha.
4. Una persona sin sesión filtra el mapa por «no recibe ropa», abre la ficha y ve
   «No traigan ropa» con su antigüedad y el acopio como pausado.
5. Todo lo anterior queda en la bitácora.

## 2. Alcance

El Bloque 1 completo de la [especificación general](2026-08-20-acopio-design.md#13-orden-de-construcción)
(acopios, zonas, entidades, mapa y home) se parte en varias especificaciones. Esta
cubre las dos primeras piezas, **A (red base)** y **B (mapa y ficha públicos)**.
Joseph eligió ese orden el 2026-09-30: C, D y E van después del inventario.

| Pieza | Qué | Especificación |
|---|---|---|
| A · Red base | Acopios, zonas, entidades, asignaciones con nombre, selector de ubicación | Esta |
| B · Mapa y ficha | P5 y P6, con «no recibir» | Esta |
| C · Verificación y causas | Verificar entidad con documento, causas, archivado, P3 y P4 | Aparte, con el módulo `almacenamiento` |
| D · Contenido del home | C19, Cómo ayudar, páginas legales, Open Graph | Aparte |
| E · Importador | RedAcopio y carga por CSV (RF-RED-011, RTA-05) | Aparte, con el módulo `importacion` |

### Dentro

| Área | Qué | Requerimientos |
|---|---|---|
| Acopios | Crear, editar, pausar y cerrar; horario semanal; «abierto ahora» | RF-RED-001 |
| Entidades | Crear y editar, sin verificación | RF-RED-005 |
| Zonas | Crear y editar, por emergencia | RF-MOT-001 |
| No recibir | Interruptor por categoría y acopio, con reapertura opcional | RF-INV-008, adelantado del Bloque 2 |
| Asignaciones | Elegir acopios y zonas reales por su nombre | Pendiente del Bloque 0 ([§2](2026-09-28-bloque-0-cimientos-design.md#fuera-y-a-qué-bloque-va)) |
| Selector de ubicación | En la cabecera con sesión | S-02 del [ciclo 2](2026-09-30-interfaz-ciclo-2-acceso-design.md#3-decisiones) |
| Matriz de acceso | Usuarios × ubicaciones, filtrable y exportable a CSV | RF-IDE-011, pendiente del Bloque 0 |
| Mapa público | Leaflet con OSM, filtros «abierto ahora» y «qué no recibe», cerca de mí, búsqueda por dirección | RF-RED-002 |
| Ficha pública | Datos del acopio, «No traigan», compartir por WhatsApp | RF-RED-003 |
| Geocodificación | Nominatim desde la API, con caché y ritmo limitado | RF-RED-002 |

### Fuera, y a dónde va

| Qué | Dónde | Por qué no ahora |
|---|---|---|
| «Lo que urge» y el filtro «qué recibe» | Bloque 2 | Salen de saldos y umbrales. Sin ellos no hay forma honesta de decir qué necesita un acopio |
| Cupos de voluntariado en la ficha y en el filtro | Bloque 5 | Salen de los turnos |
| Aviso por correo a los Donadores al pausar o cerrar | Bloque 3 | Los Donadores y sus folios llegan con la custodia |
| Verificación de entidades, logotipo y causas | Especificación C | Necesitan el almacenamiento de archivos |
| Open Graph y vista previa en WhatsApp | Especificación D | Una SPA necesita algo del lado del servidor para los metadatos |
| Acopios referenciados | Especificación E | Llegan con el importador |
| C10 Ficha de zona | Bloque 4 | Su contenido es el déficit que calcula el motor |
| Mapa de necesidades por zona (RF-RED-009) | Bloque 4 | Se alimenta de los reportes del Receptor (RF-MOT-011) |

## 3. Decisiones

Tomadas por Joseph el 2026-09-30.

| # | Decisión | Alternativa descartada y por qué |
|---|---|---|
| B-01 | Esta especificación cubre A y B; C, D y E van después del inventario | Hacer todo el Bloque 1 antes del inventario: arrastra el almacenamiento y Open Graph, dos problemas aparte. Solo A: el público no ve nada nuevo |
| B-02 | «No recibir» (RF-INV-008) se adelanta a este bloque | Mapa solo informativo: pierde el filtro que evita el viaje inútil. Texto libre por acopio: un dato que el Bloque 2 reemplaza y que envejece sin control |
| B-03 | El Operador asignado maneja lo operativo de su acopio: pausar y reactivar, horario, indicaciones, teléfono y «no recibir». Crear, cerrar y cambiar entidad, nombre, dirección o coordenadas sigue siendo del Administrador | Solo el Administrador: el mapa queda desactualizado mientras alguien lo llama. Todo menos crear y cerrar: el Operador podría mover el acopio de lugar |
| B-04 | Se sigue la [arquitectura](../../02-arquitectura/vista-general.md) tal cual: nace `acopios` y nace `inventario` solo con «no recibir». La web arma la ficha con dos llamadas | Todo en `acopios`: rompe la tabla de dependencias y en el Bloque 2 hay que mudarlo. Un módulo `portal` de lectura: sale de la arquitectura aprobada y no hace falta con decenas de acopios |
| B-05 | `identidad` valida las ubicaciones de una asignación por un puerto, `VerificadorUbicaciones`, que implementa `acopios` | Que `identidad` importe `acopios`: la tabla de dependencias no lo permite |
| B-06 | «No recibir» va en su propia tabla, no como columnas de `umbral` | Columnas en `umbral`: su mínimo y su máximo no existen todavía, y `umbral` también aplica a zonas, donde «no recibir» no tiene sentido |
| B-07 | La matriz de acceso (RF-IDE-011) entra en el ciclo 2 de la interfaz. La web la arma con `GET /usuarios`, que ya trae asignaciones y restablecimientos pendientes, y con los nombres de `GET /ubicaciones`. El CSV se genera en el navegador | Un endpoint propio en `identidad`: necesitaría los nombres de las ubicaciones, que viven en `acopios`. Dejarla para otra especificación: todo lo que usa ya existe en el ciclo 2 |
| B-08 | El buscador de ubicaciones de C16 (invitar y detalle) pasa del ciclo 2 al ciclo 1 | Desde el Bloque 1 la API rechaza ubicaciones que no existen; sin el buscador, invitar a un Operador a un acopio obliga a copiar su identificador a mano |

B-07 cierra lo que el Bloque 0 dejó pendiente de RF-IDE-011. B-03 ajusta RF-RED-001, que daba toda la gestión al Administrador. B-06 cambia
`modelo-datos.md`. Los dos se anotan en [P-033](../../01-requerimientos/pendientes.md).

## 4. Datos

```
entidad
  id · nombre · tipo · nit? · sitio_web? · telefono? · correo? · descripcion?
  verificacion  SIN_VERIFICAR | VERIFICADA | RECHAZADA   DEFAULT SIN_VERIFICAR
  creado_en

acopio
  id · entidad_id (FK, NOT NULL) · nombre · direccion · municipio
  lat numeric(9,6) · lng numeric(9,6)
  telefono? · indicaciones_acceso?
  horario jsonb      { lun: [{ abre: "08:00", cierra: "12:00" }, …], …, dom: [] }
  estado  ACTIVO | PAUSADO | CERRADO   DEFAULT ACTIVO
  creado_en · actualizado_en

zona
  id · emergencia_id (FK) · nombre · municipio · lat · lng
  poblacion_estimada int · poblacion_fuente · poblacion_fecha date
  estado  SIN_ATENDER | EN_ATENCION | CUBIERTA   DEFAULT SIN_ATENDER
  creado_en · actualizado_en

no_recibir                                   módulo inventario
  acopio_id (FK) · categoria_id (FK) · hasta date?
  marcado_por · marcado_en
  PK (acopio_id, categoria_id)
```

- **Horario.** Se interpreta en `America/Bogota`. Cada día tiene cero o más tramos,
  con `abre < cierra` y sin solaparse; un tramo no cruza la medianoche. La función
  `abiertoAhora(horario, instante)` es pura y vive en `packages/shared`, porque la
  usan la API (filtro) y la web (ficha).
- **Sin columnas de acopios referenciados** (`tipo`, `fuente*`, `oculto_por_admin`).
  Las agrega la especificación E, que también vuelve opcional `entidad_id`.
- **Sin columnas de verificación ni logotipo en `entidad`** (`verificada_por`,
  `vence_en`, `documento_soporte_key`, `logo_url`). Las agrega la especificación C.
- **Reapertura.** Una fila de `no_recibir` con `hasta` anterior a hoy no cuenta al
  leerla. No hace falta una tarea programada.
- **Zonas.** Si su emergencia está cerrada, la zona queda en solo lectura.
- **Acopios.** Uno con historia no se borra: se cierra.
- **Asignaciones.** `usuario_asignacion` no cambia.
- **Bitácora.** Toda escritura deja su registro con antes y después, en la misma
  transacción.
- **Permisos.** `acopio_app` recibe `SELECT`, `INSERT` y `UPDATE` sobre las tablas
  nuevas, y `DELETE` solo sobre `no_recibir`.

## 5. API

Mismas convenciones del Bloque 0: rutas en español, `@Publico()` para lo abierto,
`@Roles()` para lo restringido y errores con `estado`, `codigo` y `mensaje`.

### Módulo `acopios`

| Ruta | Quién | Qué |
|---|---|---|
| `GET /acopios` | Público | Acopios `ACTIVO` y `PAUSADO` con sus datos públicos. `?abiertoAhora=true` filtra; `?cerca=lat,lng` ordena por distancia |
| `GET /acopios/:id` | Público | Ficha. Un acopio `CERRADO` responde 404 |
| `GET /acopios/gestion` | Administrador (todos) · Operador (los suyos) | Lista de la consola, con los cerrados |
| `POST /acopios` · `PATCH /acopios/:id` | Administrador | Crear y editar todo, también cerrar |
| `PATCH /acopios/:id/operacion` | Administrador · Operador asignado | Estado (`ACTIVO` o `PAUSADO`), horario, indicaciones y teléfono |
| `GET` · `POST` · `PATCH /entidades` | Administrador | Entidades |
| `GET` · `POST` · `PATCH /zonas` | Administrador | `?emergencia=` filtra. Con la emergencia cerrada responde 409 `ZONA_SOLO_LECTURA` |
| `GET /ubicaciones/mias` | Con sesión | Nombre y tipo de los acopios y zonas asignados |
| `GET /ubicaciones?q=` | Administrador · Auditor | Acopios y zonas con su nombre y tipo; `q` filtra por nombre. Lo usan el buscador de C16 y la matriz de acceso |
| `GET /geocodificar?q=` | Público | Dirección a coordenadas |

### Módulo `inventario`

| Ruta | Quién | Qué |
|---|---|---|
| `GET /acopios/:id/no-recibir` | Público | Categorías que no recibe, con `hasta` y `marcado_en` |
| `GET /no-recibir?categoria=` | Público | Acopios que no reciben esa categoría |
| `PUT` · `DELETE /acopios/:id/no-recibir/:categoriaId` | Administrador · Operador asignado | Marcar, con `hasta` opcional, y desmarcar |

### Reglas entre módulos

- **Puerto de ubicaciones (B-05).** El token de `VerificadorUbicaciones` vive en
  `comun/`. `acopios` entrega la implementación e `identidad` la recibe por inyección.
  Asignar una ubicación que no existe responde 422 `UBICACION_INEXISTENTE`.
- **Operador asignado.** Un ayudante en `comun/autorizacion` revisa las asignaciones
  que el guard ya carga en cada petición. Lo usan `acopios` e `inventario`. Con un
  acopio ajeno responde 403.
- **Nominatim.** Detrás de una interfaz `Geocodificador`, con el adaptador real y uno
  falso para las pruebas. El real consulta solo desde la API, con
  `countrycodes=co`, un `User-Agent` que identifica a Acopio con un contacto, una
  cola de una petición por segundo y una caché en memoria de 24 horas. El
  `ThrottlerGuard` limita las peticiones por IP. Si Nominatim no responde, la API
  devuelve 503 `GEOCODIFICACION_NO_DISPONIBLE`.
- **Dependencias.** `acopios` e `inventario` entran a la tabla de
  [vista-general.md](../../02-arquitectura/vista-general.md#dependencias-permitidas)
  y a `.dependency-cruiser.cjs`. `inventario` importa `acopios` y `catalogo`; nadie
  importa `inventario`.
- **Contrato.** Se regeneran `openapi.json` y los tipos de la web.

## 6. Web

Ninguna pantalla se programa sin su maqueta de Stitch aprobada por Joseph (ADR-0011,
ADR-0013). Esta sección fija qué muestra cada una; Stitch fija cómo se ve.

### Público

| Pantalla | Qué muestra |
|---|---|
| P5 Mapa | Leaflet con OSM y marcadores agrupados. Filtros «abierto ahora» y «qué no recibe» por categoría. «Cerca de mí» con permiso de ubicación, o búsqueda por dirección. Una vista de lista equivalente para teclado y lector de pantalla. Atribución de OpenStreetMap visible |
| P6 Ficha de acopio | Dirección y enlace externo para llegar, horario con «abierto ahora», estado, indicaciones y teléfono. «No traigan» con cada categoría y su reapertura. «Lo que urge» dice «Llega con el inventario» y los cupos «Llega con los turnos». Cada dato operativo lleva su antigüedad (RNF-04). Botón de compartir por WhatsApp |

El mapa se carga solo al abrir su ruta, para que Leaflet no le sume peso a la
Portada. La pestaña «Mapa» de la barra inferior deja de llevar a «Próximamente».

### Consola

| Pantalla | Rol | Qué hace |
|---|---|---|
| C21 Acopios (lista y formulario) | Administrador | Crear, editar y cerrar. La dirección se geocodifica y el pin se ajusta arrastrándolo |
| C15 Entidades | Administrador | Lista y formulario |
| C9 Zonas | Administrador | Lista por emergencia y formulario con pin |
| Mi acopio | Operador asignado · Administrador | Pausar y reactivar, horario, indicaciones y teléfono |
| C7 No recibir | Operador asignado · Administrador | Un interruptor por categoría, con reapertura opcional. Los umbrales de C7 llegan en el Bloque 2 |

C21 es un código nuevo: el catálogo de pantallas de la especificación general no tenía
la gestión de acopios.

### Flujo entre pantallas (aprobado el 2026-09-30)

- Público: la pestaña «Mapa» y el botón «Donar en especie» de la Portada llevan a P5. De
  P5 a P6 por el marcador o la lista. «Volver al mapa» conserva los filtros en la URL. Un
  enlace compartido abre P6 directo. Un acopio cerrado muestra «Este acopio ya no está
  activo» con el enlace al mapa.
- Administrador: desde «Más», Acopios (C21), Entidades (C15) y Zonas (C9). Desde un
  acopio de C21 se llega a su «No recibir» (C7). Si no hay entidades, el formulario de C21
  ofrece «Crear entidad»; si no hay emergencias activas, C9 lleva a la pestaña de
  emergencias de C18.
- Operador: «Más» muestra una fila «Mi acopio» por cada acopio asignado, hasta que llegue
  el selector del ciclo 2. De «Mi acopio» a su «No recibir».
- Piezas compartidas: el editor de horario (C21 y Mi acopio), la etiqueta de estado
  (acopio y zona), la tarjeta «No traigan» (C7, P5 y P6) y el mapa con pin que se
  arrastra (C21 y C9).

Los diseños aprobados, con sus diferencias, están en `docs/03-diseno/stitch/`: C15, C21,
C09, mi-acopio, C07, P05 y P06.

### Cambios a lo que ya existe

- **Selector de ubicación en la cabecera con sesión.** Muestra por nombre los acopios
  y zonas asignados. La elección se recuerda en `localStorage`; sin nada guardado,
  toma la primera. El Administrador no tiene selector, porque su alcance es global.
- **C16 Invitar y Detalle.** El campo de identificador se cambia por un buscador de
  acopios y zonas por nombre, y el detalle muestra los nombres. Se cierra R-06 del
  [ciclo 3](../../05-planes/2026-09-30-interfaz-ciclo-3-consola.md).
- **Matriz de acceso (RF-IDE-011), dentro de C16.** Para Administrador y Auditor. Filas
  de usuarios y columnas de ubicaciones, filtrable por rol, estado y ubicación. Marca los
  restablecimientos pendientes y se exporta a CSV. A 360 px se lee por ubicación: se
  elige una y se ve quién puede tocarla. Todavía no hay Donadores; su listado aparte
  llega con el Bloque 3.
- **«Más».** Cada pantalla nueva suma su fila en el mismo ciclo que la construye. El
  Operador tiene por fin herramientas propias.

## 7. Orden de construcción

1. **API:** `acopios`, `inventario` con «no recibir», el puerto en `identidad`, el
   `seed:demo` y el contrato.
2. **Interfaz, ciclo 1, pantallas nuevas:** primero las que cargan datos (C21, C15,
   C9) y el buscador de ubicaciones de C16 (B-08), después Mi acopio y C7, y al final P5
   y P6.
3. **Interfaz, ciclo 2, cambios a lo que ya existe:** el selector de la cabecera y la
   matriz de acceso.

Cada ciclo de interfaz empieza pidiendo las maquetas en Stitch y termina con el
recorrido en Chromium a 360 × 640.

### Datos de ejemplo

Un script `seed:demo`, aparte del seed real, crea dos entidades y cuatro acopios
ficticios en Bogotá, con «(prueba)» en el nombre, para ver el mapa con datos en local.
Es idempotente y el seed real no cambia.

## 8. Pruebas

| Qué | Cómo |
|---|---|
| `abiertoAhora` | Unitarias: varios tramos en un día, día sin horario, justo en la hora de apertura y de cierre, instante en UTC que en Bogotá es otro día. La validación rechaza tramos al revés o solapados |
| API | Integración contra PostgreSQL: CRUD con su bitácora; Operador con acopio ajeno recibe 403; acopio cerrado da 404 en lo público; zona de emergencia cerrada da 409; ubicación inexistente al asignar da 422; «no recibir» vencido no aparece; el filtro por categoría y `abiertoAhora` devuelven lo esperado; `acopio_app` no puede borrar acopios |
| Geocodificación | Con el adaptador falso: la caché evita la segunda consulta y la cola respeta una por segundo, con reloj simulado. CI no sale a internet |
| Matriz de acceso | Vitest: cruce de usuarios con nombres, filtros por rol, estado y ubicación, marca de restablecimiento pendiente y contenido del CSV |
| Web | Vitest y axe por pantalla. En jsdom Leaflet no funciona, así que se prueban la vista de lista y los filtros; el mapa se revisa en el recorrido con Chromium |

## 9. Criterios de salida

- [ ] El recorrido del §1 funciona en el Compose local
- [ ] La Portada no crece por Leaflet, y el mapa carga en menos de 3 s con la
      simulación de 3G de Chromium
- [ ] axe sin violaciones graves en cada pantalla nueva a 360 × 640, y la vista de
      lista del mapa se usa entera con el teclado
- [ ] Pasan `lint`, `typecheck`, `depcruise`, `test`, `test:int` y
      `scripts/revisar-colores.sh`; el contrato y los tipos quedan al día y el CI de
      `main` en verde

## 10. Riesgos

| Riesgo | Qué se hace |
|---|---|
| Nominatim bloquea por uso | Caché, una petición por segundo, `User-Agent` con contacto y límite por IP. En local el volumen es mínimo; antes de desplegar se revisa su política de uso |
| Los mosaicos de OSM en producción | Su política no admite tráfico alto. Para local basta; el proveedor de mosaicos se decide con el despliegue (P-032) |
| Leaflet y 3G | Carga diferida de la ruta del mapa y medición en el criterio de salida |

## 11. Cambios al construir

**2026-09-30 · API.** Construida según el [plan](../../05-planes/2026-09-30-bloque-1-api.md).

| Qué | Por qué |
|---|---|
| «Operador asignado» es `AlcanceService.exigir`, y `idsAsignados` se sumó al mismo servicio | Ya existía en `identidad`; un ayudante nuevo en `comun/autorizacion` lo habría duplicado |
| `AcopiosModule` es global | Así `identidad` recibe el `VerificadorUbicaciones` sin importar `acopios` |
| `nombres()` compara tipo e id | Una asignación ZONA con el id de un acopio debe dar `UBICACION_INEXISTENTE` |
| El correo de asignación nombra el acopio o la zona | `describir()` esperaba los nombres del Bloque 1 |
| Variable nueva `NOMINATIM_URL` | Permite apuntar a otra instancia de Nominatim sin tocar código |
| `@acopio/shared` se compila antes que la API (`build`, `start:dev`, `typecheck`, `openapi`, `seed:demo`); Jest lee el código fuente | El paquete publica ESM y hasta ahora nadie lo consumía |
| Las pruebas crean una entidad, dos acopios, una emergencia y una zona con id fijo | La API valida que las ubicaciones asignadas existan |
| Las restricciones CHECK limitan lat y lng a Colombia, y la población a no negativa | Evitan un pin fuera del país aunque se salte la validación |
| Los campos opcionales nuevos también salen como arreglos en el contrato | Es P-031; queda abierto |
| La búsqueda de ubicaciones ignora mayúsculas, no tildes | Con decenas de ubicaciones basta |
| Al editar u operar un acopio, la API lo lee con la fila bloqueada (`FOR UPDATE`) | En la revisión final apareció una carrera: un Operador que pausaba mientras el Administrador cerraba podía reabrir el acopio |
| La geocodificación tiene tope de cola (10 consultas distintas en espera; pasado el tope, 503) y de caché (500 respuestas), y las consultas iguales que llegan juntas comparten una llamada | El endpoint es público: sin tope, unas pocas IP podían hacer esperar minutos a los demás y la caché crecía sin límite |

**2026-10-01 · Interfaz, ciclo 1.** Construida según el [plan](../../05-planes/2026-09-30-bloque-1-interfaz-ciclo-1.md).

| Qué | Por qué |
|---|---|
| El filtro de categorías de P5 es «¿Qué vas a llevar?»: oculta los acopios que no reciben esa categoría y dice cuántos ocultó | El diseño de Stitch decía «No recibe: Ropa» como filtro, que muestra lo contrario de lo que pide RF-RED-002 |
| `GET /categorias/vigentes`, pública | `GET /categorias` exige sesión y además lista las archivadas para el Administrador |
| `distanciaKm` pasó de la API a `@acopio/shared`, y se sumaron `tramoActual` y `diaEnBogota` | La web calcula la distancia, «Cierra 12:00» y el día de hoy con las mismas reglas que la API |
| La web lee `@acopio/shared` desde su código fuente (alias de Vite y `paths`) | Así no hay que compilar el paquete antes de la web |
| El buscador de ubicaciones de C16 entró en este ciclo (B-08) | Sin él, asignar un acopio o una zona pedía pegar un id |
| La consola, el acceso y el mapa se cargan al abrirlos, y el build de la web fija `NODE_ENV=production` | En Fast 3G la Portada tardaba 3,0 s; ahora 2,6 s. El `.env` de la raíz trae `NODE_ENV=development` y Vite lo usaba en el build |
| El pin arrastrable lleva título y texto alternativo, y los mapas llevan `isolate` | axe pedía nombre para el marcador, y Leaflet tapaba la cabecera y la barra inferior |

**2026-10-01 · Interfaz, ciclo 2.** Construida según el [plan](../../05-planes/2026-10-01-bloque-1-interfaz-ciclo-2.md).

| Qué | Por qué |
|---|---|
| La matriz de acceso va en su propia ruta, `/consola/accesos`, y no dentro de C16 | C16 es solo del Administrador en la web y la matriz también es del Auditor |
| El Auditor tiene conmutador de ubicación cuando tiene dos o más | La API le exige al menos una ubicación asignada; el §6 solo dejaba sin selector al Administrador |
| Los Administradores no ocupan filas en la matriz; una línea dice cuántos son | Marcados en todas las columnas no informan nada |
| El CSV usa `;`, BOM y una fila por persona y ubicación | Así lo abre Excel en Colombia, con las tildes bien |
| Con conmutador, la cabecera muestra solo el logo en un teléfono | A 360 px el nombre de la ubicación se cortaba en «Acopi…» |

