---
title: "Bloque 3 · interfaz, ciclo 2: la consola · plan"
type: plan
tags: [plan, bloque-3, web, consola, custodia]
estado: aprobado
bloque: 3
actualizado: 2026-10-06
---

# Bloque 3 · interfaz, ciclo 2: la consola · plan de implementación

> **Para agentes:** se ejecuta con superpowers:subagent-driven-development, una tarea por
> subagente y una revisión por tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:** la parte de la consola del Bloque 3. El Operador recibe una donación por su
folio y confirma lo que llegó. El Auditor y el Administrador revisan los comprobantes
pendientes en C8 y los concilian, los rechazan con un motivo o les vinculan entradas
registradas sin folio.

**Arquitectura:** tres pantallas nuevas en `apps/web/src/consola/comprobantes/`, cargadas al
abrirlas como el resto de la consola. Un módulo de cliente, `api/comprobantes.ts`, envuelve
los endpoints con TanStack Query. La API ya está; la única tarea de API agrega quién registró
cada entrada, que la maqueta muestra y la conciliación no devolvía.

**Stack:** React 19, React Router, TanStack Query 5, Tailwind 4 con `packages/ui-tokens`,
Vitest con `responderSegun`, `@zxing/browser` (ya lee QR), NestJS 11 y Prisma 7.10 en la
tarea 1.

**Especificación:** [2026-10-05-bloque-3-custodia-design.md](../superpowers/specs/2026-10-05-bloque-3-custodia-design.md), §5 «Operador» y «Auditor y Administrador», §6 «Consola» y §9.
**Diseños aprobados:** [maqueta del ciclo 2](../03-diseno/stitch/C08-comprobantes/maqueta.html)
y las notas de [recibir por folio](../03-diseno/stitch/C04-recibir-folio/README.md),
[C8](../03-diseno/stitch/C08-comprobantes/README.md) y
[conciliación](../03-diseno/stitch/C08-conciliacion/README.md).

## Estado

| Tarea | Estado | Qué falta |
|---|---|---|
| 1 API: quién registró cada entrada | ✅ `3b24606` | |
| 2 Cliente de la API de comprobantes | ✅ `624fa67` | |
| 3 Rutas, «Más» y la tarjeta de C4 | ✅ `c326dba` | |
| 4 Recibir por folio | ✅ `bf78016` | |
| 5 C8 Comprobantes | ✅ `0878f6f` | |
| 6 Conciliación: ver, conciliar, rechazar y revertir | ✅ `3bfd982` | |
| 7 Vincular entradas | ✅ `d6fbdbe` | |
| 8 Recorrido y cierre del Bloque 3 | ✅ cierre del ciclo | |

## Restricciones globales

- La maqueta aprobada manda en la estética, con sus diferencias. Sin colores hexadecimales en
  `apps/web` (los tokens salen de `packages/ui-tokens`; `scripts/revisar-colores.sh` lo revisa).
  Verde, ámbar, rojo y morado del semáforo no se usan para diferencias ni estados de
  comprobante: van en neutro con ícono y texto (ADR-0006). El rojo de error solo en el botón
  que confirma el rechazo y en los mensajes de error.
- Textos en español, sin flechas al final de los botones ni rótulos en mayúsculas.
- Los tipos del cliente salen de `src/api/esquema.d.ts`; no se escriben a mano. Si cambia un
  endpoint: `bun run --filter @acopio/api openapi`, luego `bun run --filter @acopio/web api:tipos`,
  y se versionan los dos.
- P-031: el esquema genera `motivoRechazo` y `notaRechazo` de `ComprobanteDto` como arreglos,
  pero la API manda `string | null`. Se leen con un único ayudante en `api/comprobantes.ts`
  (`motivoDe(c)`, `notaDe(c)`) y en ningún otro lado.
- Las cantidades de las líneas están en presentaciones: la cantidad en unidad base es
  `cantidad × contenidoUnitario`. Con `contenidoUnitario` distinto de 1 el control − / + cuenta
  presentaciones enteras y muestra la unidad base debajo, como en P9.
- Pruebas con `envolver(ui, ruta, cliente)` y `responderSegun` de `src/pruebas/`. Cada pantalla
  nueva tiene su prueba de axe sin violaciones graves.
- Ícono nuevo de Material Symbols → `node scripts/iconos.mjs` en `apps/web`.
- Ninguna pantalla de este ciclo funciona sin red: `NecesitaRed` con su texto.
- Roles: recibir, solo `OPERADOR`; C8, conciliación y vincular, `ADMIN` y `AUDITOR`.
- Commits en español con el área al inicio (`web: …`, `API: …`), directo a `main`, con las
  verificaciones encadenadas con `&&`: `bun run lint`, `bun run typecheck`, `bun run test`
  y `scripts/revisar-colores.sh`; la tarea 1 suma `depcruise` y `test:int` con
  `PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439`.

