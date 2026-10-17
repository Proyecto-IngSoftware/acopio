---
title: "Bloque 4 · interfaz, ciclo 3: recepción y reportes del Receptor · plan"
type: plan
tags: [plan, bloque-4, web, consola, motor, recepcion]
estado: vigente
bloque: 4
actualizado: 2026-10-16
---

# Bloque 4 · interfaz, ciclo 3: recepción y reportes del Receptor · plan de implementación

> **Para agentes:** se ejecuta con superpowers:subagent-driven-development o
> superpowers:executing-plans, tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:** el Receptor entra desde «Más», ve las remisiones en camino a sus zonas, abre una
tocándola o escaneando su QR, sube fotos y confirma la recepción (HU-12). Desde la ficha de su
zona reporta lo que falta o marca que ya se resolvió (HU-13).

**Arquitectura:** la API ya existe y no cambia: `GET /api/recepciones`,
`GET /api/recepciones/qr/{token}`, `POST /api/remisiones/{codigo}/evidencia`,
`POST /api/remisiones/{codigo}/recibir`, `GET|POST /api/zonas/{id}/reportes` y
`GET /api/ubicaciones/mias`. En la web hay un cliente `api/recepciones.ts` y tres pantallas en
`apps/web/src/consola/recepciones/`, cargadas con `lazy`. La cámara reutiliza `VistaCamara`
de C04.

**Stack:** React 19, React Router, TanStack Query 5, Tailwind 4 con `packages/ui-tokens`,
`@zxing/browser` (ya instalado), Vitest con `responderSegun`.

**Especificación:** [2026-10-06-bloque-4-motor-design.md](../superpowers/specs/2026-10-06-bloque-4-motor-design.md),
§6 «Receptor» y «Público», §7 ciclo 3. Requerimientos RF-MOT-009 y RF-MOT-011 en
[motor.md](../01-requerimientos/funcionales/motor.md). Joseph aprobó las maquetas el
2026-10-16: [C13 y C20](../03-diseno/stitch/C13-recepcion/maqueta.html). El alcance va
recortado para el domingo 18, según la decisión del 2026-10-16 en el
[plan del servidor de pruebas](2026-10-16-servidor-de-pruebas.md).

## Estado

| Tarea | Estado | Qué falta |
|---|---|---|
| 1 Diseño, plan y escenarios | ✅ | Joseph aprobó la maqueta el 2026-10-16 |
| 2 Cliente de recepciones y reportes | ✅ | |
| 3 Rutas, «Más» y cámara configurable | ✅ | |
| 4 C13 Por recibir | ✅ | |
| 5 C13 Recibir remisión | ✅ | |
| 6 C20 Reportar necesidad | ✅ | |
| 7 Recorrido y cierre | ⬜ | |
| 8 Capa de zonas en P05 (si alcanza) | ⬜ | |

## Decisiones al planear

