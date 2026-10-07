---
title: "Bloque 4 · Motor · especificación"
type: spec
tags: [spec, bloque-4]
estado: vigente
bloque: 4
actualizado: 2026-10-07
---

# Bloque 4 · Motor · especificación

**Fecha:** 2026-10-06
**Estado:** aprobada por Joseph el 2026-10-06
**Deriva de:** [especificación general](2026-08-20-acopio-design.md) §7,
[RF-MOT](../../01-requerimientos/funcionales/motor.md),
[RF-CAT-006](../../01-requerimientos/funcionales/catalogo.md#rf-cat-006--configurar-pesos-del-motor),
[RF-RED-009](../../01-requerimientos/funcionales/red.md#rf-red-009--mapa-de-necesidades-por-zona),
[RF-CMP-007](../../01-requerimientos/funcionales/comprobantes.md#rf-cmp-007--trazabilidad-estimada-del-despacho),
[ADR-0002](../../02-arquitectura/adr/ADR-0002-saldo-derivado.md),
[ADR-0010](../../02-arquitectura/adr/ADR-0010-varias-emergencias-activas.md) y
[ADR-0015](../../02-arquitectura/adr/ADR-0015-saldo-en-tabla-por-disparador.md)
**Plan:** dos para la API (cálculo y sugerencias; remisiones y recepción) y uno por ciclo
de interfaz, escritos al empezar cada etapa

---

## 1. Objetivo

Que el sistema diga qué le falta a cada zona y qué le sobra a cada acopio, proponga
traslados con su razón escrita, y que un traslado aprobado llegue a la zona con evidencia
y se descuente del déficit. Además, una medición reproducible de que el motor reparte
mejor que dos alternativas ingenuas.

**El bloque termina cuando**, en el Compose local:

1. El Administrador abre la ficha de una zona del `seed:demo` y ve, por cada categoría
   con canasta: la necesidad (canasta × población × horizonte, con la fuente de la
   canasta y la de la población), lo recibido en los últimos 7 días, lo que va en
   camino, el déficit y la cobertura.
2. Pide un recálculo. C11 muestra sugerencias ordenadas por puntaje, cada una con su
   justificación en una frase y los cuatro componentes del puntaje. Al mover los pesos,
   la vista previa muestra el ranking nuevo antes de guardar.
3. Aprueba dos sugerencias del mismo acopio a la misma zona, una con la cantidad
   editada, y descarta una tercera con motivo. Queda una sola remisión en `BORRADOR` con
   dos líneas, y el par descartado no vuelve a aparecer en el siguiente recálculo.
4. El Operador del acopio de origen despacha esa remisión y vincula un folio conciliado.
   Se crean las `SALIDA` con motivo `TRASLADO`, el saldo baja, la remisión pasa a
   `EN_TRANSITO` y se imprime su documento con QR. En la ficha de la zona el déficit no
   cambia y la columna «en camino» sí.
5. Un Receptor asignado a esa zona la ve en su lista, sube una foto y toca «Recibido».
   Se crean las `RECEPCION` en la zona, la cobertura de la ficha sube y el seguimiento
   público del folio vinculado dice «recibido en destino».
6. El Operador crea un despacho general sin zona. Un Receptor de otra zona lo toma y lo
   confirma, y la remisión queda con la zona de ese Receptor.
7. El Receptor reporta «pañales» con una nota. El mapa público muestra la zona como un
   área con esa necesidad y su antigüedad. Cuando el Receptor la marca resuelta, deja de
   mostrarse.
8. `simular --semilla 42` produce dos veces el mismo informe, con la desviación de
   cobertura entre zonas y la proporción de insumo vencido para el motor, el reparto
   igualitario y el reparto por cercanía.

## 2. Alcance

| Entra | Requisito |
|---|---|
| Zona y ajuste de su población con fuente nueva | RF-MOT-001, RF-MOT-012 |
| Necesidad, con sobrescritura manual | RF-MOT-002 |
| Déficit y cobertura | RF-MOT-003 |
| Superávit y movible de un acopio | RF-MOT-004 |
| Sugerencias, recálculo y ranking con justificación | RF-MOT-005, RF-MOT-006 |
| Aprobar y descartar, con informe de descartes | RF-MOT-007 |
| Pesos configurables con vista previa | RF-CAT-006 |
| Remisiones con QR, zona fija o despacho general | RF-MOT-008 |
| Recepción en zona con foto | RF-MOT-009 |
| Reporte de necesidad del Receptor | RF-MOT-011 |
| Capa de zonas en el mapa público | RF-RED-009 |
| Vínculo folio-remisión y «recibido en destino» | RF-CMP-007 |
| Simulador contra reparto igualitario y por cercanía | RF-MOT-010 |

**No entra:**
- Conteo por categoría al recibir. La recepción usa la cantidad planeada (RF-MOT-009).
- Rutas reales. La distancia es en línea recta.
- Una pantalla para el simulador. Queda anotada en `pendientes.md`.
- Que el Receptor proponga la población de su zona («por afinar» en RF-MOT-012).
- Recepción en zona sin conexión.
- Estado automático de la zona (`SIN_ATENDER`, `EN_ATENCION`, `CUBIERTA`). Sigue manual
  desde C9 y queda anotado en `pendientes.md`.

## 3. Decisiones

Tomadas por Joseph el 2026-10-06.

| # | Decisión | Alternativa descartada y por qué |
|---|---|---|
| M-01 | La recepción en una zona es un `movimiento` de tipo `RECEPCION` con `zona_id` y sin `acopio_id`. Un `CHECK` exige exactamente uno de los dos y el disparador del saldo ignora las filas de zona. Va en un ADR nuevo, ADR-0018 | Una tabla `recepcion_zona` aparte: sería un segundo libro append-only. Sumar `linea_remision.cantidad_recibida`: en la zona no quedaría registro propio |
| M-02 | `recibido(z,c)` cuenta solo las `RECEPCION` con `ocurrido_en` dentro de los últimos `horizonte_dias` de la emergencia | Acumulado desde el inicio con la necesidad multiplicada por los días transcurridos: complica el cambio de población y deja de ser la fórmula de RF-MOT-002. Sin ventana: una zona bien atendida la primera semana queda cubierta para siempre |
| M-03 | Lo comprometido se resta de los dos lados. `deficit` descuenta las líneas de remisiones `BORRADOR` o `EN_TRANSITO` hacia la zona; `movible` descuenta las líneas en `BORRADOR` que salen del acopio. Un despacho general solo descuenta del acopio | Bloquear solo el par acopio-zona-categoría mientras haya una remisión abierta: otro acopio podría volver a cubrir el mismo déficit. No descontar nada: el ranking se llena de duplicados cada 15 minutos |
| M-04 | Cada recálculo borra las `PROPUESTA` y guarda la ronda nueva en la misma transacción. `APROBADA` y `DESCARTADA` se conservan. Al aprobar se valida contra el cálculo del momento. Un par descartado no se propone durante 24 horas. Empates: puntaje, después cantidad mayor, después nombre de la zona | Marcar las viejas como `REEMPLAZADA`: cientos de filas al día que nadie lee. Agregar sin tocar las viejas: quedan propuestas con números vencidos |
| M-05 | `dias_para_vencer` supone que sale primero lo que entró primero: se recorren las `ENTRADA` del acopio de la más nueva hacia atrás hasta cubrir el saldo, y vale el vencimiento más cercano entre ellas. Una categoría no perecedera tiene urgencia 0. Si lo más próximo ya venció, esa mercancía no se propone | El vencimiento más cercano de las entradas recientes sin cruzarlo con el saldo: cuenta mercancía que ya salió. Urgencia solo por la marca de perecedero: pierde qué está por vencer |
| M-06 | Emparejamiento voraz por puntaje: en cada categoría se puntúan todos los pares acopio-zona, se toma el mejor, se le asigna `min(movible, deficit)`, se actualizan los dos lados y se repite. Distancia en línea recta (haversine); `distancia_max` es la mayor entre los pares candidatos de la ronda. RF-MOT-005 se ajusta | El orden literal de RF-MOT-005 (zonas por criticidad, acopios por superávit): la proximidad no decide quién atiende a quién y el puntaje solo ordena la lista |
| M-07 | Al aprobar, la línea va a la remisión `BORRADOR` del mismo acopio a la misma zona, o crea una. El Operador o el Administrador también crean remisiones a mano, con zona o como despacho general. Cancelar en `EN_TRANSITO` crea un `AJUSTE` positivo por línea; las sugerencias de esa remisión siguen `APROBADA` | Una remisión por sugerencia: tres sugerencias al mismo destino serían tres QR y tres confirmaciones |
| M-08 | Las fórmulas y el emparejamiento son funciones puras en `packages/shared`. El simulador es un script con semilla que escribe un informe en la bóveda | Una pantalla de simulación en la consola: necesita diseño en Stitch y la reproducibilidad depende de quien la maneje. Queda para después |
| M-09 | El mapa público muestra solo lo que reporta el Receptor: un círculo de 3 km con el centro redondeado a dos decimales, y las necesidades de 7 días o menos con su antigüedad y su nota. Sin reportes recientes dice «Sin reportes recientes». El déficit calculado no se publica | Publicar también el semáforo de cobertura: es un número interno que depende de la población estimada y de la canasta, y sin la ficha se malinterpreta |
| M-10 | Tres ciclos de interfaz por rol: Administrador (C10, C11, pesos, C9), Operador (C12 y el documento con QR), Receptor y público (C13, C20, «Mi zona», capa en P05). C10 y C11 van primero a Stitch | Seguir el recorrido de la mercancía (C12 y C13 primero): deja para el final las pantallas que más cuesta diseñar y las que más pesan en la sustentación |
| M-11 | Cobertura global de una zona: el promedio de las coberturas por categoría, cada una topada en 1, y al lado la categoría con la cobertura más baja. RF-MOT-003 se ajusta | El «promedio ponderado por criticidad» de RF-MOT-003: ninguna categoría tiene un peso de criticidad, y litros y kilos no se suman |
| M-12 | Sin umbral en un acopio, esa categoría no tiene excedente. La ficha lo avisa | Tratar todo el saldo como movible: un acopio recién abierto parecería sobrado de todo |

## 4. Datos

### `movimiento` (módulo `inventario`)

- `acopio_id` pasa a ser opcional. Se agregan `zona_id uuid?` con llave foránea a `zona`
  y `remision_id uuid?` con llave foránea a `remision`.
- `tipo` gana `RECEPCION`.
- `CHECK ((acopio_id IS NULL) <> (zona_id IS NULL))`.
- `CHECK ((tipo = 'RECEPCION') = (zona_id IS NOT NULL))`.
- `CHECK (tipo <> 'RECEPCION' OR (remision_id IS NOT NULL AND signo = 1))`.
- El disparador `movimiento_actualiza_saldo` pasa a `WHEN (NEW.acopio_id IS NOT NULL)`.
- Índice `(zona_id, categoria_id, ocurrido_en)`.
- Las `SALIDA` de un despacho llevan `motivo_salida = 'TRASLADO'`, `remision_id` y la
  nota «Remisión R-…». El `AJUSTE` de una cancelación en tránsito lleva `remision_id` y
  el motivo «Cancelación de la remisión R-…».
- Las consultas de inventario siguen filtrando por acopio. Donde el tipo de Prisma pase a
  `string | null`, el código descarta el nulo con un filtro explícito.

### `remision` (módulo `motor`)

```
remision
  id · codigo text UNIQUE         R-2026-7KQ4M · sufijo aleatorio, mismo alfabeto que el folio
  acopio_origen_id fk
  zona_destino_id fk?             null = despacho general
  estado  BORRADOR | EN_TRANSITO | RECIBIDA | CANCELADA
  responsable text                quien conduce o lleva el envío
  qr_token text UNIQUE
  creada_por · creada_en
  despachada_por? · despachada_en?
  recibida_por? · recibida_en? · evidencia_keys text[] · nota_recepcion?
  cancelada_por? · cancelada_en? · motivo_cancelacion?
  CHECK (estado <> 'RECIBIDA' OR (zona_destino_id IS NOT NULL
         AND recibida_en IS NOT NULL AND cardinality(evidencia_keys) >= 1))
  CHECK (estado <> 'CANCELADA' OR char_length(motivo_cancelacion) >= 10)
```

`acopio_app` lee, inserta y actualiza, sin `DELETE` ni `TRUNCATE`. Respecto de
`modelo-datos.md`, se quita `remision.sugerencia_id`: una remisión agrupa varias
sugerencias, así que el vínculo va en `sugerencia.remision_id`.

Las fotos subidas antes de confirmar quedan en `evidencia_keys` mientras la remisión
está `EN_TRANSITO`; confirmar exige al menos una.

### `linea_remision`

```
linea_remision
  id · remision_id · categoria_id
  cantidad_planeada numeric(12,3) > 0 · cantidad_recibida numeric(12,3)?
  UNIQUE (remision_id, categoria_id)
```

Si se aprueba otra sugerencia de una categoría que ya tiene línea, la cantidad se suma a
esa línea. Se quita `motivo_diferencia` del modelo: sin conteo no hay diferencia por
línea, y lo que llega distinto va en `remision.nota_recepcion`. Un disparador permite
`UPDATE` y `DELETE` solo si la remisión está en `BORRADOR`, salvo el `UPDATE` de
`cantidad_recibida` en la confirmación.

### `remision_comprobante`

La del modelo: `remision_id`, `comprobante_id`, `vinculado_por`, `vinculado_en`, con PK
compuesta. Solo inserción. Un folio está «recibido en destino» cuando alguna de sus
remisiones está `RECIBIDA`; se deriva, sin estado nuevo en `comprobante`.

### `sugerencia`

```
sugerencia
  id · ronda timestamptz          generada_en común a la tanda
  emergencia_id · acopio_id · zona_id · categoria_id
  cantidad numeric · puntaje numeric
  desglose jsonb                  {criticidad, urgencia, proximidad, magnitud}
  justificacion text
  estado  PROPUESTA | APROBADA | DESCARTADA
  cantidad_aprobada? · remision_id fk?
  motivo_descarte? · decidida_por? · decidida_en?
  CHECK (estado <> 'DESCARTADA' OR char_length(motivo_descarte) >= 10)
  CHECK (estado <> 'APROBADA' OR remision_id IS NOT NULL)
  índice (acopio_id, zona_id, categoria_id, decidida_en)
```

Un disparador rechaza `DELETE` de una fila con `estado <> 'PROPUESTA'`. `acopio_app` lee,
inserta, actualiza y borra.

### `reporte_necesidad`

La del modelo: `id`, `zona_id`, `categoria_id`, `reportado_por`, `nota?`, `resuelta`,
`reportado_en`. Solo inserción y lectura. Índice `(zona_id, categoria_id, reportado_en)`.

### `necesidad_manual`

```
necesidad_manual
  id · zona_id · categoria_id
  cantidad numeric(12,3)?         null = vuelve al cálculo
  motivo text ≥ 10 · puesta_por · puesta_en
```

Solo inserción y lectura. Vale la fila más reciente de cada zona y categoría.

### `configuracion_motor`

La del modelo, una fila: `pesos jsonb` (criticidad 0,45, urgencia 0,25, proximidad 0,15,
magnitud 0,15) y `cantidad_minima` (5, en unidad base), con `actualizado_por` y
`actualizado_en`. La siembra `seed`.

Las 24 horas de bloqueo tras un descarte, los 7 días de vigencia de un reporte y el radio
de 3 km son constantes en `packages/shared`.

### `zona`

Sin columnas nuevas. Un cambio de `poblacion_estimada` exige `poblacion_fuente` y
`poblacion_fecha` nuevas (RF-MOT-012).

## 5. El cálculo

### En `packages/shared/src/motor/`

Funciones puras. La fecha de hoy entra como parámetro.

- `necesidad`, `recibido`, `deficit`, `cobertura` y `movible`, según RF-MOT-002 a 004
  con M-02 y M-03.
- `diasParaVencer(entradas, saldo, hoy)`, según M-05.
- `distanciaKm` (haversine) y `puntaje(componentes, pesos)`.
- `emparejar(estado, pesos, minimo)`, según M-06. Devuelve las sugerencias con su
  desglose.
- `justificar(sugerencia, contexto)`. Ejemplo: «Zona 7 tiene 12 % de cobertura en agua;
  Acopio Norte tiene 800 L sobre su máximo, a 41 km; lo más próximo vence en 4 días
  (estimado)».

### Reglas

- Zonas: las de emergencias `ACTIVA` o `EN_SEGUIMIENTO`.
- Acopios: `ACTIVO` y `PAUSADO`. Uno pausado no atiende al público, pero puede despachar.
- Necesidad de una categoría: la `necesidad_manual` vigente si existe; si no, la canasta
  vigente hoy. Sin ninguna de las dos, la categoría queda fuera del cálculo. El reporte
  del Receptor se ve en la ficha y el Administrador lo convierte en necesidad manual si
  quiere que el motor lo atienda.
- Sin umbral en el acopio, la categoría no tiene excedente (M-12).
- `criticidad = 1 − min(1, (recibido + en_camino) / necesidad)`.
- `urgencia = 1 / (1 + dias_para_vencer)` en perecederos con fecha; 0 en no perecederos.
- Población 0 o necesidad 0: la categoría no entra al cálculo.
- No se proponen cantidades menores que `cantidad_minima`.

### En la API: `MotorService`

- `recalcular()` toma un `pg_advisory_xact_lock` propio del motor, lee zonas, canasta,
  necesidades manuales, recepciones en la ventana, remisiones abiertas, saldos, umbrales,
  «no recibir» y entradas con vencimiento, quita los pares descartados en las últimas 24
  horas, llama a `emparejar`, y en una transacción borra las `PROPUESTA` y guarda la
  ronda. Corre con `@Cron` cada 15 minutos (no con `NODE_ENV=test`) y bajo demanda.
- `aprobar(id, cantidad)` recalcula ese par con datos frescos y exige
  `cantidad ≤ min(movible, deficit)`; si no se cumple, 409
  `SUGERENCIA_DESACTUALIZADA`. Luego agrega la línea a la remisión `BORRADOR` del par o
  crea una. Una transacción, con el candado de inventario del acopio y la categoría y con
  la bitácora.
- La vista previa de pesos corre `emparejar` con los pesos propuestos y no guarda nada.

## 6. API

### Motor (Administrador)

- `GET /zonas/:id/necesidad`: la ficha. Términos del cálculo, fuentes, recibido, en
  camino, déficit, cobertura por categoría y global, necesidades manuales y reportes
  vigentes. El Receptor asignado a la zona también la lee.
- `PUT /zonas/:id/necesidad-manual/:categoriaId` con `{ cantidad | null, motivo }`.
- `GET /sugerencias` con filtros por zona, acopio, categoría y estado.
- `POST /sugerencias/recalcular`.
- `POST /sugerencias/:id/aprobar` con `{ cantidad }`.
- `POST /sugerencias/:id/descartar` con `{ motivo }`.
- `GET /sugerencias/descartes`: motivos agregados por motivo, categoría y acopio.
- `GET /motor/configuracion`, `PUT /motor/configuracion` y
  `POST /motor/configuracion/vista-previa`. Los pesos deben sumar 1 con tolerancia de
  0,001.
- `GET /acopios/:id/excedentes`: superávit y movible por categoría con sus avisos. Lo
  leen el Administrador y el Operador del acopio.

### Remisiones (Operador del acopio de origen y Administrador)

- `POST /remisiones` con `{ acopioId, zonaId | null, responsable, lineas[] }`.
- `GET /remisiones` con filtros; `GET /remisiones/:codigo`.
- `PUT /remisiones/:codigo/lineas`: reemplaza las líneas, solo en `BORRADOR`. Cada línea
  se valida contra el movible del momento.
- `PATCH /remisiones/:codigo`: responsable o zona, solo en `BORRADOR`.
- `POST /remisiones/:codigo/despachar` con `{ folios[] }` opcional. Crea las `SALIDA`
  bajo el candado de inventario, recorriendo las líneas ordenadas por categoría. Solo
  acepta folios `CONCILIADO` del mismo acopio.
- `POST /remisiones/:codigo/cancelar` con `{ motivo }`.

### Receptor

- `GET /recepciones`: remisiones `EN_TRANSITO` hacia sus zonas y despachos generales.
- `GET /recepciones/qr/:token`.
- `POST /remisiones/:codigo/evidencia`: una foto multipart, procesada y guardada en
  Garage como la factura del Bloque 3.
- `POST /remisiones/:codigo/recibir` con `{ zonaId?, nota? }`. `zonaId` es obligatorio
  solo en un despacho general y debe ser una zona del Receptor. Exige al menos una foto,
  crea una `RECEPCION` por línea con `cantidad_recibida = cantidad_planeada` y deja la
  remisión `RECIBIDA`.
- `GET /remisiones/:codigo/evidencia/:n`: la API sirve la foto, como planea ADR-0017 para
  la factura. La ven el Administrador, el Auditor, el Operador del origen y el Receptor
  que recibió.
- `POST /zonas/:id/reportes` con `{ categorias[], nota?, resuelta }`;
  `GET /zonas/:id/reportes`.

### Público

- `GET /publico/zonas-necesidad`: zonas de emergencias `ACTIVA` o `EN_SEGUIMIENTO`, con centro redondeado,
  radio y necesidades vigentes de 7 días o menos, con antigüedad y nota. Sin población,
  déficit ni nombres.
- El seguimiento por folio gana «recibido en destino» y la lista de remisiones con el
  aviso «parte de tu donación» cuando hay más de una.

### Errores nuevos

| Código | Estado |
|---|---|
| `SUGERENCIA_DESACTUALIZADA` | 409 |
| `SUGERENCIA_DECIDIDA` | 409 |
| `REMISION_ESTADO_INVALIDO` | 409 |
| `LINEA_EXCEDE_MOVIBLE` | 422 |
| `SIN_EVIDENCIA` | 422 |
| `PESOS_NO_SUMAN_UNO` | 422 |
| `POBLACION_SIN_FUENTE_NUEVA` | 422 |
| `ZONA_NO_ASIGNADA` | 403 |

### Bitácora, correo y tareas

La bitácora registra aprobar, descartar, la necesidad manual, la configuración, crear,
editar, despachar, cancelar y recibir una remisión, y cada reporte de necesidad. El
recálculo no escribe en ella. No hay correos nuevos. La única tarea programada nueva es
el recálculo.

### Módulos

`motor` usa `inventario`, `catalogo`, `acopios`, `comprobantes` y `almacenamiento`, como
ya permite la tabla de `vista-general.md`. Solo `inventario` escribe en `movimiento`:
`MovimientosService` gana `registrarRecepcion`, y `motor` le pide también las `SALIDA`
del despacho y los `AJUSTE` de una cancelación.

## 7. Web

1. **Ciclo 1, Administrador.** C10 Ficha de zona (`/consola/zonas/:id`), C11 Motor
   (`/consola/motor`) con aprobar y descartar, los pesos con vista previa
   (`/consola/motor/pesos`), el informe de descartes y el ajuste de población en C9.
2. **Ciclo 2, Operador.** C12 Remisiones (`/consola/remisiones`): lista, borrador con
   líneas validadas contra el excedente, despacho con folios, cancelación y el documento
   imprimible con QR, generado en la web con CSS de impresión.
3. **Ciclo 3, Receptor y público.** C13 Recepción (`/consola/recepciones`) con el
   escáner de C04 y la foto obligatoria, C20 Reportar necesidad con el aviso de que la
   nota es pública, «Mi zona» como inicio del Receptor y la capa de zonas en P05.

C10 y C11 se diseñan en Stitch mientras se construye la API. Ninguna pantalla se escribe
sin su maqueta aprobada.

## 8. Orden de construcción

1. **API, etapa 1.** Migración de `movimiento` y de las tablas del motor, `shared/motor`
   con TDD, ficha de zona, sugerencias y configuración.
2. **API, etapa 2.** Remisiones, recepción, reportes, endpoint público y RF-CMP-007.
   Contrato y tipos de la web.
3. **Simulador** y su informe en la bóveda.
4. **Interfaz**, ciclos 1, 2 y 3, cada uno con su recorrido.

Cada etapa tiene su plan, escrito al empezarla.

## 9. Pruebas

| Qué | Cómo |
|---|---|
| Fórmulas | Unitarias en `shared`: necesidad 0, sin umbral, «no recibir», ventana del recibido, en camino, cobertura global |
| Vencimiento | Unitaria de `diasParaVencer`: saldo cubierto por varias entradas, lo más próximo ya vencido, no perecedero |
| Emparejamiento | Unitaria con un caso hecho a mano en que la proximidad cambia el reparto; empates; cantidad mínima |
| Justificación | Unitaria con un ejemplo por caso |
| Simulador | Unitaria: misma semilla, mismo resultado |
| Datos | Integración: los `CHECK` y disparadores nuevos (borrar una sugerencia decidida, editar líneas fuera de `BORRADOR`, `RECEPCION` sin remisión, saldo intacto con una recepción) |
| Inventario | `test:int` completo después de la migración |
| Motor | Integración: recálculo que reemplaza propuestas, bloqueo de 24 horas, aprobar agrupando en la misma remisión, `SUGERENCIA_DESACTUALIZADA`, dos aprobaciones simultáneas que no superan el movible |
| Remisiones | Integración: despacho con salidas y folios, cancelación en borrador y en tránsito, línea mayor que el movible |
| Recepción | Integración: sin foto, zona ajena, despacho general que toma la zona del Receptor, «recibido en destino» del folio |
| Público | Integración: centro redondeado, sin población ni déficit, reporte vencido, reporte resuelto |
| Rendimiento | Integración: recálculo con 50 zonas, 20 acopios y 40 categorías en menos de 5 s |
| Web | Vitest y axe por pantalla con `responderSegun` |
| Cierre | Un recorrido por ciclo en `apps/web/recorridos/` |

## 10. Criterios de salida

- [ ] El recorrido del §1 funciona en el Compose local
- [ ] Con la misma semilla, el informe del simulador sale igual dos veces
- [ ] El recálculo tarda menos de 5 s con 50 zonas y 40 categorías
- [ ] El mapa público no expone población, déficit ni coordenadas exactas de una zona
- [ ] axe sin violaciones graves en cada pantalla nueva a 360 × 640
- [ ] Pasan `lint`, `typecheck`, `depcruise`, `test`, `test:int` y
      `scripts/revisar-colores.sh`; el contrato y los tipos quedan al día, y el CI de
      `main` queda en verde

## 11. Riesgos

| Riesgo | Qué se hace |
|---|---|
| `acopio_id` opcional rompe consultas de inventario o comprobantes | La migración va primero y se corre `test:int` completo antes de seguir |
| `seed:demo` sin umbrales ni zonas con población: el motor no propone nada | `seed:demo` gana umbrales, zonas con población y un escenario que produce sugerencias |
| El bloque es más grande que el 3 | Orden de recorte: RF-CMP-007, la vista previa de pesos y la capa pública (DEBERÍA). El simulador no se recorta |
| Justificaciones que no se entienden | Pruebas de `justificar` con ejemplos, y Joseph las lee en la maqueta de C11 |
| Interbloqueos entre aprobar, despachar y el recálculo | El recálculo toma solo su candado propio y lee; aprobar y despachar toman los candados de inventario en orden de categoría |

## 12. Documentos que cambian

- RF-MOT-002 (necesidad manual en su tabla), RF-MOT-003 (ventana, en camino y cobertura
  global, M-02, M-03, M-11), RF-MOT-005 (voraz por puntaje y urgencia 0 en no
  perecederos, M-05, M-06), RF-MOT-008 (agrupación y cancelación, M-07) y RF-CMP-007.
- `modelo-datos.md`: `movimiento` con `zona_id` y `remision_id`, `remision` sin
  `sugerencia_id`, `linea_remision` sin `motivo_diferencia`, `sugerencia` con
  `remision_id`, y `necesidad_manual`.
- ADR-0018: los movimientos de zona en el mismo libro que los del acopio.
- `vista-general.md`: nace `motor`.
- Especificación general §7: urgencia, emparejamiento y ventana.
- `pendientes.md`: pantalla del simulador y estado automático de la zona.
- Issue #35.

## 13. Cambios al construir

**2026-10-06 · API, etapa 1.** Según el [plan](../../05-planes/2026-10-06-bloque-4-api-etapa-1.md).

| Qué | Por qué |
|---|---|
| `dias_para_vencer` usa `vencimientoEstimado` (V-02): sale primero lo que vence antes, no lo que entró primero como decía M-05. Lo vencido que sigue en el estante no cuenta como movible | C3 ya muestra los vencimientos con esa estimación; con otra, la urgencia del motor contradiría el inventario |
| `remision.responsable` es opcional en `BORRADOR` y obligatorio desde `EN_TRANSITO` (`remision_despachada_con_responsable`) | Al aprobar una sugerencia todavía no se sabe quién lleva el envío |
| Las llaves foráneas de `movimiento` hacia `acopio`, `zona` y `remision` son `RESTRICT` | Prisma propone `SET NULL` en una relación opcional, y eso chocaría con `movimiento_acopio_o_zona` |
| Un cambio de población exige fuente y una fecha distinta de la guardada; la fuente puede repetir el texto | La misma alcaldía puede actualizar su conteo. Lo que no puede pasar es un número nuevo con la estimación vieja |
| Cuando un solo par compite en una ronda, su proximidad es 0 | `distancia_max` es la mayor entre los candidatos, así que el más lejano siempre puntúa 0 en proximidad. Es lo que dice la fórmula de M-06; el orden entre pares no cambia |
| La justificación dice «Acopio Norte puede mandar 800 L sin bajar de su máximo» y usa como cobertura solo lo recibido, redondeado hacia abajo | La revisión final encontró que la frase mezclaba lo que va en camino con lo que llegó y mostraba el sobrante bruto, sin descontar lo vencido ni lo comprometido. Ahora coincide con la ficha de zona y con lo que de verdad se puede mover |
| Aprobar rechaza con 409 `ZONA_SOLO_LECTURA` una sugerencia hacia una emergencia cerrada después del recálculo; descartar toma el candado del motor y aprobar cambia el estado solo si sigue en `PROPUESTA` | Revisión final: sin eso, una sugerencia podía quedar aprobada y descartada a la vez, o un par recién descartado volver en el recálculo en curso |
