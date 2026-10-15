---
title: "Bloque 4 · interfaz, ciclo 2: remisiones para el Operador · plan"
type: plan
tags: [plan, bloque-4, web, consola, motor, remisiones]
estado: aprobado
bloque: 4
actualizado: 2026-10-15
---

# Bloque 4 · interfaz, ciclo 2: remisiones para el Operador · plan de implementación

> **Para agentes:** se ejecuta con superpowers:subagent-driven-development o
> superpowers:executing-plans, tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:** el Operador del acopio de origen y el Administrador arman una remisión (desde
C11 o a mano, hacia una zona o como despacho general), ajustan sus líneas contra el
excedente, la despachan con folios conciliados, imprimen su documento con QR y la cancelan
con motivo. El Operador ve en «Más» cuántos borradores tiene por despachar.

**Arquitectura:** la API de remisiones ya existe. Al Operador le faltan dos lecturas, y la
tarea 2 las agrega: `GET /api/zonas` abierto a su rol y
`GET /api/remisiones/:codigo/folios-vinculables`. En la web, un cliente `api/remisiones.ts`
con TanStack Query y cuatro pantallas en `apps/web/src/consola/remisiones/`, cargadas con
`lazy` como el resto de la consola. El editor de líneas es un componente que comparten
«nueva» y el detalle en borrador.

**Stack:** React 19, React Router, TanStack Query 5, Tailwind 4 con `packages/ui-tokens`,
`qrcode` (ya instalado), Vitest con `responderSegun`; NestJS 11 y Jest en la tarea 2.

**Especificación:** [2026-10-06-bloque-4-motor-design.md](../superpowers/specs/2026-10-06-bloque-4-motor-design.md),
§1 (pasos 4 y 6), §6 «Remisiones» y §7, ciclo 2; decisión M-07. Requerimiento: RF-MOT-008 en
[motor.md](../01-requerimientos/funcionales/motor.md). El diseño de este ciclo se acordó con
Joseph el 2026-10-15 y queda en «Decisiones al planear». La maqueta sale de la tarea 1.

## Estado

| Tarea | Estado | Qué falta |
|---|---|---|
| 1 Diseño: Stitch y maqueta de C12 | ✅ | Joseph aprobó la [maqueta](../03-diseno/stitch/C12-remisiones/maqueta.html) el 2026-10-15 |
| 2 API: zonas y folios para el Operador | ✅ `8ea92a4` | |
| 3 Cliente de remisiones y `Qr` compartido | ⬜ | |
| 4 Rutas y «Más» | ⬜ | |
| 5 Editor de líneas y nueva remisión | ⬜ | |
| 6 Detalle, despacho y cancelación | ⬜ | |
| 7 Lista de remisiones | ⬜ | |
| 8 Documento imprimible | ⬜ | |
| 9 Recorrido y cierre del ciclo | ⬜ | |

## Decisiones al planear

| # | Decisión | Por qué |
|---|---|---|
| I2-01 | C12 se abre desde «Más». Para el Operador, la fila «Remisiones» va en la sección «Mi acopio» y, si hay borradores, dice «N en borrador por despachar» con el número como distintivo. El Administrador la ve en «Administración» | El Operador entra por la portada y abre «Más»; ahí ve los traslados que le aprobó el Administrador sin ir a buscarlos |
| I2-02 | Rutas: `/consola/remisiones` (lista), `/consola/remisiones/nueva`, `/consola/remisiones/:codigo` (detalle según el estado) y `/consola/remisiones/:codigo/documento` (para imprimir, sin la cabecera ni la barra de la consola) | El documento con ruta propia se puede abrir e imprimir desde un enlace |
| I2-03 | «Nueva remisión» es una ruta con el mismo editor de líneas del borrador. `POST /remisiones` exige al menos una línea (`lineas`, de 1 a 40), así que no hay borrador vacío | Un solo editor para crear y para editar |
| I2-04 | El QR guarda `${window.location.origin}/consola/recepciones/qr/${qrToken}`. Debajo va el código de la remisión en texto | La cámara del teléfono abre Acopio directo; el escáner de C13 (ciclo 3) saca el token de la URL. Hasta el ciclo 3 esa ruta da la página de no encontrada |
| I2-05 | `GET /api/zonas` acepta también `OPERADOR`, solo lectura. Las escrituras de zonas siguen siendo del Administrador | El Operador elige la zona al crear o editar; los selectores muestran solo zonas de emergencias vigentes (`useEmergenciasVigentes`) |
| I2-06 | Endpoint nuevo `GET /api/remisiones/:codigo/folios-vinculables`: los comprobantes `CONCILIADO` del acopio de origen, con el mismo alcance que ver la remisión | `GET /api/comprobantes` es de `AUDITOR` y `ADMIN`. La regla es la que ya aplica `despachar` (`foliosVinculables`) |
| I2-07 | El responsable es opcional en el borrador y obligatorio para despachar (422 `RESPONSABLE_OBLIGATORIO`, `remisiones.service.ts`). Si falta, la hoja de despachar lo pide y lo guarda con `PATCH` antes de despachar | Evita un error que el Operador no sabría de dónde sale |
| I2-08 | En el editor, el tope de una categoría es `movible` del excedente más la cantidad que esa categoría ya tiene en la remisión que se edita | `comprometido` cuenta todos los borradores, también el propio, y la API se lo devuelve al validar (`comprometidoPropio`) |
| I2-09 | Las fotos de evidencia se muestran con `<img src>` a `/api/remisiones/{codigo}/evidencia/{n}`, con `n` desde 0 hasta `evidencias − 1` | La API sirve la imagen y la cookie viaja por ser del mismo origen |

## Restricciones globales

- La maqueta aprobada en la tarea 1 manda en la estética, con sus diferencias. Sin colores
  hexadecimales en `apps/web` (los tokens salen de `packages/ui-tokens`;
  `scripts/revisar-colores.sh` lo revisa). El rojo de error solo en «Cancelar remisión»
  dentro de su hoja y en los mensajes de error.
