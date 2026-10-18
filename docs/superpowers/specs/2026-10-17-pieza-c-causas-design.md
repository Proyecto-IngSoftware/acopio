---
title: "Pieza C · Verificación de entidades y causas · especificación"
type: spec
tags: [spec, bloque-1, causas]
estado: vigente
bloque: 1
actualizado: 2026-10-17
---

# Pieza C · Verificación de entidades y causas · especificación

**Fecha:** 2026-10-17
**Estado:** aprobada por Joseph el 2026-10-17
**Deriva de:** [especificación del Bloque 1](2026-09-30-bloque-1-red-design.md) §2 (pieza C),
[RF-RED-006 a RF-RED-010](../../01-requerimientos/funcionales/red.md#rf-red-006--verificar-entidad),
HU-02 y HU-15 ([avance 2](../../entregas/avance-02-requisitos.md)), y las maquetas aprobadas de
[P3](../../03-diseno/stitch/P03-causas/README.md) y [P4](../../03-diseno/stitch/P04-ficha-causa/README.md)
**Issue:** [#48](https://github.com/Proyecto-IngSoftware/acopio/issues/48), hasta el 1 de noviembre
**Plan:** [2026-10-17-pieza-c-causas.md](../../05-planes/2026-10-17-pieza-c-causas.md)

---

## 1. Objetivo

Que quien quiere donar dinero encuentre en Acopio causas de organizaciones reales, con el
paso a paso para donar en el sitio oficial de cada una, y que Acopio nunca lo mande a una
entidad que el equipo no revisó.

Hoy las entidades no usan Acopio. El equipo, con el rol de Administrador, registra la
entidad, la verifica y le arma las causas a partir de lo que la entidad ya pide en su sitio.
Más adelante las entidades podrán entrar a manejar sus causas; eso queda fuera de esta pieza.

**La pieza termina cuando**, en el Compose local:

1. El Administrador abre una entidad en C15, lee el aviso de seguridad, marca la casilla y la
   verifica. Le sube el logotipo.
2. Crea una causa de esa entidad con imagen, cuatro pasos, el enlace oficial y una fecha de
   cierre a dos meses. Confirma la publicación.
3. Una persona sin sesión abre `/causas`, ve la causa arriba con el sello «Verificada el…»,
   abre la ficha, toca «Ir al sitio oficial» y ve la hoja con el dominio de destino.
4. Al pasar la fecha de cierre, la causa sale del directorio y aparece en «Causas
   atendidas», con «Cerró el…».
5. El Administrador quita la verificación de la entidad. Sus causas activas pasan a
   atendidas, y en ellas ya no se ven ni el sello ni el enlace.
6. Todo lo anterior queda en la bitácora.

## 2. Alcance

### Dentro

| Área | Qué | Requerimientos |
|---|---|---|
| Verificación | Verificar y quitar la verificación de una entidad, con aviso de seguridad. Logotipo opcional | RF-RED-006 (cambiado, ver §3) |
| Causas | Crear, editar, renovar, archivar y reactivar, con fecha de cierre obligatoria | RF-RED-007, RF-RED-010 |
| Archivado | Tarea diaria que archiva las causas vencidas | RF-RED-010 |
| Público | P3 directorio, causas atendidas y P4 ficha, según las maquetas aprobadas | RF-RED-008, HU-02 |
| Personas desaparecidas | Tarjeta fija con los enlaces a la UBPD, la Cruz Roja Colombiana y Medicina Legal | RF-RED-008 |
| Consola | C15 con verificación y logotipo; C22 Causas, pantalla nueva | |
| Demo | `seed:demo` con dos entidades verificadas, causas activas y una atendida | |
| DAO | Migrar el módulo `acopios` a DAO (regla del `CLAUDE.md` al tocar un módulo sin migrar) | ADR-0019 |

### Fuera, y a dónde va

| Qué | Dónde |
|---|---|
| Que las entidades entren a Acopio a manejar sus causas | Sin fecha; cuando el equipo lo decida, con su `P-0NN` |
| Carrusel de entidades y causas en la Portada (P1, RF-HOM-003) | Pieza D ([#50](https://github.com/Proyecto-IngSoftware/acopio/issues/50)) |
| Documento soporte de la verificación | Descartado por ahora (C-01) |
| Vencimiento de la verificación de la entidad | Descartado por ahora (C-03) |
| Botón para pasar una entidad a `RECHAZADA` | El valor sigue en el esquema, sin uso en la interfaz |
| Causa enfocada en una emergencia (`emergencia_id`) | Sin uso hasta que lo pida una pantalla |
| Avisos por correo de causas por cerrar | `CORREO_ACTIVO=false` (P-055); la consola las marca |

## 3. Decisiones

Tomadas por Joseph el 2026-10-17, en la conversación de esta especificación.

| # | Decisión | Alternativa descartada y por qué |
|---|---|---|
| C-01 | Verificar es una marca del Administrador, sin subir documentos. Acopio guarda quién y cuándo. Para saber más de la entidad, la persona sale a su sitio oficial | Adjuntar un certificado (Cámara de Comercio, RUES): las entidades no participan todavía y el equipo no tiene ese documento |
| C-02 | En esta etapa solo se verifican organizaciones longevas y reconocidas en todo el mundo. Se acepta el riesgo con un aviso de seguridad antes de verificar y antes de publicar | Verificar cualquier entidad local: con una marca sin documento, el riesgo de estafa es demasiado alto |
| C-03 | El plazo vive en la causa: al crearla se fija una fecha de cierre obligatoria. Al pasar, Acopio la da por atendida y la archiva sola | Vencer la verificación de la entidad a los 6 meses: el equipo revisa campañas, no entidades |
| C-04 | La fecha de cierre queda como máximo a 6 meses. El Administrador puede renovar (otro plazo de hasta 6 meses) o archivar antes; si no hace nada, se archiva en la fecha | Causas sin fecha: se quedan en el directorio sin que nadie las revise |
| C-05 | El directorio muestra primero lo más reciente: cuenta tanto una causa nueva como una renovada o reactivada | Orden alfabético o por categoría: no le da visibilidad a lo que el equipo acaba de revisar |
| C-06 | «Causas atendidas» es una pantalla aparte de P3, y la ficha de una atendida mantiene el enlace al sitio oficial ([P-064](../../01-requerimientos/pendientes.md)) | Un filtro dentro de P3; quitar el enlace a todas las atendidas |
| C-07 | Personas desaparecidas no se gestiona: sus tres enlaces van fijos en el código y nadie puede crear causas en esa categoría | Causas editables en esa categoría: abre la puerta a guardar datos de personas, que está fuera de alcance |

Decisiones de Claude, que Joseph aprobó al revisar la lógica:

| # | Decisión | Por qué |
|---|---|---|
| C-08 | Si a una entidad le quitan la verificación, sus causas activas pasan a atendidas, y en todas sus atendidas se ven sin sello y sin enlace, con «Esta entidad ya no está verificada por Acopio». Volver a verificarla no revive sus causas | Quitar la verificación es una señal de riesgo; el enlace de C-06 solo vale mientras la entidad siga verificada |
| C-09 | El aviso sale en los dos momentos. Al verificar va el aviso completo con una casilla obligatoria; al publicar, renovar o reactivar una causa, una confirmación corta con la entidad y el dominio de destino | Verificar es la decisión de confianza; publicar es cuando la dirección llega al público |
| C-10 | La imagen de la causa y el logotipo son opcionales. Sin imagen se ve el espacio neutro de la maqueta; sin logotipo, las iniciales | Muchas organizaciones no tienen una imagen libre de usar para cada campaña |

C-01 y C-03 cambian RF-RED-006, RF-RED-007, RF-RED-010 y el criterio 1 de HU-15, y
[modelo-datos.md](../../02-arquitectura/modelo-datos.md) (`entidad` y `causa`). Se anotan
en [P-065](../../01-requerimientos/pendientes.md), y los requerimientos se reescriben en el
mismo PR de esta especificación.

## 4. Datos

```
entidad                                       columnas nuevas
  verificada_por uuid? (FK usuario) · verificada_en timestamptz?
  logo_key text?
  CHECK ((verificacion = 'VERIFICADA') = (verificada_en IS NOT NULL))

causa
  id uuid
  entidad_id uuid (FK, NOT NULL)
  categoria  PERSONAS | ANIMALES | ADULTOS_MAYORES | RESCATISTAS
  titulo text (5 a 120) · descripcion text (20 a 2000)
  imagen_key text?
  pasos jsonb        ["Entra al sitio oficial de la fundación.", …]   1 a 10, cada uno de 3 a 300
  url_oficial text   https, máximo 500
  cierra_el date
  publicada_en timestamptz        orden del directorio
  archivada_en timestamptz? · archivo_motivo  VENCIDA | MANUAL | ENTIDAD_SIN_VERIFICAR ?
  archivada_por uuid? (FK usuario)  null cuando la archiva la tarea diaria
  creada_por uuid (FK usuario) · creado_en · actualizado_en
  CHECK ((archivada_en IS NULL) = (archivo_motivo IS NULL))
  INDEX (archivada_en, publicada_en DESC)
```

### Reglas

- **Hoy** es la fecha en `America/Bogota`. Una causa con `cierra_el` del 30 de octubre se ve
  todo ese día.
- **Activa** es la causa sin `archivada_en`, con `cierra_el >= hoy` y con su entidad
  `VERIFICADA`. El directorio público aplica las tres condiciones al leer, así una causa
  vencida no se ve aunque la tarea diaria no haya corrido.
- **Atendida** es cualquier causa que no esté activa. La tarea diaria (`10 0 * * *`,
  `America/Bogota`, nombre `archivar-causas`) pone `archivada_en` y `VENCIDA` a las que
  pasaron su fecha. No se registra con `NODE_ENV=test`; las pruebas llaman al método.
- **Rango de la fecha de cierre.** Al crear, renovar o reactivar, `cierra_el` va de hoy a
  hoy más 6 meses de calendario (`addMonths`; del 31 de agosto, el 28 o 29 de febrero).
  Fuera de ese rango, 422 `CIERRE_FUERA_DE_RANGO`. Editar una causa activa también puede
  mover la fecha dentro del rango, contado desde hoy.
- **Orden.** `publicada_en` toma la hora actual al crear, renovar y reactivar, y no cambia al
  editar. El directorio ordena por `publicada_en` descendente; las atendidas, por `cerroEl`
  descendente. `cerroEl` es la fecha de `archivada_en` o, si venció y la tarea diaria aún no
  corrió, el día siguiente a `cierra_el`.
- **Verificar exige sitio web.** Una entidad sin `sitio_web` no se puede verificar: 422
  `ENTIDAD_SIN_SITIO`. El aviso pide revisar ese sitio.
- **Dominio distinto.** Si el dominio de `url_oficial` no coincide con el de `sitio_web` de la
  entidad (ni es un subdominio suyo), la API lo acepta pero la respuesta de gestión trae
  `dominioDistinto: true`, y la confirmación de publicar lo advierte: «Ojo: el sitio de la
  entidad es [dominio de la entidad]».
- **Entidad verificada.** Crear, renovar, reactivar o mover una causa a otra entidad exige la
  entidad `VERIFICADA`; si no, 409 `ENTIDAD_SIN_VERIFICAR`. Lo revisa el servicio dentro de
  la transacción.
- **Quitar la verificación** pone la entidad en `SIN_VERIFICAR`, borra `verificada_en` y
  `verificada_por`, y archiva sus causas activas con `ENTIDAD_SIN_VERIFICAR`, en la misma
  transacción y con una fila de bitácora por causa.
- **Enlace oficial.** Se valida con `new URL()`: protocolo `https:`, sin usuario ni
  contraseña en la dirección y con un dominio que tenga al menos un punto. Si no, 422
  `URL_NO_SEGURA`. La API devuelve también `dominio` (el `hostname` sin `www.`), que es lo
  que muestra la hoja de salida.
- **Imágenes.** Pasan por `procesarImagen` de `almacenamiento` (WebP sin metadatos, hasta
  8 MB). Se guardan en `causas/<id>.webp` y `entidades/<id>/logo.webp`, reemplazando la
  anterior. Para el logotipo se usa la miniatura.
- **Bitácora.** Toda escritura deja su fila con antes y después, en la misma transacción,
  incluida la confirmación del aviso (`confirmo: true` en el «después»).
- **Permisos.** `acopio_app` recibe `SELECT`, `INSERT` y `UPDATE` sobre `causa`. Nada se
  borra.

## 5. API

Todo vive en el módulo `acopios`, como dice la
[arquitectura](../../02-arquitectura/vista-general.md) («entidades, causas y su archivado»).
No cambia la tabla de dependencias: `acopios` ya puede importar `almacenamiento`.

### Público

| Ruta | Qué |
|---|---|
| `GET /causas?categoria=` | Causas activas, por `publicada_en` descendente |
| `GET /causas/atendidas?categoria=` | Causas atendidas, con `cerroEl` y `motivo` |
| `GET /causas/:id` | Ficha, activa o atendida. Un id que no existe da 404 |
| `GET /causas/:id/imagen` · `GET /entidades/:id/logo` | La imagen, con `Cache-Control: public, max-age=300`. Sin imagen, 404. La web agrega `?v=` con `actualizado_en` para que una imagen reemplazada no salga de la caché |

La respuesta pública de una causa trae `entidad { id, nombre, tieneLogo, verificadaEn }`.
Si la entidad ya no está verificada (C-08), `verificadaEn` y `urlOficial` vienen en `null` y
la web muestra la nota. Las rutas públicas nunca exponen quién creó ni quién archivó.

### Administrador

| Ruta | Qué |
|---|---|
| `GET /causas/gestion?estado=activas\|por-cerrar\|atendidas` | Lista de C22. «Por cerrar» es el subconjunto de las activas con `cierra_el` en los próximos 15 días; también salen en «Activas», marcadas |
| `POST /causas` · `PATCH /causas/:id` | Crear (con `confirmo: true`) y editar. Una atendida no se edita: 409 `CAUSA_ATENDIDA` |
| `POST /causas/:id/renovar` | `{ cierraEl, confirmo: true }`. Solo activas |
| `POST /causas/:id/archivar` | Motivo `MANUAL`. Solo activas |
| `POST /causas/:id/reactivar` | `{ cierraEl, confirmo: true }`. Solo atendidas |
| `PUT` · `DELETE /causas/:id/imagen` | Subir (multipart, campo `imagen`) y quitar |
| `POST /entidades/:id/verificar` | `{ confirmo: true }` |
| `POST /entidades/:id/quitar-verificacion` | Devuelve cuántas causas archivó |
| `PUT` · `DELETE /entidades/:id/logo` | Subir y quitar |
| `GET /entidades` | Ya existe; suma `verificadaEn`, `tieneLogo` y el número de causas activas |

Sin `confirmo: true` donde se pide, 422 `CONFIRMACION_REQUERIDA`. Una categoría fuera de
las cuatro (también `PERSONAS_DESAPARECIDAS`) la rechaza la validación del DTO.

### Migración a DAO

`acopios` entra en `MIGRADOS_A_DAO`: `entidad.dao.ts` y `causa.dao.ts` nuevos, y los
servicios que hoy inyectan `PrismaService` (`entidades`, `acopios`, `zonas` y `ubicaciones`)
pasan a sus DAO. Es lo primero del plan, con las pruebas de integración de `acopios` en
verde antes de tocar nada de causas.

### Contrato

Se regeneran `openapi.json` y los tipos de la web.

## 6. Web

### Público

Según las [maquetas aprobadas](../../03-diseno/stitch/P03-causas/maqueta.html):

| Ruta | Pantalla |
|---|---|
| `/causas` | P3. Aviso de que Acopio no recibe dinero, chips de categoría, tarjetas y, en «Todas» y en su chip, la tarjeta fija de personas desaparecidas. Al final, la fila a «Causas atendidas» |
| `/causas/atendidas` | Lista de atendidas con «Cerró el…» y sus chips, sin personas desaparecidas |
| `/causas/:id` | P4. Con la hoja de salida, que abre el enlace en otra pestaña con `rel="noopener noreferrer"`. En una atendida, la franja de cierre arriba y el enlace como botón secundario; con la entidad sin verificar, sin sello ni enlace y con la nota |

- La nota de P4 cambia a «Verificada por el equipo de Acopio» (C-01), en lugar de la que
  mencionaba un documento soporte. Se corrige también en la maqueta.
- La vista sin causas sale tal como en la maqueta.
- `/causas/` entra en `PRECARGAS` de `vite.config.ts`, porque la ficha se comparte por enlace.

### Consola

| Pantalla | Qué |
|---|---|
| C15 Entidades | Cada fila muestra el sello o «Sin verificar». La hoja de la entidad suma el logotipo y los botones «Verificar» y «Quitar verificación». Verificar abre el aviso completo con la casilla; quitar pide confirmación y dice cuántas causas activas pasan a atendidas |
| C22 Causas (nueva) | Desde «Más», solo Administrador, en `/consola/causas`. Pestañas Activas, Por cerrar y Atendidas. El formulario pide entidad (solo verificadas), categoría, título, descripción, imagen, pasos (agregar, quitar y reordenar), enlace oficial y fecha de cierre. Acciones: renovar, archivar y reactivar, con la confirmación corta |

**Texto del aviso al verificar** (C-02, C-09):

> Acopio va a dirigir a los donantes hacia esta entidad. Si no es quien dice ser, los
> estaremos mandando a una estafa. En esta etapa solo se verifican organizaciones con años de
> trayectoria y reconocidas fuera del país.
>
> ☐ Confirmo que revisé la entidad y su sitio oficial.

**Confirmación al publicar, renovar o reactivar:** «Vas a publicar una causa de
[entidad]. El botón llevará a [dominio]. ¿Revisaste que ese sea el sitio oficial?», con
«Publicar» y «Revisar de nuevo».

**Diseño.** C22 y los cambios de C15 se generan en Stitch y Joseph los aprueba antes de
escribir su código, como cualquier pantalla.

## 7. Orden de construcción

1. Migrar `acopios` a DAO, sin cambiar comportamiento.
2. Esquema y migración: columnas de `entidad`, tabla `causa`, permisos.
3. API de verificación y logotipo; luego la de causas, la tarea diaria y las rutas públicas.
4. Contrato y tipos de la web.
5. Público: P3, atendidas y P4, con su recorrido.
6. Maquetas de C22 y C15 en Stitch, aprobación de Joseph.
7. Consola: C15 y C22, con su recorrido.
8. `seed:demo` y criterios de salida.

Los pasos 1 a 5 no esperan las maquetas de consola; el 6 puede pedirse en paralelo.

### Datos de ejemplo

`seed:demo` crea, si no existen, dos entidades verificadas por la cuenta de Joseph (por
ejemplo, Cruz Roja Colombiana y UNICEF Colombia), con sus sitios reales, tres causas
activas con distintas categorías y fechas, y una atendida con motivo `VENCIDA`. Los títulos
terminan en «(demo)», como las zonas «(prueba)», y los enlaces van a la página general de
donaciones de cada organización: el servidor de pruebas es público y no debe mostrar campañas
inventadas como si fueran de ellas.

## 8. Pruebas

- **Unitarias** (`packages/shared` o el módulo): rango de la fecha de cierre con fin de mes,
  validación del enlace (`http:`, `javascript:`, usuario en la dirección, dominio sin punto) y
  cálculo de `dominio`.
- **Integración:** crear sin entidad verificada da 409; crear sin `confirmo` da 422; una causa
  con `cierra_el` de ayer no sale en `GET /causas` aunque no tenga `archivada_en`; la tarea
  diaria la archiva con `VENCIDA`; quitar la verificación archiva las activas y deja
  `urlOficial` en `null` en sus atendidas; reactivar de una entidad sin verificar da 409;
  cada escritura deja su fila de bitácora; `acopio_app` no puede borrar causas.
- **Web (Vitest):** P3 con causas y vacía, el chip de personas desaparecidas solo con los
  tres enlaces, P4 con la hoja de salida y el dominio, la atendida con y sin entidad
  verificada, el aviso de C15 con el botón inactivo hasta marcar la casilla.
- **Recorridos:** `portal-causas.mjs` (P3, ficha, hoja de salida, atendidas) y
  `consola-causas.mjs` (verificar con el aviso, crear, renovar, archivar, quitar la
  verificación).

## 9. Criterios de salida

1. Los seis pasos de §1 en el Compose local.
2. Criterios de HU-02 y de HU-15 verificados uno por uno, por Joseph. HU-15 queda así
   desde P-065 (el avance 2 se entregó con la versión anterior y no se reescribe):
   1. **Dado que** no marqué la casilla del aviso de seguridad, **cuando** intento verificar
      una entidad, **entonces** el sistema no me deja.
   2. **Dado que** la fecha de cierre de una causa pasó sin renovarse, **cuando** corre la
      revisión diaria, **entonces** la causa se archiva y sigue visible en «causas
      atendidas».
   3. **Dado que** le quito la verificación a una entidad, **cuando** alguien abre sus causas
      atendidas, **entonces** no ve ni el sello ni el enlace al sitio oficial.
3. `lint`, `typecheck`, `depcruise`, `test`, `test:int` y `revisar-colores.sh` en verde.
4. Los dos recorridos pasan en local y en el servidor de pruebas.

## 10. Riesgos

| Riesgo | Qué se hace |
|---|---|
| Se verifica una entidad falsa y Acopio manda donantes a una estafa | C-02 y C-09: solo organizaciones reconocidas, aviso con casilla y bitácora de quién confirmó. Quitar la verificación corta el enlace en todas sus causas al instante |
| El sitio oficial cambia de dueño después de publicar | La causa vence como máximo a los 6 meses y alguien tiene que renovarla mirando el enlace |
| Una imagen subida no tiene permiso de uso | El Administrador sube solo imágenes de la entidad o propias; la imagen es opcional (C-10) |
| Migrar `acopios` a DAO rompe algo de los bloques anteriores | Va primero y solo, con las pruebas de integración existentes como red |

## 11. Cambios al construir

Vacía hasta que empiece la construcción.