## Foco de revisión

1. El folio escrito en minúsculas, con espacios o leído del QR llega igual a la API (que lo
   normaliza); un folio que no existe muestra «No encontramos ese folio» y deja escribir otro
   (tarea 4).
2. Un folio que ya no está `PREPARADO` (recibido, conciliado, cancelado) muestra el estado y
   no el formulario. Si otro Operador lo recibe mientras este confirma, el 409
   `ESTADO_INVALIDO` se explica y la pantalla vuelve a cargar el folio (tarea 4).
3. Una línea con presentaciones (por ejemplo 12 × 0,5 L) cuenta presentaciones enteras y
   muestra «= 6 L»; lo que se manda a la API es la cantidad en presentaciones (tarea 4).
4. El Auditor abre por enlace la conciliación de un acopio que no tiene asignado: el 403 se
   explica («No tienes asignado este acopio»), sin pantalla genérica de error (tarea 6).
5. «Conciliar» sin entradas vinculadas: el 422 `SIN_VINCULOS` se explica junto al botón y
   ofrece «Vincular entradas» (tarea 6).

---

### Tarea 1: API, quién registró cada entrada

**Archivos:**
- Modificar: `apps/api/src/modulos/comprobantes/conciliacion.service.ts` (`detalle` y
  `vinculables`), `apps/api/src/comun/respuestas.ts` (`ConciliacionDto`,
  `EntradaVinculableDto`), la prueba de integración de conciliación en
  `apps/api/src/pruebas-integracion/`, `docs/03-diseno/api/openapi.json`,
  `apps/web/src/api/esquema.d.ts`

**Qué hace:**
- Cada elemento de `entradas` en `GET /comprobantes/:folio/conciliacion` suma
  `categoria: string`, `unidad: string` y `registradoPor: string` (el `nombre` del usuario del
  movimiento).
- Cada `EntradaVinculableDto` suma `registradoPor: string`.
- Nada más cambia: ni permisos ni orden.

- [ ] Prueba de integración primero: tras una recepción, la conciliación trae en cada entrada
  la categoría, la unidad y el nombre del Operador que recibió; las vinculables traen el nombre
  de quien registró la entrada. Verla fallar.
- [ ] Implementar con `include: { usuario: { select: { nombre: true } } }`.
- [ ] Regenerar el contrato y los tipos de la web.
- [ ] Commit `API: la conciliación dice quién registró cada entrada`.

### Tarea 2: cliente de la API de comprobantes

**Archivos:**
- Crear: `apps/web/src/api/comprobantes.ts`, `apps/web/src/api/comprobantes.test.tsx`

**Interfaces que produce**, con los tipos del esquema:
- `Comprobante = S['ComprobanteDto']`, `Conciliacion = S['ConciliacionDto']`,
  `Bandeja = S['BandejaRespuestaDto']`, `EntradaVinculable = S['EntradaVinculableDto']`,
  `MotivoRechazo = S['RechazarDto']['motivo']`.
- `useComprobante(folio: string | null)` → `GET /api/comprobantes/{folio}`; sin folio no
  consulta; 404 da `null` sin reintentos.
- `useRecibir(folio: string)` → `POST /api/comprobantes/{folio}/recepcion`, devuelve
  `S['RecepcionDto']`; invalida `['comprobante', folio]`, `['bandeja']` y los saldos del acopio
  (la misma clave que invalida `useRegistrarEntrada` en `api/inventario.ts`).
- `useBandeja(filtro: { estado: 'PENDIENTE' | 'CONCILIADO' | 'RECHAZADO'; acopioId?: string })`
  → `GET /api/comprobantes`.
- `useConciliacion(folio: string)` → `GET /api/comprobantes/{folio}/conciliacion`.
- `useEntradasVinculables(folio: string, acopioId: string | undefined, activo: boolean)` →
  `GET /api/comprobantes/{folio}/entradas-vinculables`.
- `useVincular(folio)`, `useConciliar(folio)`, `useRechazar(folio)` (cuerpo
  `{ motivo, nota? }`) y `useRevertirRechazo(folio)`: cada uno invalida
  `['conciliacion', folio]` y `['bandeja']`.
- `MOTIVOS_RECHAZO: Record<MotivoRechazo, string>`: Duplicado, No cuadra con los movimientos,
  Diferencia sin explicar, Otro.