- Ningún código de pantalla antes de que Joseph apruebe la maqueta (tarea 1).
- Textos en español, sin flechas al final de los botones ni rótulos en mayúsculas salvo las
  etiquetas pequeñas de la maqueta, que usan `text-label-caps`.
- Cantidades con `formatearCantidad(valor, unidad)` de `@acopio/shared`; fechas con
  `diaLargo`, `fechaHora` y `haceCuanto` de `src/formato.ts`.
- Estados en pantalla: `BORRADOR` «Borrador», `EN_TRANSITO` «En tránsito», `RECIBIDA`
  «Recibida», `CANCELADA` «Cancelada». Sin zona: «Despacho general».
- Los tipos del cliente salen de `src/api/esquema.d.ts`; no se escriben a mano. Tras la
  tarea 2: `bun run --filter @acopio/api openapi`, luego `bun run --filter @acopio/web api:tipos`,
  y se versionan los dos.
- Pruebas de la web con `envolver(ui, ruta, cliente)`, `clienteFalso` y `responderSegun` de
  `src/pruebas/utilidades.tsx`. Cada pantalla nueva tiene su prueba de axe sin violaciones
  graves (`violacionesGraves`).
- Ícono nuevo de Material Symbols → `node scripts/iconos.mjs` en `apps/web`.
- Ninguna pantalla de este ciclo funciona sin red: `NecesitaRed` (de
  `consola/inventario/NecesitaRed.tsx`) con su texto, cuando `useEnLinea()` da `false`.
- Roles: todas las rutas de C12 con `RequiereRol roles={['ADMIN', 'OPERADOR']}`.
- Las pruebas de integración comparten la base `acopio_test` entre suites: cada prueba crea
  sus propias categorías y comprobantes con `unico(...)` y `generarFolio(2026)`; nada de
  datos globales nuevos en `crearAppPrueba`.
- Una sola rama, `motor-c2-remisiones`, y un solo PR hacia `main`, con commits por tema:
  diseño y plan (tarea 1), API (tarea 2), pantallas (tareas 3 a 8, un commit al final de la
  8) y cierre (tarea 9). Mensajes en español con el área al inicio. Cada commit encadena las
  verificaciones con `&&` y `set -o pipefail`: `bun run lint`, `bun run typecheck`,
  `bun run test` y `scripts/revisar-colores.sh`; desde la tarea 2 también
  `bun run --filter @acopio/api depcruise` y `bun run test:int` con
  `PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439` (contenedor
  `acopio-pg-pruebas`, nunca el PostgreSQL del Compose).

## Foco de revisión

1. El borrador no tiene responsable y el Operador toca «Despachar»: la hoja pide «Quién lleva
   el envío», guarda con `PATCH` y después despacha. Sin escribirlo, el botón no envía y
   dice «Escribe quién lleva el envío» (tarea 6).
2. El excedente bajó entre que se abrió el editor y se guardó (otra salida, otra aprobación):
   la API responde 422 `LINEA_EXCEDE_MOVIBLE` con `detalles: { categoriaId, maximo }`; el
   editor marca esa fila con «Hoy se pueden mandar hasta {maximo}» y «Usar {maximo}»
   (tarea 5).
3. Dos personas sobre la misma remisión: una despacha mientras la otra edita o cancela. La
   segunda recibe 409 `REMISION_ESTADO_INVALIDO`; la pantalla dice «La remisión cambió
   mientras la editabas» con «Ver cómo quedó», que vuelve a pedir el detalle (tarea 6).
4. La emergencia de la zona se cerró después de crear el borrador: cambiar la zona responde
   409 `ZONA_SOLO_LECTURA` y se muestra el mensaje de la API junto al selector; el selector
   no ofrece zonas de emergencias cerradas (tareas 5 y 6).
5. El acopio no tiene nada movible (todo `movible: 0`): «Nueva remisión» muestra
   `EstadoVacio` «Este acopio no tiene excedente para mandar» y no ofrece crear; en un
   borrador, las líneas que ya tiene siguen editables hasta su propia cantidad (I2-08)
   (tarea 5).

---

### Task 1: Diseño en Stitch y maqueta de C12

**Archivos:**
- Crear: `docs/03-diseno/stitch/C12-remisiones/` con `README.md`, `captura-lista.png`,
  `captura-borrador.png`, `captura-documento.png`, `lista.html`, `borrador.html`,
  `documento.html` y `maqueta.html`
- Modificar: `docs/03-diseno/stitch/README.md` (fila de C12),
  `docs/03-diseno/stitch/mas-con-sesion/README.md` (la fila «Remisiones» en «Mi acopio»)

**Qué hace:** no lleva código de la aplicación.
- En Stitch, proyecto ACOPIO DISEÑO (`10306891818878200068`), con el tema «Acopio · sistema
  de diseño» (`assets/3694704229522762996`), tres pantallas a 360 px de ancho:
  1. «C12 Remisiones»: filtro por estado como chips (por defecto «Borradores») y por zona,
     filas con código, `Pildora` de estado, acopio, destino, cuántas líneas y la fecha del
     estado; «Nueva remisión» arriba.
  2. «C12 Remisión en borrador»: código y estado, destino (zona o «Despacho general»),
     responsable, el editor de líneas con el movible de cada categoría y su campo de
     cantidad, «Guardar líneas», «Despachar» (primario) y «Cancelar remisión».
  3. «C12 Documento de remisión», en tamaño carta: código, acopio de origen, destino,
     responsable, fecha de despacho, tabla de líneas (categoría, cantidad, unidad), folios
     vinculados, el QR con el código debajo y los espacios para la firma de quien entrega
     y de quien recibe.
- La maqueta (`maqueta.html`, un artifact de claude.ai como la del ciclo 1) junta esas tres
  y arma con los tokens: «Nueva remisión», el detalle en tránsito, el detalle recibido con
  fotos, el cancelado con su motivo, la hoja de despachar (folios con casillas y el
  responsable cuando falta), la hoja de cancelar (motivo de 10 a 280 caracteres) y la fila
  «Remisiones · 3 en borrador por despachar» en la sección «Mi acopio» de «Más».
