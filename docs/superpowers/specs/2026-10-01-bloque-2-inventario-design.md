---
title: "Bloque 2 · Inventario · especificación"
type: spec
tags: [spec, bloque-2]
estado: vigente
bloque: 2
actualizado: 2026-10-01
---

# Bloque 2 · Inventario · especificación

**Fecha:** 2026-10-01
**Estado:** aprobada por Joseph el 2026-10-01
**Deriva de:** [especificación general](2026-08-20-acopio-design.md) §13,
[RF-INV](../../01-requerimientos/funcionales/inventario.md),
[RF-CAT-004](../../01-requerimientos/funcionales/catalogo.md#rf-cat-004--mapear-códigos-de-barras),
[ADR-0002](../../02-arquitectura/adr/ADR-0002-saldo-derivado.md) y
[ADR-0005](../../02-arquitectura/adr/ADR-0005-offline-solo-movimientos.md)
**Plan:** uno para la API y uno por ciclo de interfaz, escritos al empezar cada etapa

---

## 1. Objetivo

Que cada acopio sepa cuánto tiene de cada categoría y pueda explicar por qué. El
Operador registra lo que entra, sale o se corrige, y el saldo sale de esos movimientos,
que nunca se editan ni se borran.

**El bloque termina cuando**, en el Compose local:

1. Un Operador abre C4 en su acopio, busca «panal», registra 24 «Pañal adulto» y ve el
   saldo resultante, todo en menos de 10 segundos.
2. Escanea un EAN que el sistema no conoce, lo asocia a una categoría y la segunda vez
   el escáner la llena solo.
3. Sin red, registra tres entradas; la cabecera dice «3 sin sincronizar». Al volver la
   señal se envían solas y el historial las muestra con la hora en que ocurrieron y la
   hora en que llegaron.
4. Registra una salida por «Entrega directa a familias»; una salida mayor que el saldo
   se rechaza con el saldo disponible.
5. Hace un conteo físico, escribe el motivo y el ajuste queda destacado en la bitácora.
6. Fija mínimo y máximo de una categoría y C3 muestra el semáforo con ícono y texto;
   las demás categorías dicen «Sin umbral».
7. El Auditor abre C3 de ese acopio desde C21 y explica cualquier saldo desde el
   historial.

## 2. Alcance

| Entra | Requisito |
|---|---|
| Registrar entrada (C4) | RF-INV-001 |
| Escanear código de barras y aprender EAN | RF-INV-002, RF-CAT-004 |
| Registrar salida con motivo | RF-INV-003 |
| Ajustar por conteo físico (C6) | RF-INV-004 |
| Consultar saldos (C3) | RF-INV-005 |
| Historial de una categoría | RF-INV-006 |
| Umbrales por acopio y categoría (C7) | RF-INV-007 |
| Captura sin conexión de entradas | RF-INV-009 |
| Integridad transaccional y prueba de concurrencia | RF-INV-011 |

**No entra:**
- Alerta de vencimiento (RF-INV-010). El vencimiento estimado de C3 la deja a mano.
- Movimientos en zonas (`RECEPCION`), comprobantes y remisiones: Bloques 3 y 4.
- «No recibir» (RF-INV-008), que ya se construyó en el Bloque 1.

## 3. Decisiones

Tomadas por Joseph el 2026-10-01.

| # | Decisión | Alternativa descartada y por qué |
|---|---|---|
| V-01 | Entran el escáner con RF-CAT-004 y la captura sin conexión. La alerta de vencimiento queda fuera | Solo los DEBE: C4 pierde el atajo y el modo sin señal, que es la razón de ADR-0002. Todo: la alerta pide saldo por lote |
| V-02 | El saldo es por acopio y categoría. La entrada guarda `vence_en`; salidas y ajustes no eligen lote. Lo que vence primero se estima suponiendo que sale primero lo que vence antes | Saldo por lote: exacto, pero suma un paso a cada salida y obliga a contar lote por lote |
| V-03 | Sin umbral configurado, la categoría muestra «Sin umbral», sin semáforo. RF-INV-007 se ajusta: la canasta servirá de referencia cuando haya población (zonas, Bloque 4) | Por personas atendidas: pide un dato que los acopios rara vez conocen. Valor fijo por categoría: trata igual a una parroquia y a un coliseo |
| V-04 | Solo el Operador asignado al acopio registra movimientos. El Administrador y el Auditor consultan; el Administrador también fija umbrales | Que el Administrador registre en cualquier acopio: diluye quién responde por el inventario |
| V-05 | Una salida sin remisión elige un motivo de una lista corta (Entrega directa a familias, Traslado a otra organización, Vencido o dañado, Otro); Traslado y Otro piden nota | Texto libre: no se puede contar ni filtrar |
| V-06 | El saldo vive en una tabla `saldo` que mantiene un disparador `AFTER INSERT` sobre `movimiento`, con `CHECK (cantidad >= 0)`. Va en ADR-0015 | Vista materializada (`modelo-datos.md`): PostgreSQL no la refresca por fila y los refrescos completos se bloquean entre sí. Vista que suma al leer con candado en la API: deja el «no negativo» en el código |
| V-07 | Sin conexión solo se capturan entradas. El armazón de la web lo guarda un service worker con `vite-plugin-pwa`. Va en ADR-0016 | Salidas sin conexión: podrían dejar un saldo negativo que nadie ve hasta sincronizar |
| V-08 | `movimiento` y `umbral` llevan llave foránea a `acopio`, no `ubicacion_tipo` + `ubicacion_id` | Es lo que se hizo con `no_recibir` en el Bloque 1. Cuando las zonas tengan movimientos se suma `zona_id` con un `CHECK` de exactamente uno |

## 4. Datos

### `movimiento` (módulo `inventario`)

```
movimiento
  id               uuid pk           puede venir del cliente: llave de idempotencia
  acopio_id        fk acopio
  categoria_id     fk categoria
  tipo             ENTRADA | SALIDA | AJUSTE
  cantidad         numeric(12,3)     > 0
  signo            smallint          +1 | -1
  motivo_salida    ENTREGA_FAMILIAS | TRASLADO | VENCIDO | OTRO ?
  nota             text?
  motivo           text?             ajuste, 10 caracteres o más
  vence_en         date?             solo en entradas
  usuario_id       fk usuario
  ocurrido_en      timestamptz
  registrado_en    timestamptz       default now()
  origen_offline   bool

  CHECK (cantidad > 0)
  CHECK (tipo <> 'ENTRADA' OR signo = 1)
  CHECK (tipo <> 'SALIDA'  OR signo = -1)
  CHECK (tipo <> 'SALIDA'  OR motivo_salida IS NOT NULL)
  CHECK (motivo_salida NOT IN ('TRASLADO', 'OTRO') OR length(nota) > 0)
  CHECK (tipo <> 'AJUSTE'  OR length(motivo) >= 10)
  CHECK (tipo = 'ENTRADA'  OR vence_en IS NULL)
  índices: (acopio_id, categoria_id, registrado_en), (registrado_en)
```

`acopio_app` tiene solo `SELECT` e `INSERT` sobre `movimiento`. Un error se corrige con un
ajuste.

### `saldo`

```
saldo
  acopio_id · categoria_id      PK
  cantidad          numeric(12,3)  CHECK (cantidad >= 0)
  ultimo_movimiento timestamptz
```

La mantiene el disparador `AFTER INSERT` sobre `movimiento` (función `SECURITY DEFINER`
del dueño): actualiza la fila y, si no existe, la inserta (§12).
La actualización bloquea solo esa fila: dos registros sobre la misma categoría se
ordenan y los de categorías distintas no se estorban. Si el resultado fuera negativo, el
`CHECK` hace fallar la transacción entera. `acopio_app` tiene solo `SELECT` sobre
`saldo`.

### `umbral`

```
umbral
  acopio_id · categoria_id      PK
  minimo numeric(12,3) · maximo numeric(12,3)
  actualizado_por fk usuario · actualizado_en timestamptz
  CHECK (minimo >= 0 AND minimo <= maximo)
```

Sin fila, la categoría no tiene umbral.

### `codigo_barras` (módulo `catalogo`)

```
codigo_barras
  ean          text PK
  categoria_id fk categoria
  contenido    numeric(12,3)?   unidad base que trae una presentación
  descripcion  text?
  creado_por   fk usuario
  revisado     bool             false si lo asoció un Operador
```

### Funciones puras en `@acopio/shared`

- **`semaforo(saldo, umbral)`**: `SIN_UMBRAL` si no hay umbral; `BAJO` por debajo del
  mínimo; `CERCA` hasta 25 % por encima del mínimo; `EN_RANGO`; `SOBRE` por encima del
  máximo. La web lo pinta en rojo, ámbar, verde y morado, siempre con ícono y texto.
- **`vencimientoEstimado(movimientos)`**: ordena las entradas por `vence_en` y les
  descuenta, de la que vence primero en adelante, las salidas y los ajustes a la baja.
  Devuelve lo que queda de cada fecha. Las entradas sin fecha van al final.

## 5. API

Todo bajo `/api`. Cada escritura deja su bitácora en la misma transacción, con antes y
después; los ajustes van `destacado`.

| Endpoint | Quién | Qué |
|---|---|---|
| `POST /acopios/:id/entradas` | Operador asignado | `{ id?, categoriaId, cantidad, venceEn?, ocurridoEn?, origenOffline? }` → movimiento, saldo y `noRecibe` |
| `POST /acopios/:id/salidas` | Operador asignado | `{ categoriaId, cantidad, motivoSalida, nota? }`. Sin saldo suficiente: 409 `SALDO_INSUFICIENTE` con el saldo actual |
| `POST /acopios/:id/ajustes` | Operador asignado | `{ categoriaId, cantidadContada, motivo }`. La diferencia se calcula con el saldo leído bajo el candado de (acopio, categoría) (§12); si es cero, 422 `SIN_DIFERENCIA` |
| `GET /acopios/:id/saldos` | Operador asignado, Administrador, Auditor | Por categoría: saldo, unidad, umbral, semáforo, último movimiento y vencimiento estimado. Incluye las categorías con umbral y saldo cero |
| `GET /acopios/:id/movimientos?categoriaId=&cursor=` | Los mismos | Historial con el saldo corriente de cada fila, en el orden en que entraron los movimientos (§12) |
| `PUT /acopios/:id/umbrales/:categoriaId` | Operador asignado, Administrador | `{ minimo, maximo }` |
| `DELETE /acopios/:id/umbrales/:categoriaId` | Operador asignado, Administrador | Quita el umbral |
| `GET /codigos-barras/:ean` | Operador, Administrador | Categoría y contenido, o 404 |
| `POST /codigos-barras` | Operador, Administrador | Asocia un EAN; el de un Operador queda sin revisar |
| `GET /codigos-barras?revisado=` | Administrador | Para C18 |
| `PATCH /codigos-barras/:ean` | Administrador | Cambiar categoría o contenido, marcar revisado |

**Reglas:**
- **Idempotencia:** un `id` repetido con el mismo contenido devuelve 200 con el
  movimiento original; con otro contenido, 409 `MOVIMIENTO_DISTINTO`.
- **`ocurridoEn`:** hasta 7 días atrás y nunca más de 5 minutos en el futuro (422
  `FECHA_FUERA_DE_RANGO`). Sin él, la hora del servidor.
- **Acopio cerrado:** 409. Uno pausado sí registra.
- **Categoría archivada:** 422. Las categorías en `UNIDAD` solo aceptan enteros.
- **Vencimiento:** obligatorio en la entrada de un perecedero (422); prohibido en salidas
  y ajustes.
- **«No recibir»:** la entrada no se bloquea; la respuesta trae `noRecibe: true`.
- **Dependencias:** `inventario` usa `catalogo` (categorías) y `acopios` (estado del
  acopio), como permite la tabla de `vista-general.md`. `codigo_barras` vive en
  `catalogo`.
- Se regeneran el contrato y los tipos de la web.

## 6. Web

### Pantallas

| Pantalla | Qué hace |
|---|---|
| **C4 Entrada rápida** | Busca la categoría (`GET /categorias/buscar`) o la escanea; teclado numérico grande con la unidad fija; fecha de vencimiento si es perecedero; «Registrar» en un toque; muestra el saldo resultante. Si la categoría no se recibe, advierte antes de confirmar. Queda lista para la siguiente entrada |
| **C3 Inventario** | Saldo, unidad, semáforo o «Sin umbral», antigüedad y «vence primero» por categoría. Ordena por criticidad, nombre o antigüedad. Cada fila abre el historial |
| **Historial** | Dentro de C3. Tipo, cantidad, quién, cuándo y saldo corriente. Marca lo registrado sin conexión con sus dos horas y los ajustes con su motivo |
| **C5 Salida** | Categoría, cantidad con el saldo a la vista y motivo de la lista. En perecederos propone lo que vence primero |
| **C6 Conteo físico** | Cantidad contada, diferencia a la vista y motivo obligatorio |
| **C7 Umbrales y no recibir** | El C7 actual suma mínimo y máximo por categoría |
| **C18 Catálogo** | Pestaña «Códigos de barras» para revisar los EAN aprendidos |

**Navegación:** todo cuelga de la ubicación activa. En «Más», la sección «Mi acopio» suma
Entrada rápida, Inventario, Salida y Conteo. El Administrador y el Auditor abren C3 e
Historial, solo lectura, desde C21. Si la entrada rápida necesita un acceso más directo
se decide en la maqueta.

Cada pantalla se pide en Stitch antes de construirla; sin maqueta aprobada por Joseph no
se escribe código. Sirven de punto de partida las pantallas viejas «Inventario y Saldos
de Bodega», «Recepción Rápida en Fila» y «Faltantes y Bloqueados».

### Escáner

`@zxing/browser` se descarga solo al tocar «Escanear». Un EAN conocido llena la
categoría; con `contenido`, C4 cuenta presentaciones («12 botellas × 0,6 L = 7,2 L»). Un
EAN desconocido ofrece elegir la categoría y queda aprendido sin revisar. Sin permiso de
cámara aparece un aviso y la búsqueda sigue al mismo alcance. Sin red no se aprenden EAN.

### Captura sin conexión

- **Armazón:** service worker de `vite-plugin-pwa` que guarda el build y responde
  `index.html` a cualquier navegación. `registerType: 'prompt'`: una versión nueva se
  anuncia y se recarga cuando el Operador acepta.
- **Datos locales** (IndexedDB), guardados al abrir C4 con red: categorías vigentes,
  «no recibir» del acopio, últimos saldos y EAN escaneados en el teléfono. Sin red la
  búsqueda filtra esa copia sin tildes ni mayúsculas; la tolerancia a errores de tipeo
  queda para cuando hay conexión.
- **Sesión:** la web recuerda el último usuario (nombre, rol y asignaciones, nunca el
  token) y deja capturar. Un 401 al sincronizar conserva la cola y pide volver a entrar.
- **Cola** por usuario, con el `id` y el `ocurridoEn` de cada movimiento. Se envía en
  orden con el evento `online` y al abrir la aplicación, con reintentos cada vez más
  espaciados hasta 5 minutos. Un rechazo (4xx que no sea 401 ni 429) queda marcado en C4
  con su motivo; el Operador lo corrige o lo descarta a mano.
- **Indicador:** pastilla «3 sin sincronizar» en la cabecera mientras haya pendientes.
- **Saldo sin red:** el último conocido más lo pendiente, marcado como estimado.

## 7. Orden de construcción

1. **API:** migración con tablas, disparador y permisos; `@acopio/shared` (semáforo y
   vencimiento estimado); endpoints; prueba de concurrencia; contrato.
2. **Interfaz, ciclo 1:** C4 con conexión, C3 e Historial.
3. **Interfaz, ciclo 2:** C5, C6, umbrales en C7, escáner y pestaña de C18.
4. **Interfaz, ciclo 3:** captura sin conexión.

Si el tiempo no alcanza se recorta primero el ciclo 3 y después el escáner.

## 8. Pruebas

| Qué | Cómo |
|---|---|
| Concurrencia (RF-INV-011) | Integración contra PostgreSQL: 20 salidas simultáneas de 1 sobre un saldo de 12; pasan exactamente 12 y el saldo queda en 0. Entradas y salidas cruzadas en dos categorías; al final `saldo` es igual a la suma de los movimientos |
| Permisos | `acopio_app` no puede `UPDATE` ni `DELETE` en `movimiento` ni escribir en `saldo`. Operador de otro acopio: 403. Auditor que registra: 403 |
| Reglas | Los `CHECK`; idempotencia; `ocurridoEn` fuera de rango; acopio cerrado; categoría archivada; enteros en `UNIDAD`; ajuste sin diferencia |
| `@acopio/shared` | Semáforo en sus bordes; vencimiento estimado con salidas que agotan varias fechas, ajustes al alza y entradas sin fecha |
| Cola sin conexión | Vitest con `fake-indexeddb`: orden, reintento, 401 que conserva la cola, rechazo visible, idempotencia |
| Web | Vitest y axe por pantalla con `responderSegun`. En el cierre, Chromium a 360 × 640: C4 cronometrado y recorrido sin red con Playwright |

## 9. Criterios de salida

- [ ] El recorrido del §1 funciona en el Compose local
- [ ] Una entrada en C4 toma menos de 10 s en el recorrido cronometrado
- [ ] La prueba de concurrencia pasa en el CI, y `saldo` coincide con la suma de los
      movimientos
- [ ] Las entradas capturadas sin red se sincronizan sin duplicados
- [ ] axe sin violaciones graves en cada pantalla nueva a 360 × 640
- [ ] Pasan `lint`, `typecheck`, `depcruise`, `test`, `test:int` y
      `scripts/revisar-colores.sh`; el contrato y los tipos quedan al día y el CI de
      `main` en verde

## 10. Riesgos

| Riesgo | Qué se hace |
|---|---|
| El service worker sirve una versión vieja tras un despliegue | `registerType: 'prompt'`; nunca recarga a mitad de una captura |
| La cámara falla en teléfonos viejos o con poca luz | El escáner es un atajo; la búsqueda siempre está al mismo alcance |
| Se acumulan registros sin conexión durante días | Límite de 7 días en `ocurridoEn`; lo más viejo se rechaza con su motivo y queda visible |
| El disparador y Prisma se desalinean | La migración del disparador es SQL a mano y una prueba de integración compara `saldo` con la suma real |

## 11. Documentos que cambian

- ADR-0015: saldo en tabla mantenida por disparador (ajusta la estrategia de ADR-0002).
- ADR-0016: service worker con `vite-plugin-pwa`.
- `modelo-datos.md`: `movimiento`, `saldo`, `umbral` y la estrategia de saldos.
- RF-INV-003 (motivos de salida), RF-INV-007 (sin umbral por defecto), RF-INV-009 (solo
  entradas) y RF-CAT-004.
- Regla de «Sincronizado» en los [componentes compartidos](../../03-diseno/stitch/_compartidos/README.md).
- Catálogo de pantallas: C5 es «Salida» mientras no haya remisiones.
- `pendientes.md`: la alerta de vencimiento queda fuera de este bloque.

## 12. Cambios al construir

**2026-10-01 · API.** Construida según el [plan](../../05-planes/2026-10-01-bloque-2-api.md).

| Qué | Por qué |
|---|---|
| El disparador actualiza la fila de `saldo` y solo la inserta si no existe | Con `INSERT … ON CONFLICT DO UPDATE`, PostgreSQL revisa el `CHECK` sobre la fila propuesta: toda salida fallaba aunque el saldo alcanzara. Va en una migración aparte porque la primera ya estaba aplicada |
| Antes de una salida o un ajuste, la API toma `pg_advisory_xact_lock` por acopio y categoría | `SELECT … FOR UPDATE` pide permiso de `UPDATE` sobre `saldo`, y `acopio_app` no lo tiene a propósito. ADR-0015 quedó precisado |
| Los `CHECK` de nota y motivo usan `coalesce` | `length(trim(NULL))` da NULL, y un `CHECK` que da NULL deja pasar la fila |
| El Administrador y el Auditor leen saldos e historial de cualquier acopio; el Operador, los suyos | §1.7. `AlcanceService` limita al Auditor a sus asignaciones, así que las lecturas de inventario tienen su propia regla |
| `SALDO_INSUFICIENTE` trae `detalles: { saldo }`, y `ErrorDto.detalles` admite un objeto además de la lista de campos | La interfaz muestra cuánto hay disponible sin otra consulta |
| `seed:demo` deja 6 entradas en el primer acopio de prueba | Para ver C3 con datos en local |
| `movimiento.secuencia` (`bigserial`) ordena el historial, su saldo corriente y el cursor | `registrado_en` es la hora de inicio de la transacción: una salida que esperó el candado podía quedar antes de la entrada que gastó y mostrar un saldo negativo. Además, el cursor con milisegundos perdía filas del mismo milisegundo. Hallazgo de la revisión final |
| Las cantidades se validan en milésimas: el ruido de punto flotante (1,0000000001) se redondea y un cuarto decimal o un valor diminuto se rechaza con 400. Las entradas también toman el candado, las transacciones de movimientos esperan hasta 15 s, el umbral reintenta una vez ante dos `PUT` simultáneos, quitar un umbral exige el acopio abierto y el `PATCH` de un EAN valida la categoría | Menores de la revisión final: varios terminaban en 500 o dejaban la bitácora sin cuadrar. Los dos `PUT` simultáneos y las 60 salidas simultáneas no fallaron en local antes del arreglo; sus pruebas quedan de guarda |
| Una entrada con un `id` repetido se busca justo después del control de alcance, antes de validar el acopio y la fecha, y compara la fecha de vencimiento tal como se guardó | Un reintento de la cola recibía 409 o 422 aunque el movimiento ya existiera (acopio cerrado entre los dos envíos, fecha al borde de los 7 días, o `venceEn` en una categoría no perecedera, que se descarta), y el Operador podía registrarlo dos veces. Hallazgo de la revisión final |