- `motivoDe(c)` y `notaDe(c)`: leen `motivoRechazo` y `notaRechazo` como `string | null`
  (P-031).
- `enBase(cantidad: number, contenidoUnitario: number): number`, redondeado como
  `@acopio/shared`.

- [ ] Pruebas primero con `responderSegun`: cada hook llama a su ruta con el cuerpo esperado;
  `useComprobante` da `null` con 404 y no reintenta; las mutaciones invalidan sus claves;
  `motivoDe` lee el texto de una respuesta real.
- [ ] Implementar siguiendo el estilo de `api/donaciones.ts`.
- [ ] Commit `web: cliente de la API de comprobantes`.

### Tarea 3: rutas, «Más» y la tarjeta de C4

**Archivos:**
- Modificar: `apps/web/src/rutas.tsx`, `rutas.test.tsx`, `apps/web/src/portal/Mas.tsx`,
  `Mas.test.tsx`, `apps/web/src/consola/inventario/EntradaRapida.tsx`,
  `EntradaRapida.test.tsx`
- Crear: componentes vacíos con su título, para que las rutas carguen:
  `consola/comprobantes/RecibirFolio.tsx`, `consola/comprobantes/Comprobantes.tsx`,
  `consola/comprobantes/Conciliacion.tsx`

**Qué hace:**
- Rutas con `lazy`, dentro de `MarcoPortal`:
  - `/consola/acopios/:id/recibir` → `RecibirFolio`, con `RequiereRol roles={['OPERADOR']}`;
  - `/consola/comprobantes` y `/consola/comprobantes/:folio`, con `['ADMIN', 'AUDITOR']`.
- «Más»: herramienta «Comprobantes» (`receipt_long`, «Revisar y conciliar donaciones»),
  roles `ADMIN` y `AUDITOR`, después de «Bitácora».
- C4: la tarjeta «Recibir por folio» deja de ser un aviso punteado y pasa a ser un enlace a
  `/consola/acopios/:id/recibir`, con «Escanea o escribe el folio» en lugar de «Llega con los
  comprobantes». Sin red se mantiene, porque la pantalla de destino muestra `NecesitaRed`.

- [ ] Pruebas: cada ruta carga su pantalla con su rol y rechaza los otros; «Más» muestra
  «Comprobantes» a `ADMIN` y `AUDITOR` y no a `OPERADOR`; la tarjeta de C4 es un enlace a la
  ruta de recibir (se actualiza la prueba que esperaba «Llega con los comprobantes»).
- [ ] Commit `web: rutas de comprobantes, «Más» y la tarjeta de C4`.

### Tarea 4: recibir por folio

**Archivos:** `apps/web/src/consola/comprobantes/RecibirFolio.tsx`,
`consola/comprobantes/recepcion.ts` (el estado de las líneas en un reducer, sin React) y sus
pruebas.

**Qué hace** (vistas «buscar», «confirmar» y «hecho» de la maqueta):
- Sin red: `NecesitaRed` con el título «Recibir por folio necesita conexión» y el texto
  «Registra lo que llegó en Entrada rápida; un auditor lo vincula al folio después».
- Buscar: campo «Folio» y «Escanear QR» (`VistaCamara` de `consola/inventario/Escaner.tsx`; el
  QR del Donador contiene el folio). Al enviar, `useComprobante(folio)`. `null` → «No
  encontramos ese folio» junto al campo (foco 1).
- Si el comprobante no está `PREPARADO`: tarjeta con el folio, su estado
  (`ESTADOS_DONACION` de `api/donaciones.ts`) y «Buscar otro folio», sin formulario (foco 2).
- Confirmar:
  - Tarjeta con el folio, «Preparada» y la antigüedad (`hace N días`, con el formato que ya usa
    la consola).
  - Si `comprobante.acopio.id` es distinto del acopio de la ruta: aviso neutro «Este folio era
    para {nombre}. Al recibirlo aquí queda en este acopio.»
  - Cada línea parte con lo declarado. Muestra «Declaró {cantidad en base}», el control − / +
    (`TecladoCantidad` como en C4; con presentaciones, enteros), y debajo la cantidad en base
    si `contenidoUnitario` ≠ 1 (foco 3). Si llega menos de lo declarado, el campo opcional
    «¿Qué pasó con la diferencia?» (hasta 280 caracteres). En cero: «No llegó», sin campo de
    vencimiento.
  - Perecedera sin `venceEn` y con cantidad > 0: campo «Vence» obligatorio, con la ayuda «No
    trae fecha de vencimiento y es perecedera».
  - `useNoRecibir(acopioId)` de `api/red.ts`: por cada línea con cantidad > 0 cuya categoría
    está en «no recibir», el aviso neutro «Este acopio no está recibiendo {categoría}. Puedes
    recibirla igual.»
  - Botón «Registrar recepción ({n} entradas)», con n = líneas con cantidad > 0; desactivado
    mientras falte un vencimiento obligatorio. Con n = 0 dice «Registrar que no llegó nada».