- `README.md` con el formato de `C11-motor/README.md`: proyecto, pantallas, fecha, archivos,
  maqueta, aprobación, qué muestra y diferencias.

- [ ] Generar las tres pantallas en Stitch y exportar HTML y captura.
- [ ] Armar la maqueta, publicarla como artifact y pasarle el enlace a Joseph.
- [ ] Iterar en la maqueta hasta que Joseph la apruebe; anotar fecha y diferencias en el
  `README.md`.
- [ ] Commit `Diseño: C12 remisiones, con la maqueta del ciclo 2` con la carpeta de diseño y
  este plan (estado `aprobado`). Abrir el PR del ciclo en borrador (`gh pr create --draft`).

### Task 2: API, zonas y folios para el Operador

**Archivos:**
- Modificar: `apps/api/src/modulos/acopios/zonas.controller.ts`,
  `apps/api/src/modulos/comprobantes/dao/comprobante.dao.ts`,
  `apps/api/src/modulos/motor/remisiones.service.ts`,
  `apps/api/src/modulos/motor/remisiones.controller.ts`, `apps/api/src/comun/respuestas.ts`,
  `apps/api/src/pruebas-integracion/despacho.int.test.ts`,
  `apps/api/src/pruebas-integracion/red.int.test.ts`, `docs/03-diseno/api/openapi.json`,
  `apps/web/src/api/esquema.d.ts`,
  `docs/superpowers/specs/2026-10-06-bloque-4-motor-design.md` (§6 y §13 «Cambios al
  construir»)

**Interfaces que produce:**
- `GET /api/zonas?emergencia=` responde 200 también a `OPERADOR`. `POST` y `PATCH` siguen
  solo para `ADMIN`.
- `ComprobanteDao.conciliadosDeAcopio(acopioId: string, bd?: ClienteBd)`: los comprobantes
  `CONCILIADO` de ese acopio, más recientes primero por `verificado_en`, con `folio`,
  `verificado_en` y los nombres de las categorías de sus líneas.
- `FolioVinculableDto` en `comun/respuestas.ts`:
  `{ folio: string; conciliadoEn: fecha; categorias: string[] }`.
- `RemisionesService.foliosVinculables(usuario, codigo)` (público, distinto del privado que
  valida al despachar; el privado pasa a llamarse `validarFolios`) y
  `GET /api/remisiones/:codigo/folios-vinculables` → `FolioVinculableDto[]`, con
  `@Roles('ADMIN', 'OPERADOR')` heredado del controlador.

- [ ] **Paso 1: las pruebas que fallan.** En `red.int.test.ts`, dentro del bloque de zonas:

```ts
it('el Operador lista zonas pero no las crea ni las edita', async () => {
  const operador = (await crearUsuarioActivo(a, tokenAdmin, { rol: 'OPERADOR' })).token;
  const lista = await a
    .http()
    .get(`/api/zonas?emergencia=${EMERGENCIA_PRUEBA}`)
    .set('authorization', `Bearer ${operador}`)
    .expect(200);
  expect(lista.body.map((z: { id: string }) => z.id)).toContain(ZONA_A);
  await a
    .http()
    .post('/api/zonas')
    .set('authorization', `Bearer ${operador}`)
    .send(nueva(EMERGENCIA_PRUEBA))
    .expect(403);
  await a
    .http()
    .patch(`/api/zonas/${ZONA_A}`)
    .set('authorization', `Bearer ${operador}`)
    .send({ nombre: 'No debería cambiar' })
    .expect(403);
});
```

  (`tokenAdmin` y `nueva(emergenciaId)` son los del archivo: el token del Administrador y el
  cuerpo de una zona. El guard de roles corre antes de validar el cuerpo, así que el `PATCH`
  da 403 aunque el cuerpo no se revise.)

  En `despacho.int.test.ts`, con los ayudantes `categoria`, `borrador` y `folio` del
  archivo:

```ts
it('lista los folios conciliados del acopio de origen para vincular', async () => {
  const cat = await categoria(10);
  const r = await borrador(cat, 2, 'Conductor');
  const conciliado = await folio('CONCILIADO');
  const pendiente = await folio('PENDIENTE');
  const res = await get(`/api/remisiones/${r.codigo}/folios-vinculables`, operador).expect(200);
  const folios = res.body.map((f: { folio: string }) => f.folio);
  expect(folios).toContain(conciliado);
  expect(folios).not.toContain(pendiente);
  expect(res.body.find((f: { folio: string }) => f.folio === conciliado)).toMatchObject({
    categorias: [],
  });
});

it('los folios de un acopio ajeno no se listan y el Operador de otro acopio recibe 403', async () => {
  const cat = await categoria(10);
  const r = await borrador(cat, 2, 'Conductor');
  const otro = (
    await crearUsuarioActivo(a, admin, {
      rol: 'OPERADOR',
      asignaciones: [{ tipo: 'ACOPIO', ubicacionId: ACOPIO_B }],
    })
  ).token;
  await get(`/api/remisiones/${r.codigo}/folios-vinculables`, otro).expect(403);
  const ajeno = await a.prisma.comprobante.create({
    data: { folio: generarFolio(2026), donador_id: adminId, acopio_id: ACOPIO_B, estado: 'CONCILIADO' },
  });
  const res = await get(`/api/remisiones/${r.codigo}/folios-vinculables`, operador).expect(200);
  expect(res.body.map((f: { folio: string }) => f.folio)).not.toContain(ajeno.folio);
});
```

  Importar `ACOPIO_B` de `../../test/app-prueba` si el archivo no lo importa. Los
  comprobantes que crea `folio()` no tienen líneas, por eso `categorias: []`.