| # | Decisión | Por qué |
|---|---|---|
| I3-01 | Rutas: `/consola/recepciones` (lista), `/consola/recepciones/:codigo` (recibir), `/consola/recepciones/qr/:token` (la del QR, I2-04) y `/consola/zonas/:id/reportar` (C20). Las de C13 con `RequiereRol roles={['RECEPTOR']}`; C20 con `['ADMIN', 'RECEPTOR']` | En la API, subir evidencia y recibir son solo del Receptor |
| I3-02 | `/consola/recepciones/:codigo` busca la remisión en `GET /api/recepciones`; la ruta del QR la pide con `GET /api/recepciones/qr/{token}`. Las dos muestran el mismo formulario | El Receptor no puede leer `GET /api/remisiones/{codigo}`, que es de `ADMIN` y `OPERADOR` |
| I3-03 | Cada foto se sube al elegirla (`<input type="file" accept="image/*" capture="environment">`). Las miniaturas son `<img src={urlEvidencia(codigo, n)}>` para `n` de 0 a `evidencias − 1`. No se quitan fotos; con 5 (`MAXIMO_EVIDENCIAS` de `@acopio/shared`) desaparece «Otra» | La API no borra evidencia, y el Receptor que subió las fotos puede verlas |
| I3-04 | Tras confirmar, la vista «Recibida» sale del resultado de `POST …/recibir` y no de la lista, porque la remisión ya no está en camino | Así no aparece «no encontrada» justo después de recibir |
| I3-05 | En «Más», sección «Mi zona» para el Receptor: «Por recibir», con el número de remisiones como distintivo, y una fila por zona de `GET /api/ubicaciones/mias` (tipo `ZONA`) hacia `/consola/zonas/:id` | Hoy el Receptor no tiene cómo llegar a ninguna pantalla |
| I3-06 | C10 muestra «Reportar necesidad» arriba cuando el rol es `RECEPTOR` o `ADMIN`. C20 vuelve a la ficha con `?reportado=N` o `?resuelto=N`, y la ficha muestra el aviso | Los reportes recientes ya están en la ficha |
| I3-07 | C20 lista las categorías de la ficha (`useFichaZona(id).data.categorias`). «Ya se resolvió» lista solo las que `GET /api/zonas/{id}/reportes` tiene con `resuelta: false`, una por categoría (la más reciente) | Resolver algo que nadie reportó no tiene sentido |
| I3-08 | El escáner acepta la URL completa del QR o el token suelto: `tokenDeQr(texto)` devuelve lo que sigue a `/consola/recepciones/qr/`, o el texto si no trae `/` | El documento imprime la URL, y un lector externo puede entregar cualquiera de las dos |
| I3-09 | Sin cámara o sin permiso, el escáner se cierra y la lista muestra un aviso neutro: «No pudimos abrir la cámara. Toca la remisión en la lista.» | C04 hace lo mismo |

## Restricciones globales

- La maqueta aprobada manda en la estética, con las diferencias anotadas al final de ella. Sin
  colores hexadecimales en `apps/web`; `scripts/revisar-colores.sh` lo revisa. Sin colores de
  estado del inventario en C13 y C20.
- Textos en español como en la maqueta, sin flechas al final de los botones.
- Cantidades con `formatearCantidad(valor, unidad)` de `@acopio/shared`; fechas con
  `haceCuanto` de `src/formato.ts`.
- Los tipos salen de `src/api/esquema.d.ts` (`RemisionDto`, `ReporteNecesidadDto`,
  `UbicacionDto`) y no se escriben a mano. La API no cambia, así que no se regenera el contrato.
- Pruebas de la web con `envolver(ui, ruta, cliente)`, `clienteFalso` y `responderSegun` de
  `src/pruebas/utilidades.tsx`. Cada pantalla nueva lleva su prueba de axe
  (`violacionesGraves`) sin violaciones graves.
- Tras usar un ícono nuevo de Material Symbols, `node scripts/iconos.mjs` en `apps/web`.
- Ninguna pantalla de este ciclo funciona sin red: `NecesitaRed` cuando `useEnLinea()` da
  `false`.
- Una sola rama, `motor-ciclo-3`, y un solo PR hacia `main`, con commits por tema: diseño y
  plan (tarea 1), pantallas (tareas 2 a 6, un commit al final de la 6) y cierre (tarea 7).
  Cada commit encadena con `&&` y `set -o pipefail`: `bun run lint`, `bun run typecheck`,
  `bun run test`, `scripts/revisar-colores.sh` y `bun run --filter @acopio/api depcruise`.
  `bun run test:int` corre en el cierre con
  `PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439` (contenedor
  `acopio-pg-pruebas`).

## Foco de revisión

1. Dos Receptores sobre el mismo despacho general: el segundo sube una foto o confirma, y la
   API responde 409 `REMISION_TOMADA`. La pantalla muestra el mensaje de la API y «Volver a
   Por recibir» (tarea 5).
2. La remisión dejó de estar en camino entre la lista y la confirmación, porque otro la
   recibió o el Operador la canceló: 409 `REMISION_ESTADO_INVALIDO`. La pantalla dice «Esta
   remisión ya no está en camino a tus zonas…» (tarea 5).
3. El QR es de una remisión de otra zona o ya recibida: `GET /api/recepciones/qr/{token}`
   responde 403 o 404, o devuelve una remisión que no está `EN_TRANSITO`. En los tres casos
   sale el aviso de «ya no está en camino» (tarea 5).