- Al registrar, `useRecibir` con `acopioId` de la ruta y todas las líneas. Errores:
  409 `ESTADO_INVALIDO` → el mensaje de la API, «Volver a cargar» y recarga el comprobante
  (foco 2); 422 `VENCIMIENTO_REQUERIDO` → el mensaje junto a la línea.
- Hecho: «Recibido», «{folio} · {n} entradas en {acopio}», la tabla de lo que entró, «Un
  auditor revisa el comprobante y lo concilia», «Recibir otro folio» (vuelve a buscar) y
  «Volver a Entrada rápida».
- El foco va al título de cada vista al cambiar.

- [ ] Pruebas del reducer: partir de lo declarado, sumar y restar con piso 0, enteros con
  presentaciones, base calculada, vencimiento obligatorio, conteo de entradas.
- [ ] Pruebas de la pantalla: sin red; folio inexistente; folio ya recibido; folio de otro
  acopio; «no recibir»; escaneo (simulando `VistaCamara` como en `Escaner.test.tsx`); envío con
  el cuerpo exacto; 409 con recarga; vista «hecho»; axe en buscar y en confirmar.
- [ ] Commit `web: recibir por folio`.

### Tarea 5: C8 Comprobantes

**Archivos:** `apps/web/src/consola/comprobantes/Comprobantes.tsx` y su prueba.

**Qué hace:**
- Título «Comprobantes». `Segmentado` con Pendientes, Conciliados y Rechazados (por defecto
  Pendientes); el estado elegido va en la URL (`?estado=`) para que volver desde la conciliación
  lo conserve.
- Chips por acopio desde `porAcopio`: «Todos {total}» y «{nombre} {pendientes}». Elegir uno
  filtra con `acopioId` (también en la URL).
- La lista viene ordenada por la API. Cada fila es un enlace a `/consola/comprobantes/{folio}`
  con el folio en monoespaciada, el acopio, la antigüedad desde `recibidoEn` («hace 3 días»),
  «Factura» si `tieneFactura` y «Con diferencia» si `conDiferencia`, en pastillas neutras con
  ícono.
- Arriba de la lista, «Buscar folio»: un campo y «Abrir», que lleva a
  `/consola/comprobantes/{folio}`. Es el camino a un folio que sigue `PREPARADO` porque se
  entregó sin red y hay que vincularle entradas. No está en la maqueta; se anota en «Cambios
  al construir».
- Vacío: «No hay comprobantes pendientes» (o conciliados, o rechazados). Sin red: `NecesitaRed`
  sin el enlace a C4. Error: `EstadoError` con reintentar.

- [ ] Pruebas: lista con las marcas; «Buscar folio» navega a la conciliación; cambiar de pestaña y de chip pide la ruta con sus
  parámetros; la URL guarda el filtro; vacío; axe.
- [ ] Commit `web: C8, bandeja de comprobantes`.

### Tarea 6: conciliación, ver, conciliar, rechazar y revertir

**Archivos:** `apps/web/src/consola/comprobantes/Conciliacion.tsx`,
`consola/comprobantes/HojaRechazo.tsx` y sus pruebas.

**Qué hace:**
- Cabecera con el folio; tarjeta con el estado, el acopio, «preparada el …» y «recibida el …».
  Si `tieneFactura`: miniatura y «Ver factura», que abre la imagen con `useUrlFactura` de
  `api/donaciones.ts` en una `Hoja` (la URL vence a los 5 minutos: se pide al abrir).
- «Por categoría»: tabla con Categoría, Declaró, Llegó y Entradas en unidad base. Declaró y
  Llegó salen de sumar las líneas por categoría con `enBase`; Entradas, de `resumen`. Debajo de
  una fila, la nota de diferencia (ícono `difference`) o «No llegó» (ícono `block`).
- «Entradas vinculadas ({n})»: cada una con «{categoría} · {cantidad} {unidad}» y, debajo,
  fecha y hora, `registradoPor` y «Recepción» o «Auditor».
- Acciones según el estado:
  - `PENDIENTE` o `PREPARADO`: «Vincular entradas» (tarea 7), «Conciliar» y «Rechazar».
    `PREPARADO` sin vínculos todavía no deja conciliar ni rechazar; muestra «Este folio aún no se
    recibe. Si se entregó sin red, vincula sus entradas».
  - `RECHAZADO`: el motivo y la nota (`motivoDe`, `notaDe`) y «Revertir rechazo».
  - `CONCILIADO`: «Conciliada el …», sin acciones.