- [ ] **Paso 2: verlas fallar.**
  `cd apps/api && PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439 bunx jest -c jest.int.config.cjs --runInBand src/pruebas-integracion/despacho.int.test.ts src/pruebas-integracion/red.int.test.ts -t 'folios|Operador lista zonas'`.
  Esperado: la de zonas falla con 403 en el `GET`; las de folios, con 404 en la ruta nueva.

- [ ] **Paso 3: implementar.**
  - `zonas.controller.ts`: quitar `@Roles('ADMIN')` de la clase y ponerlo en `crear` y
    `actualizar`; `listar` lleva `@Roles('ADMIN', 'OPERADOR')`. Actualizar el comentario de la
    clase («C9 Zonas (RF-MOT-001). Escribe el Administrador; el Operador las lista para sus
    remisiones»).
  - `comprobante.dao.ts`:

```ts
/** Los conciliados de un acopio, para vincularlos al despachar una remisión (RF-CMP-007). */
conciliadosDeAcopio(acopioId: string, bd: ClienteBd = this.prisma) {
  return bd.comprobante.findMany({
    where: { acopio_id: acopioId, estado: 'CONCILIADO' },
    orderBy: { verificado_en: 'desc' },
    select: {
      folio: true,
      verificado_en: true,
      lineas: { select: { categoria: { select: { nombre: true } } } },
    },
  });
}
```

  - `respuestas.ts`, junto a `RemisionDto`:

```ts
export class FolioVinculableDto extends crearDto(
  z.object({
    folio: z.string().describe('ACO-AAAA-XXXXX'),
    conciliadoEn: fecha,
    categorias: z.array(z.string()).describe('Sin repetir, en orden alfabético'),
  }),
) {}
```

  - `remisiones.service.ts`: renombrar el privado `foliosVinculables` a `validarFolios` (y
    su llamada en `despachar`), y agregar:

```ts
/** Los folios conciliados que se pueden vincular al despachar (RF-CMP-007). */
async foliosVinculables(usuario: UsuarioAutenticado, codigo: string) {
  const r = await this.encontrar(codigo);
  await this.alcance.exigir(usuario, 'ACOPIO', r.acopio_origen_id);
  const filas = await this.comprobantes.conciliadosDeAcopio(r.acopio_origen_id);
  return filas.map((c) => ({
    folio: c.folio,
    conciliadoEn: c.verificado_en!.toISOString(),
    categorias: [...new Set(c.lineas.map((l) => l.categoria.nombre))].sort((x, y) =>
      x.localeCompare(y, 'es'),
    ),
  }));
}
```

    `verificado_en` siempre tiene fecha en un `CONCILIADO` (`conciliacion.service.ts` la
    pone al conciliar y la borra al revertir). `fecha` es `z.iso.datetime()` en
    `respuestas.ts`, así que va el texto ISO, como en `aRemisionVista` (`vistas.ts`).
  - `remisiones.controller.ts`, antes de `@Get(':codigo')` para que la ruta no la tome
    `ver`:

```ts
@Get(':codigo/folios-vinculables')
@ApiOkResponse({ type: FolioVinculableDto, isArray: true })
@ApiResponse(errores)
foliosVinculables(@UsuarioActual() u: UsuarioAutenticado, @Param('codigo') codigo: string) {
  return this.remisiones.foliosVinculables(u, codigo);
}
```

- [ ] **Paso 4: verlas pasar** con el mismo comando del paso 2, y luego la suite completa
  de integración (`bun run test:int` con `PRUEBAS_PG_URL`).
- [ ] **Paso 5: contrato y tipos.** `bun run --filter @acopio/api openapi` y
  `bun run --filter @acopio/web api:tipos`. Comprobar en `openapi.json` que
  `/api/remisiones/{codigo}/folios-vinculables` existe y que `FolioVinculableDto` no tiene
  arreglos donde no van.
- [ ] **Paso 6: documentación.** En la especificación del Bloque 4, §6 «Remisiones», agregar
  la ruta nueva y, en §6 de zonas, que el Operador lista. En §13 «Cambios al construir», una
  entrada fechada 2026-10-15 con I2-05 e I2-06.
- [ ] **Paso 7: commit** `API: el Operador lista zonas y los folios que puede vincular`,
  con todas las verificaciones encadenadas.

### Task 3: Cliente de remisiones y `Qr` compartido

**Archivos:**
- Crear: `apps/web/src/api/remisiones.ts`, `apps/web/src/api/remisiones.test.tsx`,
  `apps/web/src/componentes/Qr.tsx`
