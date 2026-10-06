---
title: "Bloque 3 · Custodia · especificación"
type: spec
tags: [spec, bloque-3]
estado: vigente
bloque: 3
actualizado: 2026-10-05
---

# Bloque 3 · Custodia · especificación

**Fecha:** 2026-10-05
**Estado:** aprobada por Joseph el 2026-10-05
**Deriva de:** [especificación general](2026-08-20-acopio-design.md) §13,
[RF-CMP](../../01-requerimientos/funcionales/comprobantes.md),
[RF-IDE-013](../../01-requerimientos/funcionales/identidad.md#rf-ide-013--auto-registro-de-donador),
[ADR-0002](../../02-arquitectura/adr/ADR-0002-saldo-derivado.md),
[ADR-0007](../../02-arquitectura/adr/ADR-0007-donador-excepcion-rol.md),
[ADR-0012](../../02-arquitectura/adr/ADR-0012-almacenamiento-garage.md) y
[ADR-0014](../../02-arquitectura/adr/ADR-0014-sesion-en-cookie.md)
**Plan:** uno para la API y uno por ciclo de interfaz, escritos al empezar cada etapa

---

## 1. Objetivo

Que una donación preparada por un Donador llegue al inventario con su folio y que
alguien la concilie. La donación vale cuando un Auditor la concilió contra los
movimientos, y el Donador puede mostrar en público qué donó y dónde quedó.

**El bloque termina cuando**, en el Compose local:

1. Un Donador se registra con su correo, lo confirma desde el enlace que llega a
   Mailpit, prepara una donación de 3 líneas (una escaneada con contenido), adjunta la
   foto de una factura y recibe un folio con su QR.
2. Un Operador escanea ese QR en «Recibir por folio», confirma 2 líneas, ajusta la
   tercera y recibe. Se crean 3 `ENTRADA` en unidad base y el comprobante pasa a
   `PENDIENTE`.
3. El Auditor ve la donación marcada con diferencia en C8, compara lo declarado, lo
   confirmado y las entradas, y la concilia.
4. El seguimiento público del folio muestra «conciliado, en el acopio» con lo donado por
   categoría, sin el nombre del Donador ni la factura.
5. Otro folio se entrega sin red: el Operador registra la mercancía en C4 sin conexión
   y el Auditor vincula esas entradas al folio y lo concilia.
6. Un rechazo deja un correo al Donador en la cola, y la factura de un comprobante
   cerrado hace 12 meses ya no está en Garage.

## 2. Alcance

| Entra | Requisito |
|---|---|
| Registro, confirmación de correo e ingreso del Donador | RF-IDE-013 |
| Preparar donación con escaneo (P9) | RF-CMP-001B |
| Sugerir punto de entrega | RF-CMP-001D |
| Recibir una donación preparada | RF-CMP-001C |
| Foto de factura en almacenamiento privado | RF-CMP-002 |
| Bandeja de pendientes (C8) | RF-CMP-003 |
| Conciliar contra movimientos, incluido vincular entradas ya registradas | RF-CMP-004 |
| Rechazar y revertir un rechazo | RF-CMP-005 |
| Seguimiento público por folio (P10) | RF-CMP-006 |
| Historial del Donador (P13) | RF-CMP-008 |
| Política de privacidad con la retención de facturas (P12) | P-006 |

**No entra:**
- Trazabilidad del despacho (RF-CMP-007): depende de las remisiones del Bloque 4. Hasta
  entonces el seguimiento termina en «conciliado, en el acopio».
- La importación de acopios de RedAcopio (RF-RED-011).
- Evidencias de remisión: usarán el módulo `almacenamiento` de este bloque en el
  Bloque 4.

## 3. Decisiones

Tomadas por Joseph el 2026-10-05.

| # | Decisión | Alternativa descartada y por qué |
|---|---|---|
| C-01 | Una sola especificación para todo el bloque, con el registro del Donador y la foto de factura. Se construye en tres planes | Dejar la factura para después: la política de retención quedaría abierta otra vez. Partir en dos bloques: el registro del Donador no sirve sin la recepción, y la recepción no tiene qué recibir sin él |
| C-02 | La foto de una factura se guarda 12 meses desde que su comprobante se cierra (`CONCILIADO`, `RECHAZADO` o `CANCELADO`). Una tarea diaria la borra con su miniatura y lo registra en la bitácora. Resuelve P-006 | 6 meses: deja poco margen para un reclamo tardío. Sin plazo: la Ley 1581 pide una temporalidad declarada |
| C-03 | El Donador se registra por la API (`POST /auth/registro`) con el puerto `ProveedorIdentidad`, y confirma su correo con un enlace que llega por la cola de correo. RF-IDE-013 se ajusta | `signUp` de Supabase desde el navegador, como decía RF-IDE-013: la web vería el token, en contra de ADR-0014, y no funciona con el proveedor `local` |
| C-04 | El Donador entra por su propia pantalla (P13), con correo. C01 sigue siendo «Entrar a la consola», con nombre de usuario | Una sola pantalla que acepte usuario o correo: mezcla la consola con el portal y cambia una pantalla aprobada |
| C-05 | Una donación se une a sus `ENTRADA` con la tabla `comprobante_movimiento`, solo de inserción. Sirve para la recepción y para vincular entradas registradas sin red. `movimiento` no cambia | `movimiento.comprobante_id`: vincular entradas ya registradas exigiría `UPDATE` sobre `movimiento`, que ADR-0015 le niega a `acopio_app` |
| C-06 | El Auditor vincula entradas pero no crea movimientos. Si falta una entrada, la registra el Operador en C4 y después se vincula | Que el Auditor cree el movimiento faltante (RF-CMP-004): rompe V-04 y quita el segundo par de ojos |
| C-07 | En la recepción, cada línea se confirma con un toque o se ajusta con − / + y el teclado | El gesto de deslizar de RF-CMP-001C: no se descubre, no funciona con lector de pantalla y choca con el desplazamiento de la lista |
| C-08 | Una sola factura por comprobante, en columnas de `comprobante`. Se guarda como WebP sin EXIF, con miniatura, en el bucket privado de Garage; el navegador la ve con una URL firmada de 5 minutos | `archivos jsonb` del modelo: la regla de RF-CMP-001B es una foto, y la retención se consulta mejor por columna |
| C-09 | El registro responde siempre «Te enviamos un correo». Si el correo ya tiene cuenta, el mensaje que llega lo dice en vez de traer el enlace | Responder «correo en uso»: deja averiguar qué correos tienen cuenta |
| C-10 | 7 días de vigencia de una `PREPARADO`, 5 preparadas por Donador y 12 meses de retención son valores de `config/entorno`, con esos valores por defecto | Constantes en el código: RF-CMP-001B pide que sean configurables |

## 4. Datos

### `comprobante` (módulo `comprobantes`)

```
comprobante
  id
  folio text UNIQUE             ACO-2026-7KQ4M · 5 caracteres al azar, sin 0/O ni 1/I
  donador_id fk usuario         rol DONADOR
  acopio_id fk acopio           el elegido; cambia si se recibe en otro
  estado  PREPARADO | PENDIENTE | CONCILIADO | RECHAZADO | CANCELADO
  creado_en
  recibido_por fk? · recibido_en?
  verificado_por fk? · verificado_en?
  motivo_rechazo  DUPLICADO | NO_CUADRA_MOVIMIENTOS | DIFERENCIA_SIN_EXPLICAR | OTRO ?
  nota_rechazo text?
  cerrado_en?                   desde aquí corren los 12 meses de la factura
  factura_key? · miniatura_key? · factura_tipo? · factura_bytes? · factura_borrada_en?
  CHECK (estado <> 'RECHAZADO' OR motivo_rechazo IS NOT NULL)
  CHECK (motivo_rechazo <> 'OTRO' OR length(trim(coalesce(nota_rechazo, ''))) > 0)
```

El folio se genera en la API con `crypto`; si choca con uno existente se genera otro.

### `linea_comprobante`

```
linea_comprobante
  id · comprobante_id · categoria_id
  ean text?                     null si se buscó por nombre
  contenido_unitario numeric    copia de codigo_barras.contenido; 1 si no hay
  cantidad_declarada numeric    en presentaciones · la fija el Donador
  cantidad_confirmada numeric?  en presentaciones · la fija el Operador al recibir
  vence_en date?
  motivo_diferencia text?
  CHECK (cantidad_declarada > 0)
  CHECK (cantidad_confirmada IS NULL OR cantidad_confirmada >= 0)
```

La `ENTRADA` de una línea lleva `cantidad_confirmada × contenido_unitario`, en la unidad
base de la categoría. Una línea confirmada en cero no genera movimiento.

### `comprobante_movimiento`

```
comprobante_movimiento
  comprobante_id fk · movimiento_id fk UNIQUE
  origen  RECEPCION | AUDITOR
  vinculado_por fk usuario · vinculado_en
  PK (comprobante_id, movimiento_id)
```

`acopio_app` solo inserta y lee. Un movimiento pertenece como mucho a una donación.

### `verificacion_correo` (módulo `identidad`)

```
verificacion_correo
  id · usuario_id fk · token_hash · vence_en (48 h) · usado_en?
```

Mismo patrón que `invitacion`: el token viaja en el enlace y solo se guarda su hash.

### Reglas que se validan en la transacción

| Regla | Cómo |
|---|---|
| Solo se recibe un comprobante `PREPARADO` | `pg_advisory_xact_lock` por folio, y relectura del estado dentro de la transacción |
| `CONCILIADO` exige al menos un vínculo | Conteo dentro de la transacción de conciliar |
| Un vínculo del Auditor apunta a una `ENTRADA` sin donación, y todas las de un comprobante son del mismo acopio | Validación en la API, y `UNIQUE (movimiento_id)` como segunda barrera |
| Máximo de preparadas por Donador | `pg_advisory_xact_lock` por Donador al crear |

### Garage

Bucket privado `comprobantes` (ya lo crea `bun run almacenamiento:iniciar`). Claves
`facturas/<comprobante_id>/<uuid>.webp` y `facturas/<comprobante_id>/<uuid>-mini.webp`.
La base guarda claves, nunca URLs.

## 5. API

### Módulo `almacenamiento` (hoja del grafo)

- `guardarImagen(buffer)`: valida el tipo real por el contenido (JPEG, PNG, WebP o HEIC;
  si no, 415 `TIPO_NO_ADMITIDO`) y el tamaño (8 MB; si no, 413 `ARCHIVO_GRANDE`).
  Corrige la rotación, quita todos los metadatos y guarda un WebP de 2000 px como
  máximo y una miniatura de 320 px. Devuelve las dos claves.
- `urlFirmada(clave)`: válida 5 minutos.
- `borrar(clave)`.

Usa `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` y `sharp`. Las pruebas usan
un adaptador en memoria, como Nominatim.

### Identidad del Donador

| Método y ruta | Quién | Qué |
|---|---|---|
| `POST /auth/registro` | Público, 5 por minuto por IP | Correo, contraseña (reglas de RF-IDE-003) y nombre. Crea la identidad sin confirmar y la fila `usuario` con rol `DONADOR` y estado `ACTIVO`, y encola el correo. Responde siempre lo mismo (C-09) |
| `POST /auth/registro/confirmar` | Público | Token del enlace. Marca el correo como confirmado |
| `POST /auth/donador/sesion` | Público, 5 por minuto por IP | Correo y contraseña. Deja la cookie `acopio_sesion`. Sin confirmar: 403 `CORREO_SIN_CONFIRMAR` |

`POST /auth/sesion` sigue rechazando a un Donador: la consola es para los roles internos.

### Donador

| Método y ruta | Qué |
|---|---|
| `POST /donaciones/sugerencias` | Líneas en unidad base y ubicación opcional. Devuelve los acopios `ACTIVO` ordenados por líneas que aceptan completas, luego por horario abierto ahora y, si hay ubicación, por cercanía; cada uno con las líneas que tiene en «no recibir» |
| `POST /donaciones` | Acopio y líneas. Crea el comprobante `PREPARADO` con su folio. Con 5 preparadas: 409 `LIMITE_PREPARADAS` |
| `POST /donaciones/:folio/factura` | Multipart, solo para una `PREPARADO` propia. Una segunda foto reemplaza a la primera y borra la anterior de Garage |
| `GET /donaciones` | Su historial, con filtro por estado |
| `POST /donaciones/:folio/cancelar` | Solo una `PREPARADO` propia |

### Operador

| Método y ruta | Qué |
|---|---|
| `GET /comprobantes/:folio` | Lo declarado y el estado. Cualquier Operador puede leerlo: el folio pudo prepararse para otro acopio |
| `POST /comprobantes/:folio/recepcion` | Acopio del Operador y, por línea, la cantidad confirmada, el vencimiento y el motivo de diferencia. En una transacción crea las `ENTRADA`, los vínculos con origen `RECEPCION`, pasa el comprobante a `PENDIENTE` y, si el folio era de otro acopio, lo reasigna. La respuesta trae las líneas que este acopio tiene en «no recibir» |

### Auditor y Administrador

El Auditor ve los acopios que tiene asignados; el Administrador, todos.

| Método y ruta | Qué |
|---|---|
| `GET /comprobantes` | Bandeja: filtros de estado (por defecto `PENDIENTE`), acopio y fechas; lo más viejo primero; marca de diferencia; contador por acopio |
| `GET /comprobantes/:folio/conciliacion` | Lo declarado, lo confirmado, las entradas vinculadas y la suma por categoría en unidad base |
| `GET /comprobantes/:folio/factura` | URL firmada. También para el Donador dueño |
| `GET /comprobantes/:folio/entradas-vinculables?acopioId=` | `ENTRADA` sin donación de los últimos 14 días, del acopio del comprobante o del que se indique (un folio pudo entregarse en otro) |
| `POST /comprobantes/:folio/vinculos` | Vincula esas entradas, con origen `AUDITOR`. Sirve para un folio todavía `PREPARADO` que se entregó sin red: al vincular pasa a `PENDIENTE`. Si las entradas son de otro acopio, el comprobante se reasigna a ese acopio y queda en la bitácora, como en la recepción |
| `POST /comprobantes/:folio/conciliar` | `PENDIENTE` → `CONCILIADO`. Sin vínculos: 422 `SIN_VINCULOS` |
| `POST /comprobantes/:folio/rechazar` | Motivo y nota. `PENDIENTE` → `RECHAZADO`; encola el correo al Donador con el motivo. Las `ENTRADA` no se tocan |
| `POST /comprobantes/:folio/revertir-rechazo` | `RECHAZADO` → `PENDIENTE` |

### Público

`GET /seguimiento/:folio`, 10 consultas por minuto por IP. Devuelve el estado, la línea
de tiempo (preparada, recibida en el acopio con su nombre, conciliada) y la categoría y
cantidad confirmada de cada línea. Un `RECHAZADO` se muestra como «No se pudo
conciliar», sin el motivo; un `CANCELADO`, como «Cancelada». Nunca incluye el nombre ni
el correo del Donador, ni la factura. Un folio inexistente recibe el mismo 404 que uno
mal escrito.

### Errores

| Código | Cuándo |
|---|---|
| 409 `LIMITE_PREPARADAS` | Ya hay 5 donaciones preparadas |
| 409 `ESTADO_INVALIDO` | El comprobante no está en el estado que la acción pide; `detalles` trae el estado actual |
| 422 `SIN_VINCULOS` | Conciliar sin entradas vinculadas |
| 422 `VENCIMIENTO_REQUERIDO` | Una línea perecedera confirmada sin fecha |
| 422 `MOVIMIENTO_NO_VINCULABLE` | No es una `ENTRADA`, ya tiene donación, o las entradas son de acopios distintos |
| 415 `TIPO_NO_ADMITIDO` · 413 `ARCHIVO_GRANDE` | Factura |
| 403 `CORREO_SIN_CONFIRMAR` | Ingreso del Donador antes de confirmar |

### Bitácora y correo

Cada servicio escribe la bitácora en la misma transacción: preparada, cancelada (a mano
o por vencimiento), recibida (destacada si cambió de acopio), vinculada, conciliada,
rechazada, rechazo revertido y factura borrada. Los correos (confirmación de registro y
rechazo) van por `NotificacionService.encolar`.

### Tareas programadas

- Diaria: las `PREPARADO` con más de 7 días pasan a `CANCELADO`, con `cerrado_en`.
- Diaria: las facturas de comprobantes cerrados hace 12 meses se borran de Garage y se
  marca `factura_borrada_en`.

## 6. Web

Cada pantalla se pide a Stitch y se aprueba en una maqueta antes de escribir código.

### Portal del Donador

Se llega desde «Más», sección «Tu donación», cuyas filas hoy llevan a «Próximamente».

| Pantalla | Qué hace |
|---|---|
| P13 Mi cuenta de Donador (`/donador`) | Sin sesión: «Crear cuenta» (nombre, correo, contraseña de 12 caracteres) y «Entrar» con correo. Con sesión: historial con estado y antigüedad, filtro por estado, enlace al seguimiento de cada una y «Cancelar» en las preparadas |
| Confirmar correo (`/donador/confirmar/:token`) | Activa la cuenta y ofrece entrar |
| P9 Preparar mi donación (`/donar`) | Lista con el buscador y el escáner de C4: escanear el mismo producto suma a su línea, un código con contenido cuenta presentaciones, un código desconocido se busca por nombre sin aprenderse, vencimiento opcional. Luego la sugerencia de dónde entregar, la foto de factura opcional con el aviso de los 12 meses, y el folio grande con su QR. Con 5 preparadas lo explica antes de empezar |
| P10 Seguir mi donación (`/seguimiento/:folio`) | Pública. Línea de tiempo y lo donado por categoría. La consulta de folio de la Portada lleva aquí |
| P12 Privacidad (`/privacidad`) | Finalidad de las facturas y el plazo de 12 meses (Ley 1581). Se enlaza desde el registro y desde la foto de factura |

El QR se genera en la web con la librería `qrcode`, en SVG.

### Consola

| Pantalla | Qué hace |
|---|---|
| Recibir por folio (`/consola/acopios/:id/recibir`) | Se abre desde la tarjeta de C4. Buscar el folio o escanear su QR (`@zxing` ya lee QR). Lo declarado por línea: confirmar con un toque o ajustar con − / + y el teclado (C-07); en cero, «no llegó». Pide el vencimiento de las perecederas que no lo traen. Avisa si el folio era de otro acopio y qué no recibe este. Solo el Operador. Sin red muestra `NecesitaRed` con la indicación de registrar en C4 |
| C8 Bandeja de comprobantes (`/consola/comprobantes`) | Auditor y Administrador, desde «Más». Pendientes de la más vieja a la más nueva, marca de diferencia, contador por acopio |
| Conciliación (`/consola/comprobantes/:folio`) | Lo declarado, lo confirmado y las entradas vinculadas, con la suma por categoría; la factura a un toque. «Vincular entradas», «Conciliar», «Rechazar» con motivo y nota, y «Revertir rechazo» |

### Sesión en la web

`ClienteAuth` suma `registrarDonador`, `confirmarCorreo` e `iniciarSesionDonador`. El
Donador usa la misma cookie y el mismo `SesionProveedor`; la cabecera con sesión le
muestra su nombre y no tiene selector de ubicación. Nada de esto funciona sin red.

## 7. Orden de construcción

1. **API.** Identidad del Donador; módulo `almacenamiento`; esquema y migración de
   comprobantes; preparar, cancelar y sugerencias; recepción; bandeja, conciliación,
   vínculos y rechazo; seguimiento; tareas programadas; contrato y tipos de la web.
2. **Interfaz, ciclo 1: el Donador.** P13, confirmación, P9, P10 y P12.
3. **Interfaz, ciclo 2: la consola.** Recibir por folio y C8 con la conciliación.

Cada etapa tiene su plan, escrito al empezarla.

## 8. Pruebas

| Qué | Cómo |
|---|---|
| Folio | Unitaria: formato, alfabeto sin ambiguos y reintento cuando choca |
| Sugerencias | Unitaria: orden por cobertura, horario y distancia; sin ubicación |
| Imagen | Unitaria con imágenes de prueba: EXIF y GPS borrados, tipo real (un PDF renombrado a `.jpg` se rechaza), tamaños |
| Donador | Integración: registro, confirmación, ingreso; correo sin confirmar; correo de una cuenta interna; respuesta igual en todos los casos |
| Preparar | Integración: límite de 5, cancelar, vencimiento a los 7 días por la tarea |
| Recepción | Integración: entradas en unidad base y vínculos en una transacción; nada queda a medias si falla; dos Operadores a la vez sobre el mismo folio (uno recibe 409); reasignación de acopio en la bitácora; perecedera sin fecha |
| Conciliación | Integración: conciliar sin vínculos; vincular entradas de otro acopio o ya vinculadas; rechazo con correo en la cola; revertir |
| Permisos | Integración: Auditor fuera de su asignación, Donador sobre una donación ajena, Operador que concilia |
| Seguimiento | Integración: no expone nombre, correo ni factura; 404 igual para inexistente; límite por IP |
| Retención | Integración: la tarea borra en el adaptador de almacenamiento las facturas de comprobantes cerrados hace 12 meses y deja las demás |
| Web | Vitest y axe por pantalla con `responderSegun` |
| Cierre | Recorrido versionado en `apps/web/recorridos/` con el §1 de punta a punta |

## 9. Criterios de salida

- [ ] El recorrido del §1 funciona en el Compose local
- [ ] Recibir un folio crea las entradas y los vínculos sin dejar nada a medias, y dos
      recepciones simultáneas del mismo folio no duplican entradas
- [ ] El seguimiento público no expone datos del Donador ni la factura
- [ ] La factura se guarda sin EXIF y solo se ve con una URL firmada
- [ ] axe sin violaciones graves en cada pantalla nueva a 360 × 640
- [ ] Pasan `lint`, `typecheck`, `depcruise`, `test`, `test:int` y
      `scripts/revisar-colores.sh`; el contrato y los tipos quedan al día; la imagen
      Docker de la API se construye con `sharp`, y el CI de `main` queda en verde

## 10. Riesgos

| Riesgo | Qué se hace |
|---|---|
| `sharp` en la imagen Docker de la API (Alpine) | Se prueba el `docker build` al sumar la dependencia, en la primera tarea que lo usa |
| Fotos HEIC de iPhone | Se prueban con una imagen real; si `sharp` no las lee, el campo pide JPEG o PNG y se anota en «Cambios al construir» |
| La sugerencia de entrega es la parte con más lógica | Es DEBERÍA: si el tiempo aprieta, P9 ofrece solo el mapa |
| Folios adivinables | Sufijo de 5 caracteres al azar (31⁵ ≈ 28 millones por año) y límite de 10 consultas por minuto por IP |
| Una donación entregada sin red que nadie vincula | Sigue `PREPARADO` y vence a los 7 días; el Auditor la busca por folio desde C8 antes de que venza |

## 11. Documentos que cambian

- `modelo-datos.md`: `comprobante` con las columnas de factura, `comprobante_movimiento`
  en lugar de `movimiento.comprobante_id`, y `verificacion_correo`.
- RF-IDE-013: registro por la API y confirmación por la cola de correo (C-03, C-09).
- RF-CMP-001C: − / + en lugar del gesto de deslizar (C-07).
- RF-CMP-004: el Auditor vincula y no crea movimientos (C-06).
- RF-CMP-002: una sola factura por comprobante y su retención (C-02, C-08).
- `pendientes.md`: P-006 resuelto (C-02).
- `vista-general.md`: nacen `comprobantes` y `almacenamiento`; `apps/api/.dependency-cruiser.cjs` se ajusta igual.
- Catálogo de pantallas: «Recibir por folio» vive en la consola, junto a C4.

## 12. Cambios al construir

**2026-10-05 · API.** Construida según el [plan](../../05-planes/2026-10-05-bloque-3-api.md).

| Qué | Por qué |
|---|---|
| El sufijo del folio usa un alfabeto de 32 caracteres (32⁵ ≈ 33,5 millones por año), no 31⁵ como dice el §10 | El alfabeto sin I, O, 0 ni 1 queda en 32 símbolos. El `CHECK` del folio lo refleja |
| El guard comprueba al Donador antes que los roles: un único 403 «Esta sección es de la consola» | Así el Donador recibe el mismo mensaje en cualquier ruta de la consola, sin depender de qué roles admita |
| El ingreso del Donador da 403 `CORREO_SIN_CONFIRMAR` solo si la contraseña es correcta; con una mala, 401 genérico | Si el 403 saliera siempre, cualquiera sabría qué correos están registrados |
| Si falla la transacción del registro, se borra la credencial con `ProveedorIdentidad.eliminarUsuario`; un registro duplicado en carrera responde el mismo 202 | Sin eso quedaba una credencial sin usuario, y la carrera dejaba ver un error distinto |
| Una imagen que no se puede decodificar (truncada, HEIC sin soporte) da 415 `TIPO_NO_ADMITIDO` | `sharp` lanza un error propio y daba 500 |
| Cancelar, recibir, vincular, conciliar, rechazar y subir factura cambian el estado con `updateMany` condicionado al estado leído | Dos peticiones a la vez no pisan una transición ya hecha. La recepción no usa advisory lock de folio y recorre las líneas ordenadas por categoría, para tomar los candados de inventario siempre en el mismo orden y evitar interbloqueos |
| Vincular exige alcance sobre el acopio del comprobante y sobre el de las entradas | Un Auditor con alcance sobre un solo acopio no debe poder tocar entradas de otro |
| El seguimiento público oculta las líneas confirmadas en 0 | Una línea que no llegó no se muestra como parte de la donación |
| Con un EAN conocido la cantidad debe ser entera (422 `CANTIDAD_ENTERA`) | La cantidad cuenta presentaciones, y 2,5 botellas no existen |
| `exportar-openapi.ts` ahora pone valores de relleno para las variables `S3_*` | Sin ellas el script no arrancaba, porque el entorno exige el almacenamiento |
| El recorrido con curl pasó con Garage real: registro, confirmación por Mailpit, factura, WebP sin `Artist` ni GPS en la foto y la miniatura, recepción, conciliación, seguimiento sin correo y vínculo de `ACO-2026-DEMA4` | Las pruebas usan `AlmacenMemoria`; esto comprueba el adaptador S3 |
| Las URL firmadas llevan el host interno de Garage (`storage:3900`); el recorrido las bajó con `curl --connect-to` | Un navegador no las abre. Queda en [P-041](../../01-requerimientos/pendientes.md) |
| Los HEIC no se probaron con una imagen real de iPhone | Se decodifican o dan 415; la prueba con un teléfono queda para la interfaz |
| Queda abierto que alguien registre el correo de otra persona con su propia contraseña | [P-040](../../01-requerimientos/pendientes.md) |