- «Conciliar» → `useConciliar`. 422 `SIN_VINCULOS`: el mensaje junto al botón y «Vincular
  entradas» (foco 5).
- `HojaRechazo`: radios con `MOTIVOS_RECHAZO`, «Nota» (obligatoria con Otro, hasta 500), el
  aviso «Le escribimos al Donador con el motivo. Las entradas siguen en el inventario.»,
  «Rechazar comprobante» (botón de peligro) y «Cancelar».
- 403: «No tienes asignado este acopio» y el enlace a C8 (foco 4). 404: «No encontramos ese
  folio». Sin red: `NecesitaRed` sin el enlace a C4.

- [ ] Pruebas: tabla con declarado, llegado y entradas en base; entradas con quién y origen;
  ver factura pide la URL al abrir; conciliar; 422 con su salida; rechazar con motivo y con
  «Otro» sin nota (no deja); revertir; estados `PREPARADO`, `RECHAZADO` y `CONCILIADO`; 403 y
  404; axe en la pantalla y en la hoja.
- [ ] Commit `web: conciliación de un comprobante`.

### Tarea 7: vincular entradas

**Archivos:** `apps/web/src/consola/comprobantes/HojaVincular.tsx` y su prueba; se abre desde
`Conciliacion.tsx`.

**Qué hace:**
- Una `Hoja` «Vincular entradas». Selector «Acopio» con el del comprobante primero; las
  opciones son los acopios que el usuario puede ver: para el Auditor, sus asignaciones
  (`useUbicacionesMias`); para el Administrador, todos (`useAcopiosGestion`).
- La lista de `useEntradasVinculables(folio, acopioId)`: casillas con «{categoría} · {cantidad}
  {unidad}» y debajo fecha y hora, `registradoPor` y «sin conexión» si `origenOffline`. Vacía:
  «No hay entradas sin donación en los últimos 14 días».
- «Vincular {n} entradas» (desactivado con 0) → `useVincular`. Si eligió otro acopio, antes el
  aviso «Este folio pasa a {acopio}». 422 `MOVIMIENTO_NO_VINCULABLE`: el mensaje de la API.
- Al terminar, cierra la hoja; la conciliación se recarga por la invalidación.

- [ ] Pruebas: lista y selección; cambiar de acopio pide la ruta con `acopioId`; vincular manda
  los ids; aviso de reasignación; vacío; error 422; axe.
- [ ] Commit `web: vincular entradas a un comprobante`.

### Tarea 8: recorrido y cierre del Bloque 3

**Archivos:** `apps/web/recorridos/consola-comprobantes.mjs` (nuevo), documentación.

- [ ] `node scripts/iconos.mjs` en `apps/web` y `iconos.test.ts` en verde.
- [ ] Recorrido versionado con el patrón de `recorridos/donador.mjs` (build servido con
  `vite preview` en el puerto 5173 contra la API del Compose, con `seed:demo`), a 360 × 640:
  - como Donador nuevo, preparar una donación con dos categorías para el acopio de `operador1`;
  - como `operador1`, abrir C4, «Recibir por folio», escribir el folio, bajar una línea en 1 con
    su motivo y registrar;
  - como `auditor1`, abrir «Más» → «Comprobantes», ver el folio con «Con diferencia», abrir la
    conciliación y conciliar;
  - preparar y recibir una segunda donación, rechazarla con «Otro» y una nota, comprobar el
    correo en Mailpit y revertir el rechazo.

  En cada pantalla corre axe y guarda `construida.png` en la carpeta de su diseño. El script
  sale con código distinto de 0 si un paso falla.
- [ ] Criterios del §9 de la especificación: el recorrido del §1 de punta a punta en el Compose
  local, y los demás ya cubiertos por las pruebas de la API; se marcan en la especificación.
- [ ] Documentación (con humanizer:humanizer antes de redactar):
  - la tabla «Estado» de este plan;
  - «Cambios al construir» de la especificación con lo que haya cambiado;
  - la fila del Bloque 3 en `docs/05-planes/README.md` (cerrado) y en el índice de specs;
  - la columna «Construida» y la fila «Construida» de las notas de diseño;
  - comentario y cierre de #34.
- [ ] Verificación completa (`lint`, `typecheck`, `depcruise`, `test`, `test:int` en 5439,
  `revisar-colores.sh`) y commit `Bloque 3: cierre del ciclo 2 de la interfaz (la consola)`.