- Modificar: `apps/web/src/donador/PasoFolio.tsx` (usa `Qr`), `apps/web/src/api/red.ts`
  (los dos `as unknown as` que dejó #38, líneas 46 y 221),
  `docs/02-arquitectura/patrones-y-practicas.md` (catálogo: `Qr`)

**Interfaces que produce:**
- Tipos: `Remision = S['RemisionDto']`, `EstadoRemision = Remision['estado']`,
  `LineaRemision = Remision['lineas'][number]`, `Excedente = S['ExcedenteDto']`,
  `FolioVinculable = S['FolioVinculableDto']`, `DatosRemision = S['CrearRemisionDto']`,
  `LineaNueva = DatosRemision['lineas'][number]`.
- `useRemisiones(filtro: { estado?: EstadoRemision; zona?: string })` →
  `GET /api/remisiones`, clave `['remisiones', filtro]`.
- `useRemision(codigo: string)` → `GET /api/remisiones/{codigo}`, clave
  `['remision', codigo]`.
- `useExcedentes(acopioId: string | null)` → `GET /api/acopios/{id}/excedentes`, clave
  `['excedentes', acopioId]`, `enabled: acopioId !== null`.
- `useFoliosVinculables(codigo: string, activo: boolean)` →
  `GET /api/remisiones/{codigo}/folios-vinculables`, clave `['folios-vinculables', codigo]`.
- `useZonasVigentes()`: `GET /api/zonas` sin filtro, quedándose con las zonas cuya
  `emergenciaId` está en `useEmergenciasVigentes()`; clave `['zonas', 'vigentes']`.
  Devuelve `{ data: Zona[] | undefined, isPending, error }`.
- Mutaciones, todas con `ErrorApi`:
  - `useCrearRemision()` → `POST /api/remisiones` con `DatosRemision`; invalida
    `['remisiones']` y `['excedentes']`.
  - `useGuardarLineas(codigo)` → `PUT /api/remisiones/{codigo}/lineas` con
    `{ lineas: LineaNueva[] }`; invalida `['remision', codigo]`, `['remisiones']` y
    `['excedentes']`.
  - `useEditarRemision(codigo)` → `PATCH /api/remisiones/{codigo}` con
    `{ responsable?, zonaId? }`; invalida `['remision', codigo]` y `['remisiones']`.
  - `useDespachar(codigo)` → `POST /api/remisiones/{codigo}/despachar` con `{ folios }`;
    invalida `['remision', codigo]`, `['remisiones']` y `['excedentes']`.
  - `useCancelar(codigo)` → `POST /api/remisiones/{codigo}/cancelar` con `{ motivo }`;
    invalida las mismas tres.
- Funciones puras:
  - `topeLinea(excedente: Excedente | undefined, propia: number): number` = `(excedente?.movible ?? 0) + propia`, redondeado a milésimas (I2-08).
  - `urlRecepcion(qrToken: string): string` = `${window.location.origin}/consola/recepciones/qr/${qrToken}` (I2-04).
  - `urlEvidencia(codigo: string, n: number): string` = `${import.meta.env.VITE_API_URL || window.location.origin}/api/remisiones/${encodeURIComponent(codigo)}/evidencia/${n}` (I2-09).
  - `fechaDelEstado(r: Remision): string`: `despachadaEn` si está en tránsito,
    `recibidaEn` si está recibida, `canceladaEn` si está cancelada y `creadaEn` en borrador.
  - `NOMBRE_ESTADO: Record<EstadoRemision, string>` con los textos de las restricciones.
- `Qr({ texto, alt, className }: { texto: string; alt: string; className?: string })`: el
  `Qr` de `PasoFolio.tsx` movido a `componentes/`, con el texto y el `alt` como props.

- [ ] Pruebas primero en `remisiones.test.tsx`:
  - `useRemisiones({ estado: 'BORRADOR' })` pide `GET /api/remisiones?estado=BORRADOR`.
  - `useCrearRemision` manda `{ acopioId: 'a1', zonaId: null, responsable: null, lineas: [{ categoriaId: 'c1', cantidad: 12 }] }` (`cuerpoDe('POST /api/remisiones')`).
  - `useDespachar('R-2026-K4P7Q')` manda `{ folios: ['ACO-2026-AB12C'] }`.
  - `useZonasVigentes()` con dos zonas, una de una emergencia `ACTIVA` y otra de una
    `CERRADA`, devuelve solo la primera.
  - `topeLinea({ movible: 40 } as Excedente, 12)` da `52`; `topeLinea(undefined, 12)` da
    `12`; `topeLinea({ movible: 0.1 } as Excedente, 0.2)` da `0.3`.
  - `urlRecepcion('tok')` termina en `/consola/recepciones/qr/tok`.
  - `fechaDelEstado` de una remisión `EN_TRANSITO` devuelve su `despachadaEn`.
  - Verlas fallar (`cd apps/web && bunx vitest run src/api/remisiones.test.tsx`).
- [ ] Implementar siguiendo `api/motor.ts` (`desenvolver`, `useInvalidar`).
- [ ] Mover `Qr` a `componentes/Qr.tsx`; `PasoFolio.tsx` lo usa con
  `<Qr texto={folio} alt="Código QR del folio" className="h-48 w-48 self-center" />`.
  Las pruebas de `PasoFolio` siguen pasando sin cambios.
- [ ] En `red.ts`, quitar los dos `as unknown as` si el typecheck pasa sin ellos; si uno se
  necesita, dejarlo con un comentario que diga por qué.
- [ ] Anotar `Qr` en el catálogo de `patrones-y-practicas.md`.
- [ ] `bun run typecheck && bun run --filter @acopio/web test`. Sin commit (va con la tarea 8).

### Task 4: Rutas y «Más»

**Archivos:**
- Modificar: `apps/web/src/rutas.tsx`, `apps/web/src/rutas.test.tsx`,
  `apps/web/src/portal/Mas.tsx`, `apps/web/src/portal/Mas.test.tsx`,
  `apps/web/vite.config.ts` (si `PRECARGAS` lo pide para la lista)
- Crear, con solo su `Encabezado` para que las rutas carguen:
  `consola/remisiones/Remisiones.tsx`, `consola/remisiones/NuevaRemision.tsx`,
  `consola/remisiones/DetalleRemision.tsx`, `consola/remisiones/DocumentoRemision.tsx`

**Interfaces que consume:** `useRemisiones` (tarea 3).

**Qué hace:**
- Rutas con `lazy`, con `RequiereRol roles={['ADMIN', 'OPERADOR']}`:
  `consola/remisiones` → `Remisiones`, `consola/remisiones/nueva` → `NuevaRemision`,
  `consola/remisiones/:codigo` → `DetalleRemision` dentro de `MarcoPortal`, como las demás
  de la consola. `consola/remisiones/:codigo/documento` → `DocumentoRemision` **fuera** de
  `MarcoPortal` (I2-02), con el mismo `RequiereRol`. `nueva` se declara antes de `:codigo`.
- «Más», Administrador: herramienta «Remisiones» (`receipt_long`, «Traslados en borrador,
  en camino y recibidos»), rol `ADMIN`, después de «Motor de sugerencias».
- «Más», Operador: en la sección `MiAcopio` de `Mas.tsx`, después de «Salida», la fila
  «Remisiones» con `a="/consola/remisiones"` (I2-01). Un componente `FilaRemisiones` pide
  `useRemisiones({ estado: 'BORRADOR' })`. Con N > 0, `descripcion` es «N en borrador por
  despachar» («1 en borrador por despachar» en singular) y `distintivo` el número. Con 0,
  «Armar y despachar traslados» y sin distintivo. Mientras carga o si falla, la misma
  descripción que con 0: la fila nunca muestra un error.

- [ ] Pruebas primero: cada ruta carga su pantalla con `ADMIN` y con `OPERADOR`, y un
  `RECEPTOR` en `/consola/remisiones` ve el rechazo de `RequiereRol`; el documento se
  muestra sin la barra inferior; «Más» muestra «Remisiones» en «Administración» al `ADMIN`
  y no al `OPERADOR`; el `OPERADOR` con dos borradores ve en «Mi acopio» la fila
  «Remisiones» con «2 en borrador por despachar»; con `[]` ve «Armar y despachar traslados».
- [ ] `node scripts/iconos.mjs` en `apps/web` si `receipt_long` es nuevo.
- [ ] `bun run typecheck && bun run --filter @acopio/web test`.

### Task 5: Editor de líneas y nueva remisión

**Archivos:** `apps/web/src/consola/remisiones/EditorLineas.tsx`,
`consola/remisiones/CamposDestino.tsx`, `consola/remisiones/NuevaRemision.tsx` y sus pruebas
(`EditorLineas.test.tsx`, `NuevaRemision.test.tsx`)

**Interfaces que consume:** `useExcedentes`, `useZonasVigentes`, `useCrearRemision`,
`topeLinea`, `Excedente`, `LineaRemision`, `LineaNueva` (tarea 3); `useAcopiosGestion` de
`api/red.ts`; `useUbicacionActiva` de `sesion/ubicacion-activa.ts`.

**Interfaces que produce:**
- `EditorLineas({ acopioId, propias, error, alGuardar, etiqueta, ocupado })`:
  - `acopioId: string`; `propias: LineaRemision[]` (vacío en «nueva»);
  - `error: ErrorApi | null` (el de la mutación, para marcar la fila de
    `LINEA_EXCEDE_MOVIBLE`);
  - `alGuardar: (lineas: LineaNueva[]) => void`; `etiqueta: string` («Crear borrador» o
    «Guardar líneas»); `ocupado: boolean`.
  - Muestra una fila por categoría del excedente con `movible > 0`, más las de `propias`
    aunque ya no tengan movible. Cada fila: nombre, «Se pueden mandar {formatearCantidad(tope, unidad)}»,
    «Vence en N días» si `diasParaVencer` está entre 0 y 30, y un campo numérico con
    `max = tope` (enteros si la unidad es `UNIDAD`, hasta tres decimales si no). Arriba,
    un buscador por nombre.
  - El botón se activa con 1 a 40 líneas con cantidad > 0 y ninguna por encima de su tope.
    Por encima: «Pasa de lo que se puede mandar» junto al campo. Más de 40: «Una remisión
    lleva hasta 40 categorías».
  - Con `error.codigo === 'LINEA_EXCEDE_MOVIBLE'`, la fila de `detalles.categoriaId` dice
    «Hoy se pueden mandar hasta {maximo}» con «Usar {maximo}», que pone ese valor (foco 2).
- `CamposDestino({ valor, alCambiar, conAcopio })`: selector de acopio (solo si
  `conAcopio`), selector de destino con «Despacho general» primero y luego las zonas de
  `useZonasVigentes` («{nombre} · {municipio}»), y el campo «Responsable» (opcional, hasta
  120 caracteres). `valor: { acopioId: string | null; zonaId: string | null; responsable: string }`.

**Qué hace `NuevaRemision`** (vista «C12 · Nueva remisión» de la maqueta):
- Sin red: `NecesitaRed` «Las remisiones necesitan conexión».
- `Encabezado` «Nueva remisión», `volverA="/consola/remisiones"`.
- El Operador usa `activa.id` de `useUbicacionActiva` (sin selector de acopio); el
  Administrador elige el acopio de `useAcopiosGestion()` y hasta entonces el editor no se
  muestra.
- Sin nada movible: `EstadoVacio` «Este acopio no tiene excedente para mandar» con «El
  excedente aparece cuando el saldo pasa del máximo del umbral» (foco 5).
- Al crear: `POST` con `zonaId: null` para «Despacho general» y `responsable: null` si el
  campo quedó vacío; luego navega a `/consola/remisiones/{codigo}` y avisa «Se creó la
  remisión {codigo}».
- `ZONA_SOLO_LECTURA` (409) o `ZONA_NO_ENCONTRADA` (404): el `mensaje` de la API junto al
  selector de destino (foco 4).

**Datos de prueba:** excedente de Kennedy con arroz (`KILOGRAMO`, `movible: 440`,
`diasParaVencer: null`), agua (`LITRO`, `movible: 120`, `diasParaVencer: 12`) y aceite
(`LITRO`, `movible: 0`).

- [ ] Pruebas primero:
  - el editor muestra arroz y agua y no aceite; agua dice «Vence en 12 días»;
  - con 500 en arroz, «Pasa de lo que se puede mandar» y el botón desactivado;
  - en un borrador con arroz 40 como línea propia y `movible: 0`, la fila de arroz aparece
    con tope «40 kg» (`topeLinea` = 0 + 40);
  - el 422 `LINEA_EXCEDE_MOVIBLE` con `{ categoriaId: 'c-arroz', maximo: 300 }` muestra
    «Usar 300» y al tocarlo el campo queda en 300;
  - `NuevaRemision` como `OPERADOR` no muestra selector de acopio y como `ADMIN` sí;
  - crear con «Despacho general», sin responsable y arroz 12 manda
    `{ acopioId: 'a-kennedy', zonaId: null, responsable: null, lineas: [{ categoriaId: 'c-arroz', cantidad: 12 }] }`
    y navega al detalle de `R-2026-K4P7Q`;
  - el selector de destino no ofrece la zona de una emergencia `CERRADA`;
  - con todo en `movible: 0`, «Este acopio no tiene excedente para mandar»;
  - sin red, `NecesitaRed`; axe sin violaciones graves.
  - Verlas fallar.
- [ ] Implementar con `Campo`, `Selector`, `Boton`, `EstadoVacio`, `Esqueleto` y
  `EstadoError` de `componentes/`.
- [ ] `bun run typecheck && bun run --filter @acopio/web test`.

### Task 6: Detalle, despacho y cancelación

**Archivos:** `apps/web/src/consola/remisiones/DetalleRemision.tsx`,
`consola/remisiones/HojaDespachar.tsx`, `consola/remisiones/HojaCancelar.tsx` y
`DetalleRemision.test.tsx` (cubre las dos hojas)

**Interfaces que consume:** `useRemision`, `useGuardarLineas`, `useEditarRemision`,
`useDespachar`, `useCancelar`, `useFoliosVinculables`, `urlEvidencia`, `NOMBRE_ESTADO`
(tarea 3); `EditorLineas`, `CamposDestino` (tarea 5).

**Qué hace** (vistas «C12 · Borrador», «C12 · En tránsito», «C12 · Recibida»,
«C12 · Cancelada», «C12 · Despachar» y «C12 · Cancelar» de la maqueta):
- Sin red: `NecesitaRed`. Código que no existe (404): `EstadoError` «No encontramos la
  remisión {codigo}».
- Cabecera: código, `Pildora` del estado, «{acopio} → {zona o «Despacho general»}» y la
  fecha del estado.
- `BORRADOR`: `CamposDestino` sin acopio, que guarda con `PATCH` al tocar «Guardar
  destino»; `EditorLineas` con `propias = remision.lineas` y «Guardar líneas»; abajo,
  «Despachar» (primario) y «Cancelar remisión» (texto).
- `EN_TRANSITO`: líneas para leer, folios vinculados, `EnlaceBoton` «Imprimir documento» a
  `/consola/remisiones/{codigo}/documento` y «Cancelar remisión».
- `RECIBIDA`: líneas con «Planeado {p} · Recibido {r}», la nota de recepción o «Sin nota» y
  las fotos (`<img src={urlEvidencia(codigo, n)} alt="Foto {n+1} de la entrega">`, `n` de 0 a
  `evidencias − 1`).
- `CANCELADA`: el motivo entre comillas y la fecha.
- `HojaDespachar`: si falta responsable, el campo «Quién lleva el envío» (obligatorio; sin
  él el botón dice «Escribe quién lleva el envío» y no envía), y antes de despachar
  `PATCH { responsable }` (I2-07, foco 1). Folios de `useFoliosVinculables` como casillas
  («{folio} · {categorias.join(', ')} · conciliado {diaLargo(conciliadoEn)}»), hasta 20; sin
  folios, «No hay folios conciliados en este acopio. Puedes despachar sin vincular».
  Aviso: «Al despachar, estas cantidades salen del inventario del acopio». Botón
  «Despachar». Al terminar: se cierra y avisa «{codigo} va en camino».
- `HojaCancelar`: motivo de 10 a 280 caracteres (contados sin espacios al borde); en
  tránsito, el aviso «Lo despachado vuelve al inventario del acopio con un ajuste». Botón
  «Cancelar remisión» en rojo. Con menos de 10 caracteres no envía y dice «Escribe al
  menos 10 caracteres».
- Errores: 409 `REMISION_ESTADO_INVALIDO` en cualquier acción → «La remisión cambió
  mientras la editabas» con «Ver cómo quedó», que vuelve a pedir el detalle (foco 3).
  422 `FOLIO_NO_VINCULABLE` → el mensaje de la API en la hoja. 409 `ZONA_SOLO_LECTURA` →
  junto al selector (foco 4).

- [ ] Pruebas primero:
  - un borrador muestra «Despachar» y «Cancelar remisión» y no «Imprimir documento»; uno en
    tránsito muestra «Imprimir documento» y no «Despachar»; uno recibido no tiene acciones
    y muestra dos `<img>` con `evidencias: 2`, la primera con `src` terminado en
    `/evidencia/0`;
  - despachar sin responsable pide «Quién lleva el envío»; con «Pedro Gómez» manda primero
    `PATCH { responsable: 'Pedro Gómez' }` y después `POST …/despachar` con
    `{ folios: ['ACO-2026-AB12C'] }` (la casilla marcada);
  - cancelar con «corto» no envía; con «La vía a Mocoa está cerrada» manda ese motivo;
  - el 409 `REMISION_ESTADO_INVALIDO` al guardar líneas muestra «La remisión cambió
    mientras la editabas» y «Ver cómo quedó» vuelve a pedir `GET /api/remisiones/R-2026-K4P7Q`;
  - un 404 muestra «No encontramos la remisión R-2026-XXXXX»;
  - sin red, `NecesitaRed`; axe sin violaciones graves.
  - Verlas fallar.
- [ ] Implementar con `Hoja`, `Campo`, `Boton`, `EnlaceBoton`, `Pildora`, `Esqueleto` y
  `EstadoError`.
- [ ] `bun run typecheck && bun run --filter @acopio/web test`.

### Task 7: Lista de remisiones

**Archivos:** `apps/web/src/consola/remisiones/Remisiones.tsx`, `Remisiones.test.tsx`

**Interfaces que consume:** `useRemisiones`, `fechaDelEstado`, `NOMBRE_ESTADO` (tarea 3).

**Qué hace** (vista «C12 Remisiones»):
- Sin red: `NecesitaRed`.
- `Encabezado` «Remisiones», subtítulo «Traslados de tu acopio» para el Operador y «Todos
  los acopios» para el Administrador; `EnlaceBoton` «Nueva remisión» a
  `/consola/remisiones/nueva`.
- Chips de estado: «Borradores» (por defecto), «En tránsito», «Recibidas», «Canceladas». El
  selector de zona sale de las zonas de las remisiones del estado elegido, más «Despacho
  general» si alguna no tiene zona, sin otra consulta. El filtro vive en la URL
  (`?estado=&zona=`), así «Volver» desde el detalle lo conserva. «Despacho general» filtra
  en la web (`zona === null`), porque la API no tiene ese filtro.
- Cada fila es un enlace al detalle: código, `Pildora`, «{acopio} → {destino}»,
  «{n} categorías» y `haceCuanto(fechaDelEstado(r))`.
- Vacío: `EstadoVacio` «No hay remisiones en borrador» (con el estado que toque) y, en
  borradores, «Aprueba sugerencias en el motor o crea una remisión a mano».

- [ ] Pruebas primero: por defecto pide `?estado=BORRADOR`; «En tránsito» pide
  `?estado=EN_TRANSITO` y deja `estado=EN_TRANSITO` en la URL; una remisión sin zona dice
  «Despacho general» y el filtro «Despacho general» deja solo esa; la fila enlaza a
  `/consola/remisiones/R-2026-K4P7Q`; el Operador ve «Traslados de tu acopio»; vacío con su
  texto; axe sin violaciones graves. Verlas fallar.
- [ ] Implementar.
- [ ] `bun run typecheck && bun run --filter @acopio/web test`.

### Task 8: Documento imprimible

**Archivos:** `apps/web/src/consola/remisiones/DocumentoRemision.tsx`,
`DocumentoRemision.test.tsx`, `apps/web/src/estilos.css` para `@media print`

**Interfaces que consume:** `useRemision`, `urlRecepcion` (tarea 3); `Qr` (tarea 3).

**Qué hace** (vista «C12 Documento de remisión»):
- Página sin `MarcoPortal`. Arriba, solo en pantalla (`print:hidden`), «Volver a la
  remisión» e «Imprimir» (`window.print()`).
- Título «Remisión {codigo}», «Acopio de origen: {acopio}», «Destino: {zona o «Despacho
  general»}», «Responsable: {responsable}», «Despachada el {diaLargo(despachadaEn)}».
- Tabla de líneas: categoría, cantidad con `formatearCantidad`.
- «Folios vinculados: …» o la línea no aparece si no hay.
- `<Qr texto={urlRecepcion(qrToken)} alt="Código QR para recibir la remisión {codigo}" />` y
  el código en texto grande debajo.
- Dos espacios de firma: «Entrega» y «Recibe», cada uno con nombre, documento y firma.
- Solo para `EN_TRANSITO` y `RECIBIDA`. En `BORRADOR` o `CANCELADA`: `EstadoError` «Esta
  remisión no tiene documento: se imprime al despacharla».
- `@media print`: tamaño carta, márgenes de 15 mm, sin fondos de color.

- [ ] Pruebas primero: el documento de `R-2026-K4P7Q` en tránsito muestra el código, el
  acopio, «Despacho general» si no hay zona, «Arroz» y «440 kg», y la imagen con `alt`
  «Código QR para recibir la remisión R-2026-K4P7Q»; un borrador muestra «Esta remisión no
  tiene documento»; «Imprimir» llama a `window.print` (`vi.spyOn(window, 'print')`); axe
  sin violaciones graves. Verlas fallar.
- [ ] Implementar.
- [ ] Verificación completa y commit `web: C12 remisiones, documento con QR y aviso en «Más»`
  (tareas 3 a 8).

### Task 9: Recorrido y cierre del ciclo

**Archivos:**
- Crear: `apps/web/recorridos/consola-remisiones.mjs`
- Modificar: `docs/06-operacion/recorridos.md`, este plan (tabla de estado y estado
  `ejecutado`), `docs/03-diseno/stitch/C12-remisiones/README.md` (fila «Construida» y
  capturas `construida*.png`), `docs/03-diseno/stitch/README.md`,
  `docs/superpowers/specs/2026-10-06-bloque-4-motor-design.md` («Cambios al construir»,
  lo que cambie al construir el ciclo)

**Qué hace:** un recorrido en Chromium contra la API del Compose con el `seed:demo`, con la
misma estructura que `consola-motor.mjs` (`paso`, `revisar`, `api`), que sigue los pasos 4
y 6 del §1 de la especificación:
1. Entra como Administrador (`joseph@acopio.co`), abre C11, recalcula y aprueba una
   sugerencia de Kennedy; guarda el código de la remisión de la respuesta.
2. Entra como `operador2` (`brayan@acopio.co`, `demo-acopio-2026`). En «Más», «Mi acopio»
   muestra «Remisiones» con «N en borrador por despachar», N ≥ 1.
3. Abre ese borrador, cambia la cantidad de la línea, guarda y despacha con el
   responsable «Conductor de prueba» y el primer folio que ofrezca la hoja, si hay alguno.
   Comprueba en la API (`GET /api/remisiones/{codigo}`) que el estado es `EN_TRANSITO`, y en
   `GET /api/acopios/{id}/excedentes` que el saldo de esa categoría bajó exactamente en la
   cantidad despachada.
4. Abre el documento y comprueba que se ven el código y la imagen del QR.
5. Crea una remisión a mano como despacho general con una línea, la cancela con motivo y
   comprueba en la API que queda `CANCELADA`.
6. Capturas a 360 × 640 de la lista, el borrador, la hoja de despachar y el documento.
7. Al final corre `validacion-general.mjs` y `consola-motor.mjs`, para ver que el ciclo 1
   sigue igual.

- [ ] Escribir el recorrido y correrlo contra el Compose (`bun run servicios:todo`,
  `seed:demo`). El veredicto es el código de salida de cada script.
- [ ] Actualizar los documentos de la lista de archivos.
- [ ] Verificación completa (`lint`, `typecheck`, `depcruise`, `test`, `test:int`,
  `revisar-colores.sh`) y commit `web: recorrido de remisiones y cierre del ciclo 2`.
- [ ] Sacar el PR de borrador (`gh pr ready`), esperar el CI y comentar en #35 lo construido
  y lo que sigue (ciclo 3: C13, C20, «Mi zona» y la capa de P05).