4. La foto pesa más de lo permitido o no es una imagen: la API responde 413 o 415 con su
   mensaje, que aparece junto a «Tomar foto» sin perder las fotos anteriores (tarea 5).
5. Una nota de más de 280 caracteres en C13 o C20: el campo corta en 280 (`maxLength`) y el
   contador lo muestra (tareas 5 y 6).

---

### Task 1: Diseño, plan y escenarios

**Archivos:**
- Crear: `docs/03-diseno/stitch/C13-recepcion/README.md`, `docs/03-diseno/stitch/C20-reportar/README.md`
- Modificar: `docs/03-diseno/stitch/README.md` (filas de C13 y C20)
- Ya creados: la maqueta y las capturas, este plan y `docs/06-operacion/escenarios-por-rol.md`

- [ ] Escribir los dos README con la forma del de C12: proyecto, pantallas de Stitch
  (`02d2db7a69d246fc8996880763c9422e` lista, `c186fb43e5814c01a8119647d1cd1bad` recibir,
  `321a84638cff440288f55f9a05c47110` reportar, con `GEMINI_3_5_FLASH_LITE`), maqueta
  (<https://claude.ai/artifact/6zQs3346hig6iEcbqiRLHF>), aprobación del 2026-10-16, qué
  muestra y diferencias. El de C20 enlaza la maqueta de C13, donde está su vista.
- [ ] Commit `Diseño: C13 recepción y C20 reportar, con el plan del ciclo 3 y los escenarios por rol`.

### Task 2: Cliente de recepciones y reportes

**Archivos:**
- Crear: `apps/web/src/api/recepciones.ts`, `apps/web/src/api/recepciones.test.tsx`

**Interfaces:**
- Produce:
  - `tokenDeQr(texto: string): string | null` (I3-08). `null` si el texto está vacío o es otra URL.
  - `useRecepciones(): UseQueryResult<Remision[], ErrorApi>`, clave `['recepciones']`.
  - `useRemisionPorQr(token: string): UseQueryResult<Remision, ErrorApi>`, clave `['recepcion-qr', token]`, `retry: false`.
  - `useSubirEvidencia(codigo: string): UseMutationResult<Remision, ErrorApi, File>`: multipart con el campo `foto`, como `subirFactura` en `api/donaciones.ts`.
  - `useRecibirRemision(codigo: string): UseMutationResult<Remision, ErrorApi, { zonaId?: string; nota?: string }>`. Al terminar invalida `['recepciones']` y `['ficha-zona']`.
  - `useReportesZona(zonaId: string): UseQueryResult<ReporteNecesidad[], ErrorApi>`, clave `['reportes-zona', zonaId]`.
  - `useReportar(zonaId: string): UseMutationResult<{ creados: string[] }, ErrorApi, { categorias: string[]; nota?: string; resuelta: boolean }>`. Invalida `['reportes-zona', zonaId]` y `['ficha-zona', zonaId]`.
  - `pendientesDeResolver(reportes: ReporteNecesidad[]): ReporteNecesidad[]`: el más reciente por `categoriaId` y, de esos, los que tienen `resuelta: false` (I3-07).
  - Tipo `ReporteNecesidad = components['schemas']['ReporteNecesidadDto']`. `Remision` se importa de `./remisiones`.

- [ ] **Paso 1: pruebas**
  - `tokenDeQr('https://acopio.josephqaz.dev/consola/recepciones/qr/abc123')` → `'abc123'`;
    `tokenDeQr('abc123')` → `'abc123'`; `tokenDeQr('https://otra.com/x')` → `null`;
    `tokenDeQr('  ')` → `null`.
  - `pendientesDeResolver` con agua `resuelta: false` hace 3 h, agua `resuelta: true` hace 1 h
    y arroz `resuelta: false`: queda solo arroz.
  - `useSubirEvidencia` manda `POST /api/remisiones/R-2026-DEMA2/evidencia` con un `FormData`
    que trae `foto`.
  - `useRecibir` manda `{ zonaId, nota }` y después vuelve a pedir `GET /api/recepciones`.
- [ ] **Paso 2:** `cd apps/web && bunx vitest run src/api/recepciones.test.tsx` falla porque
  el módulo no existe.
- [ ] **Paso 3:** escribir `api/recepciones.ts` con esas firmas, usando `api` y `desenvolver`
  de `./cliente`.
- [ ] **Paso 4:** el mismo comando pasa.

### Task 3: Rutas, «Más» y cámara configurable

**Archivos:**
- Modificar: `apps/web/src/rutas.tsx` (las cuatro rutas de I3-01, con `lazy`)
- Modificar: `apps/web/src/portal/Mas.tsx` (sección «Mi zona») y su prueba
- Modificar: `apps/web/src/consola/inventario/Escaner.tsx` (`VistaCamara`) y `Escaner.test.tsx`
- Crear: las tres pantallas como esqueletos que llenan las tareas 4 a 6:
  `consola/recepciones/Recepciones.tsx`, `consola/recepciones/RecibirRemision.tsx` y
  `consola/recepciones/ReportarNecesidad.tsx`

**Interfaces:**
- Produce: `VistaCamara` gana `indicacion?: string` (por defecto «Apunta al código de barras
  del producto») y `textoSalir?: string` (por defecto «Buscar por nombre»). C04 no cambia.
- Produce: `MiZona()` en `Mas.tsx`, visible solo con `usuario.rol === 'RECEPTOR'`.

- [ ] **Paso 1: pruebas**
  - «Más» con un Receptor (`clienteFalso` con rol `RECEPTOR`), `GET /api/recepciones` con dos
    remisiones y `GET /api/ubicaciones/mias` con
    `[{ tipo: 'ZONA', id: ZONA, nombre: 'Barrio San Agustín (prueba)', municipio: 'Mocoa', estado: 'ACTIVA' }]`:
    se ve la sección «Mi zona», la fila «Por recibir» dice «2 remisiones en camino» y enlaza a
    `/consola/recepciones`, y la fila de la zona enlaza a `/consola/zonas/${ZONA}`.
  - Sin remisiones, la fila dice «Nada en camino por ahora» y no lleva distintivo.
  - Un Operador no ve «Mi zona».
  - `VistaCamara` con `indicacion="Apunta al QR del documento de la remisión"` y
    `textoSalir="Ver la lista"` muestra esos textos.
- [ ] **Paso 2:** correr la prueba de «Más» y `Escaner.test.tsx`; fallan.
- [ ] **Paso 3:** implementar. La fila «Por recibir» usa el ícono `local_shipping` y la de la
  zona `location_on`, con «{municipio} · cobertura y reportes». Con una remisión: «1 remisión
  en camino».
- [ ] **Paso 4:** las dos pasan; `node scripts/iconos.mjs` si hizo falta.

### Task 4: C13 Por recibir

**Archivos:**
- Modificar: `apps/web/src/consola/recepciones/Recepciones.tsx`
- Crear: `apps/web/src/consola/recepciones/Recepciones.test.tsx`

**Interfaces:**
- Consume: `useRecepciones` y `tokenDeQr` (tarea 2); `VistaCamara` (tarea 3).

- [ ] **Paso 1: pruebas**
  - Con `R-2026-DEMA2` (zona Barrio San Agustín, agua 400 L) y `R-2026-DEMA3` (`zona: null`,
    arroz 60 kg): cada tarjeta enlaza a `/consola/recepciones/{codigo}` y muestra el código,
    «Desde {acopio}», «Para {zona}» o «Despacho general: eliges la zona al recibir», y
    «Agua potable 400 L».
  - Lista vacía: «No hay remisiones en camino a tus zonas. Cuando un acopio despache una,
    aparece aquí.»
  - Si el escáner lee `https://x/consola/recepciones/qr/tok1`, se navega a
    `/consola/recepciones/qr/tok1`. Un texto que `tokenDeQr` no reconoce muestra «Ese código no
    es el QR de una remisión.» y no navega.
  - `alFallar` del escáner muestra el aviso de I3-09.
  - Sin red, `NecesitaRed`. Axe sin violaciones graves.
- [ ] **Paso 2:** correr la prueba; falla.
- [ ] **Paso 3:** implementar según la vista «C13 · Por recibir» de la maqueta. «Escanear el QR
  de la remisión» abre `VistaCamara` con los textos de la tarea 3, y «Ver la lista» la cierra.
  La antigüedad es `haceCuanto(despachadaEn)`.
- [ ] **Paso 4:** la prueba pasa.

### Task 5: C13 Recibir remisión

**Archivos:**
- Modificar: `apps/web/src/consola/recepciones/RecibirRemision.tsx`
- Crear: `apps/web/src/consola/recepciones/RecibirRemision.test.tsx`

**Interfaces:**
- Consume: `useRecepciones`, `useRemisionPorQr`, `useSubirEvidencia` y `useRecibirRemision` (tarea 2);
  `useUbicacionesMias` de `api/red.ts`; `urlEvidencia` de `api/remisiones.ts`;
  `MAXIMO_EVIDENCIAS` de `@acopio/shared`.
- Produce: `RecibirRemision.tsx` exporta `RecibirPorCodigo` (lee `:codigo`) y `RecibirPorQr`
  (lee `:token`), que comparten `FormularioRecepcion({ remision })`.

- [ ] **Paso 1: pruebas**
  - `RecibirPorCodigo` con `R-2026-DEMA2` y `evidencias: 0`: «Confirmar recepción» está
    deshabilitado y se lee «Toma una foto para confirmar.»
  - Elegir un archivo llama `POST …/evidencia`. Con la respuesta `evidencias: 1` aparece una
    `<img>` cuyo `src` termina en `/api/remisiones/R-2026-DEMA2/evidencia/0`, y el botón se
    habilita.
  - Con `evidencias: 5` no aparece «Otra».
  - Confirmar manda `POST …/recibir` con `{ nota: 'Dos bultos mojados' }` y muestra
    «R-2026-DEMA2 recibida», «Ver la ficha de la zona» (enlace a `/consola/zonas/{zonaId}`) y
    «Volver a Por recibir».
  - `R-2026-DEMA3` (despacho general) con una zona en `ubicaciones/mias`: el selector «¿En qué
    zona la recibes?» es obligatorio y confirmar manda `zonaId`. Sin zona elegida, el botón
    sigue deshabilitado y se lee «Elige la zona y toma una foto para confirmar.»
  - Un código que no está en `GET /api/recepciones` muestra «Esta remisión ya no está en camino
    a tus zonas. Puede que ya se haya recibido o cancelado.» con «Volver a Por recibir».
  - `RecibirPorQr` con `GET /api/recepciones/qr/tok1` que responde 404, 403 o una remisión
    `RECIBIDA`: el mismo aviso.
  - `POST …/recibir` responde 409 `REMISION_TOMADA` con «Otro Receptor ya está recibiendo este
    despacho»: se muestra ese mensaje.
  - `POST …/evidencia` responde 413 con un mensaje: el mensaje aparece y la miniatura anterior
    sigue.
  - La nota tiene `maxLength={280}` y el contador «N / 280».
  - Axe sin violaciones graves.
- [ ] **Paso 2:** correr la prueba; falla.
- [ ] **Paso 3:** implementar según las vistas «Recibir, hacia una zona», «Recibir un despacho
  general», «Recibida» y «Ya no está en camino». El input de archivo va dentro de un `<label>`
  con el texto «Tomar foto» u «Otra». Errores con `FormularioError`.
- [ ] **Paso 4:** la prueba pasa.

### Task 6: C20 Reportar necesidad

**Archivos:**
- Modificar: `apps/web/src/consola/recepciones/ReportarNecesidad.tsx`
- Crear: `apps/web/src/consola/recepciones/ReportarNecesidad.test.tsx`
- Modificar: `apps/web/src/consola/motor/FichaZona.tsx` y `FichaZona.test.tsx` (botón y aviso, I3-06)

**Interfaces:**
- Consume: `useFichaZona` de `api/motor.ts`; `useReportesZona`, `useReportar` y
  `pendientesDeResolver` (tarea 2).

- [ ] **Paso 1: pruebas**
  - Con la ficha de la zona (agua, arroz, pañales) y sin reportes: «Falta» está elegido, las
    tres categorías son casillas, el buscador filtra por nombre («arr» deja solo Arroz) y el
    aviso «La nota se ve en el mapa público tal como la escribas. No pongas nombres, teléfonos
    ni datos de personas.» va antes del campo «Nota pública (opcional)».
  - Con dos marcadas, el botón dice «Reportar 2 categorías»; sin ninguna, está deshabilitado.
  - Enviar manda `POST /api/zonas/{id}/reportes` con `{ categorias: [agua, pañales], resuelta: false }`
    (sin `nota` si está vacía) y navega a `/consola/zonas/{id}?reportado=2`.
  - «Ya se resolvió» con agua reportada y sin resolver: lista solo agua, con «Reportada hace 3
    h». Enviar manda `resuelta: true` y navega con `?resuelto=1`. Sin pendientes: «No hay
    necesidades reportadas en esta zona.»
  - La nota tiene `maxLength={280}` y el contador.
  - `FichaZona` con rol `RECEPTOR` muestra el enlace «Reportar necesidad» a
    `/consola/zonas/{id}/reportar`. Con `?reportado=2` muestra «Reportaste 2 categorías. El
    motor las tiene en cuenta en el próximo cálculo.» y con `?resuelto=1`, «Marcaste 1
    categoría como resuelta.».
  - Axe sin violaciones graves.
- [ ] **Paso 2:** correr las dos pruebas; fallan.
- [ ] **Paso 3:** implementar según las vistas «C20 · Reportar necesidad», «Ya se resolvió» y
  «Enviado». El segmento es un `radiogroup` con dos `radio`.
- [ ] **Paso 4:** pasan. Después, `bun run test` completo, `bun run lint`, `bun run typecheck`
  y `scripts/revisar-colores.sh` en verde.
- [ ] **Paso 5:** commit `Web: C13 recepción y C20 reportar necesidad para el Receptor`.

### Task 7: Recorrido y cierre

**Archivos:**
- Crear: `apps/web/recorridos/consola-recepciones.mjs`
- Modificar: `docs/06-operacion/recorridos.md`, la tabla de estado de este plan, §13
  «Cambios al construir» de la especificación, `docs/03-diseno/stitch/C13-recepcion/README.md`
  (capturas `construida-*.png`) y `docs/06-operacion/escenarios-por-rol.md` si algo cambió

- [ ] Escribir el recorrido sobre la demo recién sembrada, con la forma de
  `consola-remisiones.mjs`: entrar como `alejandra@acopio.co`, ir de «Más» a «Por recibir»,
  abrir `R-2026-DEMA2`, comprobar que el botón está deshabilitado, subir una imagen de prueba,
  confirmar y ver «recibida». Luego, en la ficha de la zona, reportar agua con una nota y ver
  el aviso. Capturas a 360 × 640.
- [ ] Correrlo contra el Compose (`bun run servicios:todo`, demo sembrada) y anotar el
  resultado en `recorridos.md`. Correr también `consola-remisiones.mjs` y
  `validacion-general.mjs`.
- [ ] `bun run test:int` con el contenedor de pruebas aparte.
- [ ] Commit `Cierre: ciclo 3 del motor con su recorrido`, subir, `gh pr create` y
  `gh pr checks --watch`.

### Task 8: Capa de zonas en P05 (si alcanza antes del domingo)

Sin esta tarea no se puede mostrar el criterio HU-13.1 («un visitante ve esa necesidad en el
mapa»). Si no alcanza, se anota en el escenario 24 y en el issue #35.

**Archivos:**
- Modificar: el cliente público que usa P05 en `apps/web/src/api/`, la pantalla del mapa de
  P05 y su prueba

**Interfaces:**
- Consume: `GET /api/publico/zonas-necesidad` → `ZonaPublicaDto[]` (`zonaId`, `centro`,
  `radioKm` y `necesidades` con categoría, nota y antigüedad).

- [ ] Antes de escribir código, agregar una vista a la maqueta para que Joseph la apruebe.
- [ ] Prueba: con una zona y una necesidad, el mapa dibuja un círculo en `centro` con
  `radioKm`. Al tocarlo muestra la categoría, la nota entre comillas y «hace N h», sin
  dirección.
- [ ] Implementar con el mismo componente de mapa de P05, en un color neutro de la marca y no
  con los del inventario.
