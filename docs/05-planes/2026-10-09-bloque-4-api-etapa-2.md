---
title: "Bloque 4 · Motor: API, etapa 2 · plan"
type: plan
tags: [plan, bloque-4]
estado: borrador
bloque: 4
actualizado: 2026-10-09
---

# Bloque 4 · Motor: API, etapa 2 · plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usar superpowers:subagent-driven-development
> (recomendada) o superpowers:executing-plans para ejecutar este plan tarea por tarea.
> Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** que una remisión aprobada o creada a mano se despache con sus salidas y su
QR, que el Receptor la confirme en la zona con una foto, que el Receptor reporte lo que
falta y el mapa público lo muestre, que el seguimiento de un folio diga «recibido en
destino», y que un simulador con semilla compare el motor con dos repartos ingenuos.

**Arquitectura:** `motor` se migra primero a DAO (ADR-0019), como pide la regla de
CLAUDE.md al tocar un módulo. El ciclo de vida de la remisión vive en una tabla de
transiciones en `packages/shared` (patrón State), que usan la API y después la web. Las
líneas de un borrador se arman y validan con un `PlanRemision` (patrón Builder) que
comparten aprobar, crear y editar. `inventario` sigue siendo el único que escribe en
`movimiento`: gana la salida de traslado, el ajuste de una cancelación y la recepción en
zona. El simulador es código puro en `shared` con un script que escribe el informe.

**Stack:** NestJS 11, Prisma 7.10 sobre PostgreSQL 16, nestjs-zod, Jest con `@swc/jest`,
supertest, sharp, `@aws-sdk/client-s3`.

**Especificación:** [2026-10-06-bloque-4-motor-design.md](../superpowers/specs/2026-10-06-bloque-4-motor-design.md),
§4, §6, §8 (punto 2 y 3), §9 y §13. Plan anterior:
[etapa 1](2026-10-06-bloque-4-api-etapa-1.md). Issue
[#46](https://github.com/Proyecto-IngSoftware/acopio/issues/46).

Las tablas de esta etapa ya existen desde la etapa 1 (`remision`, `linea_remision`,
`remision_comprobante`, `reporte_necesidad`), con sus `CHECK` y el disparador
`linea_remision_editable`. Esta etapa solo agrega dos disparadores (tarea 4).

## Restricciones globales

- Node 22 (`nvm use`), Bun 1.3 para instalar y correr scripts.
- TypeScript 6.0, NestJS 11, Prisma 7.10: no se suben (§11 del Bloque 0).
- Código, nombres y mensajes en español, con los términos del glosario (`remisión`,
  `zona`, `acopio`, `Receptor`).
- Acceso a datos por DAO (ADR-0019): en `motor`, después de la tarea 1, solo los
  `*.dao.ts` inyectan `PrismaService`. Los servicios abren la transacción con
  `Transacciones.ejecutar` y le pasan la `tx` a los DAO, a la bitácora y a
  `MovimientosService`. Ningún controlador importa un DAO.
- Toda escritura registra su evento en la bitácora dentro de la misma transacción
  (`BitacoraService.registrar(tx, …)`).
- Errores con `ErrorDominio(codigo, mensaje, estado, detalles?)`. Códigos nuevos de esta
  etapa (§6 de la especificación): `REMISION_ESTADO_INVALIDO` 409,
  `LINEA_EXCEDE_MOVIBLE` 422, `SIN_EVIDENCIA` 422, `ZONA_NO_ASIGNADA` 403, y
  `REMISION_NO_ENCONTRADA` 404.
- Solo `inventario` escribe en `movimiento`. `motor` le pide las `SALIDA` del despacho, los
  `AJUSTE` de una cancelación y las `RECEPCION` en zona.
- Candados: primero `motor:sugerencias` (solo aprobar, descartar y recalcular), después
  los de saldo `acopio:categoría` en orden de `categoria_id`. Despachar, cancelar y editar
  un borrador toman solo los de saldo, siempre ordenados.
- `motor` importa de `inventario`, `catalogo`, `acopios`, `comprobantes`,
  `almacenamiento` e `identidad`; nadie importa de `motor`.
- Las pruebas de integración corren contra el contenedor aparte
  (`PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439`), nunca contra la
  base del Compose. Cada suite crea sus categorías con `unico(...)` y filtra por ellas.
- Cada tarea va en su rama con su PR hacia `main` (P-051). Commits en español con el
  área al inicio y la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`;
  las verificaciones y el commit se encadenan con `&&`. Joseph revisa y fusiona con
  `--merge`, sin borrar la rama.
- Si cambia un endpoint: `bun run --filter @acopio/api openapi` y
  `bun run --filter @acopio/web api:tipos`, y se versionan los dos (tarea 11 los corre
  al final; cada tarea puede correrlos si lo necesita).

## Decisiones de este plan

La especificación deja estas cuatro abiertas. Las tomo así y Joseph las confirma al
revisar el plan.

| # | Decisión | Por qué |
|---|---|---|
| E2-01 | Una remisión acepta hasta 5 fotos de evidencia. La sexta responde 422 `EVIDENCIA_MAXIMA` | La especificación exige al menos una y no fija tope; sin tope, un Receptor podría subir cientos |
| E2-02 | `GET /publico/zonas-necesidad` no devuelve el nombre de la zona: solo un identificador, el centro redondeado, el radio y las necesidades | La especificación dice «sin población, déficit ni nombres». El identificador basta para que la web pinte cada círculo |
| E2-03 | El seguimiento del folio muestra de cada remisión vinculada su estado y sus fechas, sin código ni zona | El seguimiento es público por folio. El código de la remisión y su zona no le dicen nada al Donador y sí dicen a dónde va la mercancía |
| E2-04 | La evidencia se sirve con bytes desde la API (ADR-0017) y el puerto `Almacen` gana `leer`. La factura del Bloque 3 sigue con URL firmada hasta su propio cambio | ADR-0017 ya está aceptado pero no implementado; la evidencia nace con lo que dice el ADR y la factura se cambia aparte (queda en P-052) |

## Foco de revisión

Entradas que la especificación implica y que ninguna tarea cubriría sin pensarlo. Cada
una tiene su prueba en la tarea que la posee.

1. Editar las líneas de un borrador sin cambiar nada: la validación contra el movible
   tiene que sumar lo que el mismo borrador ya compromete, o un `PUT` idéntico al estado
   actual respondería 422 (tarea 5).
2. Despachar cuando el saldo bajó después de armar el borrador, por una salida manual: 409
   `SALDO_INSUFICIENTE`, ninguna `SALIDA` queda escrita y la remisión sigue en `BORRADOR`
   (tarea 6).
3. Dos Receptores de zonas distintas confirman a la vez el mismo despacho general: uno
   recibe 200 y el otro 409 `REMISION_ESTADO_INVALIDO`, y hay un solo juego de
   `RECEPCION` (tarea 7).
4. Cancelar en tránsito: el saldo del acopio vuelve, «en camino» de la zona baja en la
   ficha, y las sugerencias de esa remisión siguen `APROBADA` (tarea 6).
5. El endpoint público con una emergencia cerrada, un reporte resuelto y uno de hace 8
   días: nada de eso aparece, y las llaves de cada zona son exactamente
   `zonaId, centro, radioKm, necesidades` (tarea 8).

## Estado

| Tarea | Estado | Qué falta |
|---|---|---|
| 1 `motor` a DAO, con dos menores de la etapa 1 | ⬜ | |
| 2 Transiciones de la remisión y `distancia_max` en `shared` | ⬜ | |
| 3 Salida de traslado, ajuste de cancelación y recepción en `inventario` | ⬜ | |
| 4 Disparadores: sugerencia decidida y línea que cambia de remisión | ⬜ | |
| 5 Remisiones: crear, listar, ver y editar, con `PlanRemision` | ⬜ | |
| 6 Despachar con folios y cancelar | ⬜ | |
| 7 Evidencia y recepción en zona | ⬜ | |
| 8 Reportes de necesidad y capa pública | ⬜ | |
| 9 «Recibido en destino» en el seguimiento (RF-CMP-007) | ⬜ | |
| 10 Simulador con semilla | ⬜ | |
| 11 `seed:demo`, contrato, documentación y cierre | ⬜ | |

---

### Tarea 1: `motor` a DAO, con dos menores de la etapa 1

Sin cambio de comportamiento, salvo los dos menores. Las 27 suites de integración son la
red: tienen que pasar igual antes y después.

**Archivos:**
- Crear: `apps/api/src/modulos/motor/dao/sugerencia.dao.ts`,
  `apps/api/src/modulos/motor/dao/remision.dao.ts`,
  `apps/api/src/modulos/motor/dao/necesidad.dao.ts` (necesidad manual, canasta vigente,
  recibido, en camino y reportes),
  `apps/api/src/modulos/motor/dao/configuracion.dao.ts`,
  `apps/api/src/modulos/acopios/dao/zona.dao.ts`
- Modificar: `apps/api/src/modulos/motor/estado-motor.service.ts`,
  `sugerencias.service.ts`, `necesidad.service.ts`, `configuracion.service.ts`,
  `remisiones-borrador.service.ts`, `configuracion.ts` (queda solo con constantes; las
  consultas pasan a `configuracion.dao.ts`), `motor.module.ts`;
  `apps/api/src/modulos/acopios/dao/acopio.dao.ts`, `acopios.module.ts`;
  `apps/api/src/modulos/inventario/dao/movimiento.dao.ts`, `dao/umbral.dao.ts`,
  `dao/no-recibir.dao.ts`, `dao/saldo.dao.ts`, `inventario.module.ts`;
  `apps/api/src/modulos/acopios/acopios.service.ts` (menor a);
  `apps/api/.dependency-cruiser.cjs` (`MIGRADOS_A_DAO` gana `motor`)
- Prueba: `apps/api/src/pruebas-integracion/aprobar-sugerencia.int.test.ts` (menor a),
  `apps/api/src/pruebas-integracion/necesidad.int.test.ts` (menor g, vencidos)

**Interfaces:**
- Produce (los usan las tareas 5 a 9):
  - `RemisionDao`: `borradorDelPar(tx, acopioId, zonaId)`, `porCodigo(codigo, bd?)`,
    `porQr(token, bd?)`, `crear(tx, datos)`, `lineaDe(tx, remisionId, categoriaId)`,
    `crearLinea(tx, remisionId, categoriaId, cantidad)`,
    `cambiarLinea(tx, lineaId, cantidad)`, `reemplazarLineas(tx, remisionId, lineas)`,
    `cambiarSiEstado(tx, id, estado, data): Promise<number>`, `listar(filtro)`,
    `comprometidoPropio(tx, remisionId): Promise<Map<string, number>>`,
    `vincularFolios(tx, remisionId, comprobanteIds, usuarioId)`,
    `marcarRecibidas(tx, remisionId)`, `pendientesParaReceptor(zonaIds | null)`
  - `ZonaDao` (exportado por `acopios`): `conEmergencia(id, bd?)`,
    `activasConEmergencia(bd?)`, `paraPublico()`
  - `MovimientoDao.lotesPerecederos(acopioIds, categoriaIds, bd?)` (menor g)
- Consume: `Transacciones`, `ClienteBd`, los DAO de `inventario` y `catalogo`.

- [ ] **Paso 1: correr las suites del motor y anotar que pasan**

```bash
docker run -d --rm --name acopio-pg-pruebas -e POSTGRES_USER=acopio_owner \
  -e POSTGRES_PASSWORD=acopio -e POSTGRES_DB=postgres -p 127.0.0.1:5439:5432 postgres:16-alpine
cd apps/api && PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439 \
  bunx jest -c jest.int.config.cjs --runInBand src/pruebas-integracion/{necesidad,sugerencias,aprobar-sugerencia,configuracion-motor,zonas-poblacion,motor-rendimiento}.int.test.ts
```

Esperado: todas pasan. Es la línea base.

- [ ] **Paso 2: la prueba del menor a (estado del acopio dentro de la transacción)**

En `aprobar-sugerencia.int.test.ts`, una prueba nueva. Hoy `aprobar` llama a
`AcopiosService.exigirAbierto`, que lee con la conexión y no con la `tx`; la prueba no
puede provocar la carrera, así que fija el contrato: aprobar desde un acopio `CERRADO`
responde 409 y no crea remisión.

```ts
it('no aprueba desde un acopio cerrado después del recálculo', async () => {
  const { cat, sugerencias } = await escenario({ saldo: 50, necesidades: [[ZONA_A, 20]] });
  await a.prisma.acopio.update({ where: { id: ACOPIO_A }, data: { estado: 'CERRADO' } });
  try {
    const r = await aprobar(sugerencias[0]!.id).expect(409);
    expect(r.body.codigo).toBe('ACOPIO_CERRADO');
    const lineas = await a.prisma.lineaRemision.count({ where: { categoria_id: cat } });
    expect(lineas).toBe(0);
  } finally {
    await a.prisma.acopio.update({ where: { id: ACOPIO_A }, data: { estado: 'ACTIVO' } });
  }
});
```

`exigirAbierto` lanza `ACOPIO_CERRADO` con 409 (`acopios.service.ts`, al final de la
clase). Esta prueba ya puede pasar hoy; queda como red para el cambio del paso 6.

- [ ] **Paso 3: los DAO de `motor`**

Cada consulta se mueve tal cual desde el servicio donde está hoy. Ejemplo completo de
`remision.dao.ts`; los otros tres siguen la misma forma (constructor con
`PrismaService`, el `ClienteBd` como parámetro, sin reglas de negocio):

```ts
import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';
import type { EstadoRemision, Prisma } from '../../../generado/prisma/client';

export const CON_LINEAS = {
  acopio_origen: { select: { id: true, nombre: true } },
  zona_destino: { select: { id: true, nombre: true } },
  lineas: {
    include: { categoria: { select: { nombre: true, unidad_base: true } } },
    orderBy: { categoria_id: 'asc' },
  },
  comprobantes: { include: { comprobante: { select: { folio: true } } } },
} satisfies Prisma.RemisionInclude;

export type RemisionConLineas = Prisma.RemisionGetPayload<{ include: typeof CON_LINEAS }>;

/** La remisión con sus líneas y sus folios (ADR-0019). */
@Injectable()
export class RemisionDao {
  constructor(private readonly prisma: PrismaService) {}

  borradorDelPar(tx: ClienteBd, acopioId: string, zonaId: string | null) {
    return tx.remision.findFirst({
      where: { estado: 'BORRADOR', acopio_origen_id: acopioId, zona_destino_id: zonaId },
      orderBy: { creada_en: 'asc' },
      select: { id: true, codigo: true },
    });
  }

  porCodigo(codigo: string, bd: ClienteBd = this.prisma) {
    return bd.remision.findUnique({ where: { codigo }, include: CON_LINEAS });
  }

  porQr(token: string, bd: ClienteBd = this.prisma) {
    return bd.remision.findUnique({ where: { qr_token: token }, include: CON_LINEAS });
  }

  async codigoLibre(tx: ClienteBd, codigo: string) {
    return !(await tx.remision.findUnique({ where: { codigo }, select: { id: true } }));
  }

  crear(
    tx: ClienteBd,
    d: {
      codigo: string;
      acopioId: string;
      zonaId: string | null;
      qrToken: string;
      responsable?: string | null;
      usuarioId: string;
    },
  ) {
    return tx.remision.create({
      data: {
        codigo: d.codigo,
        acopio_origen_id: d.acopioId,
        zona_destino_id: d.zonaId,
        qr_token: d.qrToken,
        responsable: d.responsable ?? null,
        creada_por: d.usuarioId,
      },
      select: { id: true, codigo: true },
    });
  }

  lineaDe(tx: ClienteBd, remisionId: string, categoriaId: string) {
    return tx.lineaRemision.findUnique({
      where: { remision_id_categoria_id: { remision_id: remisionId, categoria_id: categoriaId } },
    });
  }

  crearLinea(tx: ClienteBd, remisionId: string, categoriaId: string, cantidad: number) {
    return tx.lineaRemision.create({
      data: { remision_id: remisionId, categoria_id: categoriaId, cantidad_planeada: cantidad },
    });
  }

  cambiarLinea(tx: ClienteBd, lineaId: string, cantidad: number) {
    return tx.lineaRemision.update({ where: { id: lineaId }, data: { cantidad_planeada: cantidad } });
  }

  /** Borra las líneas y crea las nuevas. El disparador lo permite solo en BORRADOR. */
  async reemplazarLineas(
    tx: ClienteBd,
    remisionId: string,
    lineas: { categoriaId: string; cantidad: number }[],
  ) {
    await tx.lineaRemision.deleteMany({ where: { remision_id: remisionId } });
    await tx.lineaRemision.createMany({
      data: lineas.map((l) => ({
        remision_id: remisionId,
        categoria_id: l.categoriaId,
        cantidad_planeada: l.cantidad,
      })),
    });
  }

  async cambiarSiEstado(
    tx: ClienteBd,
    id: string,
    estado: EstadoRemision,
    data: Prisma.RemisionUncheckedUpdateManyInput,
  ): Promise<number> {
    const { count } = await tx.remision.updateMany({ where: { id, estado }, data });
    return count;
  }

  /** Lo que este borrador ya compromete, por categoría: se suma al movible al editarlo. */
  async comprometidoPropio(tx: ClienteBd, remisionId: string) {
    const filas = await tx.lineaRemision.findMany({
      where: { remision_id: remisionId, remision: { estado: 'BORRADOR' } },
      select: { categoria_id: true, cantidad_planeada: true },
    });
    return new Map(filas.map((f) => [f.categoria_id, Number(f.cantidad_planeada)]));
  }

  vincularFolios(tx: ClienteBd, remisionId: string, comprobanteIds: string[], usuarioId: string) {
    return tx.remisionComprobante.createMany({
      data: comprobanteIds.map((id) => ({
        remision_id: remisionId,
        comprobante_id: id,
        vinculado_por: usuarioId,
      })),
    });
  }

  /** En la confirmación, lo recibido es lo planeado (RF-MOT-009, sin conteo). */
  async marcarRecibidas(tx: ClienteBd, remisionId: string) {
    await tx.$executeRaw`
      UPDATE linea_remision SET cantidad_recibida = cantidad_planeada
      WHERE remision_id = ${remisionId}::uuid`;
  }

  listar(filtro: {
    acopioIds: string[] | null;
    estado?: EstadoRemision;
    zonaId?: string;
  }) {
    return this.prisma.remision.findMany({
      where: {
        ...(filtro.acopioIds === null ? {} : { acopio_origen_id: { in: filtro.acopioIds } }),
        estado: filtro.estado,
        zona_destino_id: filtro.zonaId,
      },
      include: CON_LINEAS,
      orderBy: { creada_en: 'desc' },
      take: 200,
    });
  }

  /** EN_TRANSITO hacia esas zonas, más los despachos generales. null = todas. */
  pendientesParaReceptor(zonaIds: string[] | null) {
    return this.prisma.remision.findMany({
      where: {
        estado: 'EN_TRANSITO',
        ...(zonaIds === null
          ? {}
          : { OR: [{ zona_destino_id: { in: zonaIds } }, { zona_destino_id: null }] }),
      },
      include: CON_LINEAS,
      orderBy: { despachada_en: 'asc' },
    });
  }
}
```

`marcarRecibidas` usa SQL porque Prisma no deja asignar una columna a otra en un
`updateMany`. Antes de dar por bueno el `UPDATE`, confirmar que `motor_linea_editable`
(migración `20261007031405_bloque_4_motor`, líneas 285 a 307) permite ese cambio de
`cantidad_recibida` en `EN_TRANSITO`; si no, el paso 1 de la tarea 4 lo ajusta.

`sugerencia.dao.ts` recibe de `sugerencias.service.ts`: `buscarConCategoria(tx, id)`,
`descartadasDesde(tx, desde)`, `borrarPropuestas(tx)`, `crearRonda(tx, filas)`,
`decidirSiPropuesta(tx, id, data): Promise<number>`, `existe(tx, id)`,
`listar(filtro)` (con `INCLUIR_SUGERENCIA` y el orden de hoy) y
`descartadasEntre(desde?, hasta?)`.

`necesidad.dao.ts` recibe de `estado-motor.service.ts` las cuatro consultas de
`demandas` (canasta vigente, manuales, recibidos en la ventana, en camino) y de
`necesidad.service.ts` `reportesVigentes`, `ultimaManual` y `crearManual`. El helper
`uuids` va con ellas.

`configuracion.dao.ts` recibe `leerConfiguracion`, el `upsert` de `guardar` y
`bloquearMotor`. `configuracion.ts` queda con los tipos.

- [ ] **Paso 4: `ZonaDao` en `acopios` y lo que `motor` lee de `inventario`**

`acopios/dao/zona.dao.ts`:

```ts
import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';

/** Lecturas de `zona` que necesitan otros módulos (ADR-0019). */
@Injectable()
export class ZonaDao {
  constructor(private readonly prisma: PrismaService) {}

  conEmergencia(id: string, bd: ClienteBd = this.prisma) {
    return bd.zona.findUnique({ where: { id }, include: { emergencia: true } });
  }

  /** Las de emergencias ACTIVA o EN_SEGUIMIENTO, o las pedidas, con su horizonte. */
  paraMotor(bd: ClienteBd, zonaIds?: string[]) {
    return bd.zona.findMany({
      where: zonaIds
        ? { id: { in: zonaIds } }
        : { emergencia: { estado: { in: ['ACTIVA', 'EN_SEGUIMIENTO'] } } },
      include: { emergencia: { select: { horizonte_dias: true } } },
      orderBy: { nombre: 'asc' },
    });
  }

  /** Para el mapa público: sin población ni nombre (E2-02). */
  paraPublico() {
    return this.prisma.zona.findMany({
      where: { emergencia: { estado: { in: ['ACTIVA', 'EN_SEGUIMIENTO'] } } },
      select: { id: true, lat: true, lng: true },
    });
  }
}
```

`AcopioDao` gana `paraMotor(bd, acopioIds?)` con la consulta de
`EstadoMotorService.acopios`. `UmbralDao` gana `deVarios(acopioIds, categoriaIds?, bd?)`,
`SaldoDao` gana `deVarios(acopioIds, categoriaIds?, bd?)`, `NoRecibirDao` gana
`vigentesDeVarios(acopioIds, categoriaIds, hoy, bd?)`. `inventario` exporta además
`UmbralDao`, y `acopios` exporta `ZonaDao`.

- [ ] **Paso 5: menor g, lotes perecederos agregados en SQL**

Hoy `ofertas` lee todos los movimientos de las categorías perecederas de todos los
acopios en cada recálculo. `vencimientoEstimado` solo suma por fecha y resta lo
consumido, así que basta con esos totales:

```ts
/** Por acopio, categoría y lote: lo que entró con cada fecha y, aparte, lo que salió. */
lotesPerecederos(acopioIds: string[], categoriaIds: string[], bd: ClienteBd = this.prisma) {
  return bd.$queryRaw<
    { acopio_id: string; categoria_id: string; signo: number; vence_en: Date | null; total: Prisma.Decimal }[]
  >`
    SELECT acopio_id, categoria_id, signo,
           CASE WHEN signo = 1 AND tipo = 'ENTRADA' THEN vence_en END AS vence_en,
           SUM(cantidad) AS total
    FROM movimiento
    WHERE acopio_id IN (${Prisma.join(acopioIds.map((id) => Prisma.sql`${id}::uuid`))})
      AND categoria_id IN (${Prisma.join(categoriaIds.map((id) => Prisma.sql`${id}::uuid`))})
    GROUP BY 1, 2, 3, 4`;
}
```

En `EstadoMotorService.ofertas`, cada fila se pasa a `estadoAcopio` como un movimiento:
`{ tipo: f.signo === 1 && f.vence_en ? 'ENTRADA' : f.signo === 1 ? 'AJUSTE' : 'SALIDA', signo, cantidad: Number(f.total), venceEn }`.
Una `ENTRADA` sin fecha cae en el lote `null`, igual que antes.

Prueba: las de vencidos de `necesidad.int.test.ts` y `motor-rendimiento.int.test.ts`
tienen que pasar sin cambios. Se agrega una unitaria en
`packages/shared/src/motor/calculo.test.ts` que compara `vencimientoEstimado` sobre
movimientos sueltos y sobre sus totales por lote:

```ts
it('da lo mismo con los movimientos sueltos que con los totales por lote', () => {
  const sueltos = [
    { tipo: 'ENTRADA' as const, signo: 1 as const, cantidad: 3, venceEn: '2026-10-20' },
    { tipo: 'ENTRADA' as const, signo: 1 as const, cantidad: 2, venceEn: '2026-10-20' },
    { tipo: 'ENTRADA' as const, signo: 1 as const, cantidad: 4, venceEn: '2026-11-01' },
    { tipo: 'SALIDA' as const, signo: -1 as const, cantidad: 1.5, venceEn: null },
    { tipo: 'SALIDA' as const, signo: -1 as const, cantidad: 2, venceEn: null },
  ];
  const agregados = [
    { tipo: 'ENTRADA' as const, signo: 1 as const, cantidad: 5, venceEn: '2026-10-20' },
    { tipo: 'ENTRADA' as const, signo: 1 as const, cantidad: 4, venceEn: '2026-11-01' },
    { tipo: 'SALIDA' as const, signo: -1 as const, cantidad: 3.5, venceEn: null },
  ];
  expect(vencimientoEstimado(agregados)).toEqual(vencimientoEstimado(sueltos));
});
```

- [ ] **Paso 6: menor a, el estado del acopio dentro de la transacción**

`AcopiosService.exigirAbierto(id)` gana un segundo parámetro opcional
`bd: ClienteBd = this.prisma` y lee con él. `SugerenciasService.aprobar` lo llama con la
`tx`. Correr la prueba del paso 2.

- [ ] **Paso 7: servicios sin Prisma, módulo y regla**

`EstadoMotorService`, `SugerenciasService`, `NecesidadService`, `ConfiguracionService` y
`RemisionesBorradorService` inyectan los DAO y `Transacciones` en vez de
`PrismaService`. `motor.module.ts` registra los cuatro DAO nuevos. En
`.dependency-cruiser.cjs`:

```js
const MIGRADOS_A_DAO = ['inventario', 'comprobantes', 'motor', 'salud'];
```

- [ ] **Paso 8: verificar y abrir el PR**

```bash
cd /home/kali/acopio && bun run lint && bun run typecheck && bun run --filter @acopio/api depcruise \
  && bun run test && PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439 bun run test:int \
  && bash scripts/revisar-colores.sh && git add -A && git commit -m "Motor: acceso a datos por DAO (ADR-0019)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git push -u origin etapa2-motor-dao
```

Esperado: las 27 suites pasan con el mismo número de pruebas que en el paso 1, más las
dos nuevas. `ADR-0019` gana `motor` en «Alcance» y la nota de patrones lo nombra.

---

### Tarea 2: transiciones de la remisión y `distancia_max` en `shared`

**Archivos:**
- Crear: `packages/shared/src/motor/remision.ts`,
  `packages/shared/src/motor/remision.test.ts`
- Modificar: `packages/shared/src/motor/index.ts`, `packages/shared/src/motor/emparejar.ts`,
  `packages/shared/src/motor/emparejar.test.ts`

**Interfaces:**
- Produce: `type EstadoRemision = 'BORRADOR' | 'EN_TRANSITO' | 'RECIBIDA' | 'CANCELADA'`,
  `type AccionRemision = 'editar' | 'despachar' | 'cancelar' | 'subirEvidencia' | 'recibir'`,
  `TRANSICIONES_REMISION`, `puedeRemision(estado, accion): boolean`,
  `estadoTras(estado, accion): EstadoRemision`, `MAXIMO_EVIDENCIAS = 5`.

- [ ] **Paso 1: la prueba**

```ts
import { estadoTras, puedeRemision, TRANSICIONES_REMISION } from './remision.js';

describe('transiciones de la remisión', () => {
  it('solo un borrador se edita y se despacha', () => {
    expect(puedeRemision('BORRADOR', 'editar')).toBe(true);
    expect(puedeRemision('EN_TRANSITO', 'editar')).toBe(false);
    expect(puedeRemision('BORRADOR', 'despachar')).toBe(true);
    expect(puedeRemision('RECIBIDA', 'despachar')).toBe(false);
  });

  it('se cancela en borrador o en tránsito, nunca después', () => {
    expect(puedeRemision('BORRADOR', 'cancelar')).toBe(true);
    expect(puedeRemision('EN_TRANSITO', 'cancelar')).toBe(true);
    expect(puedeRemision('RECIBIDA', 'cancelar')).toBe(false);
    expect(puedeRemision('CANCELADA', 'cancelar')).toBe(false);
  });

  it('la evidencia y la recepción son de una remisión en tránsito', () => {
    expect(puedeRemision('EN_TRANSITO', 'subirEvidencia')).toBe(true);
    expect(puedeRemision('BORRADOR', 'recibir')).toBe(false);
  });

  it('dice a qué estado lleva cada acción', () => {
    expect(estadoTras('BORRADOR', 'despachar')).toBe('EN_TRANSITO');
    expect(estadoTras('EN_TRANSITO', 'recibir')).toBe('RECIBIDA');
    expect(estadoTras('EN_TRANSITO', 'cancelar')).toBe('CANCELADA');
    expect(estadoTras('BORRADOR', 'editar')).toBe('BORRADOR');
  });

  it('lanza si la acción no vale desde ese estado', () => {
    expect(() => estadoTras('RECIBIDA', 'cancelar')).toThrow();
  });

  it('cada acción tiene al menos un estado de origen', () => {
    for (const desde of Object.values(TRANSICIONES_REMISION)) expect(desde.origen.length).toBeGreaterThan(0);
  });
});
```

Las pruebas de `shared` corren con Jest y sus globales (`describe`, `it`, `expect` sin
import), como `calculo.test.ts`.

- [ ] **Paso 2: correrla y ver que falla**

```bash
cd packages/shared && bunx jest src/motor/remision.test.ts
```

Esperado: falla porque `./remision.js` no existe.

- [ ] **Paso 3: la tabla**

```ts
/** Ciclo de vida de la remisión (RF-MOT-008, M-07). La API y la web leen la misma tabla. */
export type EstadoRemision = 'BORRADOR' | 'EN_TRANSITO' | 'RECIBIDA' | 'CANCELADA';
export type AccionRemision = 'editar' | 'despachar' | 'cancelar' | 'subirEvidencia' | 'recibir';

export const TRANSICIONES_REMISION: Record<
  AccionRemision,
  { origen: readonly EstadoRemision[]; destino: EstadoRemision | null }
> = {
  editar: { origen: ['BORRADOR'], destino: null },
  despachar: { origen: ['BORRADOR'], destino: 'EN_TRANSITO' },
  cancelar: { origen: ['BORRADOR', 'EN_TRANSITO'], destino: 'CANCELADA' },
  subirEvidencia: { origen: ['EN_TRANSITO'], destino: null },
  recibir: { origen: ['EN_TRANSITO'], destino: 'RECIBIDA' },
};

/** Fotos de evidencia por remisión (E2-01). */
export const MAXIMO_EVIDENCIAS = 5;

export function puedeRemision(estado: EstadoRemision, accion: AccionRemision): boolean {
  return TRANSICIONES_REMISION[accion].origen.includes(estado);
}

/** El estado después de la acción; `destino` null quiere decir que no cambia. */
export function estadoTras(estado: EstadoRemision, accion: AccionRemision): EstadoRemision {
  if (!puedeRemision(estado, accion)) {
    throw new Error(`La acción ${accion} no vale desde ${estado}`);
  }
  return TRANSICIONES_REMISION[accion].destino ?? estado;
}
```

En `motor/index.ts`: `export * from './remision.js';`.

- [ ] **Paso 4: menor f, `distancia_max` solo con pares elegibles**

Prueba en `emparejar.test.ts`, con los constructores que ya tiene el archivo (`entrada`,
`demanda`, `oferta`; `cerca` queda a unos 5 km de `z1` y `lejos` a unos 50 km):

```ts
it('un par bloqueado por un descarte no estira distancia_max', () => {
  const base = entrada({
    zonas: [z1],
    demandas: [demanda('z1', 100)],
    ofertas: [oferta('cerca', 80), oferta('lejos', 80)],
  });
  const de = (r: ReturnType<typeof emparejar>) => r.find((x) => x.acopioId === 'cerca')!;
  const sinBloqueo = emparejar(base, PESOS_POR_DEFECTO, 5);
  const conBloqueo = emparejar(
    { ...base, bloqueados: new Set([clavePar('lejos', 'z1', 'agua')]) },
    PESOS_POR_DEFECTO,
    5,
  );
  // Con Lejos en la ronda, Cerca puntúa cerca de 0,9 en proximidad; sin él, es el único
  // par y su proximidad es 0 (§13 de la especificación)
  expect(de(sinBloqueo).desglose.proximidad).toBeGreaterThan(0.8);
  expect(de(conBloqueo).desglose.proximidad).toBe(0);
});

it('un acopio con movible menor que el mínimo no estira distancia_max', () => {
  const r = emparejar(
    entrada({ zonas: [z1], demandas: [demanda('z1', 100)], ofertas: [oferta('cerca', 80), oferta('lejos', 3)] }),
    PESOS_POR_DEFECTO,
    5,
  );
  expect(r).toHaveLength(1);
  expect(r[0]!.desglose.proximidad).toBe(0);
});
```

En `emparejar.ts`, el lazo de `distanciaMax` salta los pares que nunca podrían elegirse:

```ts
for (const d of entrada.demandas) {
  const z = zonas.get(d.zonaId);
  if (!z || d.necesidad - d.recibido - d.enCamino < minimo) continue;
  for (const o of entrada.ofertas) {
    const a = acopios.get(o.acopioId);
    if (!a || o.categoriaId !== d.categoriaId || o.movible < minimo) continue;
    if (bloqueados.has(clavePar(o.acopioId, d.zonaId, d.categoriaId))) continue;
    distanciaMax = Math.max(distanciaMax, km(a, z));
  }
}
```

- [ ] **Paso 5: correr `shared` entero, commit y PR**

```bash
cd /home/kali/acopio && bun run --filter @acopio/shared test && bun run lint && bun run typecheck \
  && git add -A && git commit -m "shared: transiciones de la remisión y distancia_max con pares elegibles

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git push -u origin etapa2-transiciones
```

---

### Tarea 3: salida de traslado, ajuste de cancelación y recepción en `inventario`

**Archivos:**
- Modificar: `apps/api/src/modulos/inventario/movimientos.service.ts`
- Prueba: `apps/api/src/pruebas-integracion/movimientos-remision.int.test.ts` (nueva)

**Interfaces:**
- Produce, todos dentro de la transacción de quien llama:
  - `salidaTrasladoEnTransaccion(tx, usuario, acopioId, d: { categoriaId: string; cantidad: number; remisionId: string; codigo: string }): Promise<{ fila: Movimiento; saldo: number }>`.
    Toma el candado, exige saldo (409 `SALDO_INSUFICIENTE`), crea la `SALIDA` con
    `motivo_salida: 'TRASLADO'`, `remision_id` y la nota `Remisión R-…`.
  - `ajusteCancelacionEnTransaccion(tx, usuario, acopioId, d: { categoriaId; cantidad; remisionId; codigo })`.
    Crea un `AJUSTE` positivo con el motivo `Cancelación de la remisión R-…`.
  - `registrarRecepcion(tx, usuario, zonaId, d: { categoriaId; cantidad; remisionId; ocurridoEn: Date })`.
    Crea la `RECEPCION` con `zona_id` y sin `acopio_id`; no toca el saldo.
- Consume: `MovimientoDao.crear`, `SaldoDao.bloquear`, `SaldoDao.cantidad`,
  `categoriaParaMovimiento`.

- [ ] **Paso 1: las pruebas**

```ts
import {
  ACOPIO_A,
  ADMIN,
  ZONA_A,
  crearAppPrueba,
  unico,
  type AppPrueba,
} from '../../test/app-prueba';
import { Transacciones } from '../comun/prisma/transacciones';
import { MovimientosService } from '../modulos/inventario/movimientos.service';

/** Los movimientos que pide una remisión (M-01, M-07). */
describe('movimientos de una remisión', () => {
  let a: AppPrueba;
  let mov: MovimientosService;
  let tx: Transacciones;
  let admin: { id: string; rol: 'ADMIN' };
  let cat: string;
  let remisionId: string;

  beforeAll(async () => {
    a = await crearAppPrueba();
    mov = a.app.get(MovimientosService);
    tx = a.app.get(Transacciones);
    const u = await a.prisma.usuario.findFirstOrThrow({ where: { username: ADMIN.username } });
    admin = { id: u.id, rol: 'ADMIN' };
    cat = (
      await a.prisma.categoria.create({
        data: { nombre: unico('Traslado '), grupo: 'ALIMENTOS', unidad_base: 'KILOGRAMO' },
      })
    ).id;
    await a.prisma.movimiento.create({
      data: {
        acopio_id: ACOPIO_A, categoria_id: cat, tipo: 'ENTRADA', signo: 1,
        cantidad: 30, usuario_id: admin.id, ocurrido_en: new Date(),
      },
    });
    remisionId = (
      await a.prisma.remision.create({
        data: {
          codigo: 'R-2026-TRSL2', acopio_origen_id: ACOPIO_A, zona_destino_id: ZONA_A,
          qr_token: unico('qr'), creada_por: admin.id,
        },
      })
    ).id;
  });
  afterAll(() => a.cerrar());

  const saldo = async () =>
    Number(
      (await a.prisma.saldo.findUnique({
        where: { acopio_id_categoria_id: { acopio_id: ACOPIO_A, categoria_id: cat } },
      }))?.cantidad ?? 0,
    );

  it('la salida de traslado baja el saldo y lleva la remisión', async () => {
    const r = await tx.ejecutar((t) =>
      mov.salidaTrasladoEnTransaccion(t, admin as never, ACOPIO_A, {
        categoriaId: cat, cantidad: 12, remisionId, codigo: 'R-2026-TRSL2',
      }),
    );
    expect(r.saldo).toBe(18);
    expect(r.fila.motivo_salida).toBe('TRASLADO');
    expect(r.fila.remision_id).toBe(remisionId);
    expect(r.fila.nota).toBe('Remisión R-2026-TRSL2');
  });

  it('no deja sacar más que el saldo', async () => {
    await expect(
      tx.ejecutar((t) =>
        mov.salidaTrasladoEnTransaccion(t, admin as never, ACOPIO_A, {
          categoriaId: cat, cantidad: 1000, remisionId, codigo: 'R-2026-TRSL2',
        }),
      ),
    ).rejects.toMatchObject({ codigo: 'SALDO_INSUFICIENTE' });
    expect(await saldo()).toBe(18);
  });

  it('el ajuste de la cancelación devuelve el saldo', async () => {
    await tx.ejecutar((t) =>
      mov.ajusteCancelacionEnTransaccion(t, admin as never, ACOPIO_A, {
        categoriaId: cat, cantidad: 12, remisionId, codigo: 'R-2026-TRSL2',
      }),
    );
    expect(await saldo()).toBe(30);
  });

  it('la recepción en zona no toca el saldo de ningún acopio', async () => {
    const antes = await saldo();
    const r = await tx.ejecutar((t) =>
      mov.registrarRecepcion(t, admin as never, ZONA_A, {
        categoriaId: cat, cantidad: 12, remisionId, ocurridoEn: new Date(),
      }),
    );
    expect(r.acopio_id).toBeNull();
    expect(r.zona_id).toBe(ZONA_A);
    expect(await saldo()).toBe(antes);
  });
});
```

Antes de escribirla: el código de la remisión debe cumplir
`^R-[0-9]{4}-[A-HJ-NP-Z2-9]{5}$` (el `CHECK` de la migración); `R-2026-TRSL2` lo cumple.
`ErrorDominio` expone `codigo`, `estado` (422 por defecto) y `detalles`
(`apps/api/src/comun/errores/error-dominio.ts`).

- [ ] **Paso 2: correrla y ver que falla**

```bash
cd apps/api && PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439 \
  bunx jest -c jest.int.config.cjs --runInBand src/pruebas-integracion/movimientos-remision.int.test.ts
```

Esperado: falla, los tres métodos no existen.

- [ ] **Paso 3: los métodos**

```ts
async salidaTrasladoEnTransaccion(
  tx: ClienteBd,
  usuario: UsuarioAutenticado,
  acopioId: string,
  d: { categoriaId: string; cantidad: number; remisionId: string; codigo: string },
): Promise<{ fila: Movimiento; saldo: number }> {
  const cat = await categoriaParaMovimiento(this.categorias, tx, d.categoriaId);
  exigirCantidad(d.cantidad, cat.unidad_base);
  const antes = await this.bloquearSaldo(tx, acopioId, d.categoriaId);
  if (d.cantidad > antes + 1e-9) throw saldoInsuficiente(antes);
  const nota = `Remisión ${d.codigo}`;
  const fila = await this.movimientos.crear(tx, {
    acopio_id: acopioId,
    categoria_id: d.categoriaId,
    tipo: 'SALIDA',
    signo: -1,
    cantidad: d.cantidad,
    motivo_salida: 'TRASLADO',
    nota,
    remision_id: d.remisionId,
    usuario_id: usuario.id,
    ocurrido_en: new Date(),
  });
  const saldo = await this.saldoDe(tx, acopioId, d.categoriaId);
  await this.bitacora.registrar(tx, {
    usuarioId: usuario.id,
    accion: 'movimiento.salida',
    entidad: 'movimiento',
    entidadId: fila.id,
    ubicacionId: acopioId,
    antes: { categoria: cat.nombre, saldo: antes },
    despues: { categoria: cat.nombre, cantidad: d.cantidad, motivo: 'TRASLADO', nota, saldo },
  });
  return { fila, saldo };
}

async ajusteCancelacionEnTransaccion(
  tx: ClienteBd,
  usuario: UsuarioAutenticado,
  acopioId: string,
  d: { categoriaId: string; cantidad: number; remisionId: string; codigo: string },
) {
  const cat = await categoriaParaMovimiento(this.categorias, tx, d.categoriaId);
  const antes = await this.bloquearSaldo(tx, acopioId, d.categoriaId);
  const motivo = `Cancelación de la remisión ${d.codigo}`;
  const fila = await this.movimientos.crear(tx, {
    acopio_id: acopioId,
    categoria_id: d.categoriaId,
    tipo: 'AJUSTE',
    signo: 1,
    cantidad: d.cantidad,
    motivo,
    remision_id: d.remisionId,
    usuario_id: usuario.id,
    ocurrido_en: new Date(),
  });
  const saldo = await this.saldoDe(tx, acopioId, d.categoriaId);
  await this.bitacora.registrar(tx, {
    usuarioId: usuario.id,
    accion: 'movimiento.ajuste',
    entidad: 'movimiento',
    entidadId: fila.id,
    ubicacionId: acopioId,
    destacado: true,
    antes: { categoria: cat.nombre, saldo: antes },
    despues: { categoria: cat.nombre, diferencia: d.cantidad, motivo, saldo },
  });
  return { fila, saldo };
}

/** RECEPCION en una zona (M-01, ADR-0018): sin acopio y sin saldo. */
async registrarRecepcion(
  tx: ClienteBd,
  usuario: UsuarioAutenticado,
  zonaId: string,
  d: { categoriaId: string; cantidad: number; remisionId: string; ocurridoEn: Date },
) {
  const cat = await categoriaParaMovimiento(this.categorias, tx, d.categoriaId);
  const fila = await this.movimientos.crear(tx, {
    zona_id: zonaId,
    categoria_id: d.categoriaId,
    tipo: 'RECEPCION',
    signo: 1,
    cantidad: d.cantidad,
    remision_id: d.remisionId,
    usuario_id: usuario.id,
    ocurrido_en: d.ocurridoEn,
  });
  await this.bitacora.registrar(tx, {
    usuarioId: usuario.id,
    accion: 'movimiento.recepcion',
    entidad: 'movimiento',
    entidadId: fila.id,
    ubicacionId: zonaId,
    despues: { categoria: cat.nombre, cantidad: d.cantidad },
  });
  return fila;
}
```

`categoriaParaMovimiento` rechaza una categoría archivada. En la recepción eso no debe
frenar la llegada de algo que ya salió: si una categoría se archivó con una remisión en
camino, `registrarRecepcion` lee la categoría con `this.categorias.paraMovimiento` y solo
exige que exista. Agregar esa variante y una línea en la prueba que archive la categoría
antes de recibir.

- [ ] **Paso 4: correr la prueba, todo `test:int` de inventario, commit y PR**

```bash
cd /home/kali/acopio/apps/api && PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439 \
  bunx jest -c jest.int.config.cjs --runInBand src/pruebas-integracion/{movimientos-remision,movimientos,saldos,concurrencia}.int.test.ts \
  && cd ../.. && bun run lint && bun run typecheck && git add -A \
  && git commit -m "Inventario: salida de traslado, ajuste de cancelación y recepción en zona

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git push -u origin etapa2-movimientos
```

---

### Tarea 4: disparadores para la sugerencia decidida y la línea que cambia de remisión

Menor b de la etapa 1.

**Archivos:**
- Crear: `prisma/migrations/20261010120000_bloque_4_etapa_2/migration.sql`
- Prueba: `apps/api/src/pruebas-integracion/base.int.test.ts` (los casos de datos del
  Bloque 4 están ahí; confirmar con `grep -n "sugerencia\|linea_remision" apps/api/src/pruebas-integracion/base.int.test.ts`)

- [ ] **Paso 1: leer los disparadores actuales**

```bash
sed -n 280,330p prisma/migrations/20261007031405_bloque_4_motor/migration.sql
```

Anotar el nombre exacto de las funciones (`motor_linea_editable`,
`motor_sugerencia_borrable`) y si `motor_linea_editable` ya deja cambiar
`cantidad_recibida` cuando la remisión está `EN_TRANSITO` (lo necesita la tarea 7).

- [ ] **Paso 2: las pruebas**

```ts
it('no deja cambiar una sugerencia ya decidida', async () => {
  const s = await crearSugerenciaDecidida(); // helper del archivo: APROBADA con remisión
  await expect(
    a.prisma.sugerencia.update({ where: { id: s.id }, data: { cantidad: 1 } }),
  ).rejects.toThrow(/sugerencia_decidida/);
});

it('no deja mover una línea a otra remisión', async () => {
  const { linea, otraRemision } = await dosBorradores(); // helper del archivo
  await expect(
    a.prisma.lineaRemision.update({ where: { id: linea.id }, data: { remision_id: otraRemision.id } }),
  ).rejects.toThrow(/linea_remision_fija/);
});
```

Los dos helpers se escriben en el archivo con `a.prisma`, como los casos del Bloque 4
que ya están. La sugerencia `APROBADA` necesita `remision_id` y `cantidad_aprobada > 0`
(`CHECK` de la etapa 1).

- [ ] **Paso 3: la migración**

```sql
-- Una sugerencia decidida no se edita: solo una PROPUESTA cambia (pasa a APROBADA o DESCARTADA)
CREATE FUNCTION motor_sugerencia_inmutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.estado <> 'PROPUESTA' THEN
    RAISE EXCEPTION 'sugerencia_decidida: la sugerencia % ya se decidió', OLD.id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER sugerencia_inmutable
  BEFORE UPDATE ON "sugerencia"
  FOR EACH ROW EXECUTE FUNCTION motor_sugerencia_inmutable();

-- Una línea no cambia de remisión ni de categoría
CREATE FUNCTION motor_linea_fija() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.remision_id <> OLD.remision_id OR NEW.categoria_id <> OLD.categoria_id THEN
    RAISE EXCEPTION 'linea_remision_fija: la línea % no cambia de remisión ni de categoría', OLD.id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER linea_remision_fija
  BEFORE UPDATE ON "linea_remision"
  FOR EACH ROW EXECUTE FUNCTION motor_linea_fija();
```

Si el paso 1 mostró que `motor_linea_editable` no deja escribir `cantidad_recibida` en
`EN_TRANSITO`, la misma migración la reemplaza con `CREATE OR REPLACE FUNCTION` y esa
excepción.

- [ ] **Paso 4: aplicar, correr y PR**

```bash
cd /home/kali/acopio && bun run --filter @acopio/api db:migrar \
  && cd apps/api && PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439 \
  bunx jest -c jest.int.config.cjs --runInBand src/pruebas-integracion/{base,aprobar-sugerencia,sugerencias}.int.test.ts \
  && cd ../.. && git add -A && git commit -m "Motor: una sugerencia decidida no cambia y una línea no cambia de remisión

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git push -u origin etapa2-disparadores
```

---

### Tarea 5: remisiones, crear, listar, ver y editar, con `PlanRemision`

**Archivos:**
- Crear: `apps/api/src/modulos/motor/plan-remision.ts` (Builder),
  `apps/api/src/modulos/motor/plan-remision.test.ts`,
  `apps/api/src/modulos/motor/remisiones.service.ts`,
  `apps/api/src/modulos/motor/remisiones.controller.ts`,
  `apps/api/src/pruebas-integracion/remisiones.int.test.ts`
- Modificar: `remisiones-borrador.service.ts` (usa `PlanRemision` y registra el antes y
  después de una línea que se suma, menor d), `sugerencias.service.ts` (tope entero en el
  409, menor c), `necesidad.service.ts` (cantidad entera en la necesidad manual de una
  categoría por unidades, menor e), `vistas.ts` (`aRemisionVista`), `motor.module.ts`,
  `apps/api/src/comun/respuestas.ts` (`RemisionDto`)

**Interfaces:**
- Consume: `RemisionDao` (tarea 1), `puedeRemision`/`estadoTras` (tarea 2),
  `EstadoMotorService.ofertas`.
- Produce:
  - `class PlanRemision` con `agregar(categoriaId, cantidad): this`,
    `validarContra(movible: Map<string, number>): this` (lanza 422 `LINEA_EXCEDE_MOVIBLE`
    con `{ categoriaId, maximo }`), `lineas(): { categoriaId: string; cantidad: number }[]`
    ordenadas por `categoriaId`.
  - `RemisionesService.exigirAccion(remision, accion)`: lanza 409
    `REMISION_ESTADO_INVALIDO` con `{ estado }`. La usan las tareas 6 y 7.
  - `RemisionesService.movibleDe(tx, acopioId, categoriaIds, remisionId?)`: el movible
    del momento más lo que ese borrador ya compromete.
  - Endpoints: `POST /remisiones`, `GET /remisiones`, `GET /remisiones/:codigo`,
    `PUT /remisiones/:codigo/lineas`, `PATCH /remisiones/:codigo`.

- [ ] **Paso 1: la unitaria del Builder**

```ts
import { PlanRemision } from './plan-remision';

describe('PlanRemision', () => {
  it('suma dos veces la misma categoría y ordena por categoría', () => {
    const p = new PlanRemision().agregar('b', 3).agregar('a', 2).agregar('b', 4);
    expect(p.lineas()).toEqual([
      { categoriaId: 'a', cantidad: 2 },
      { categoriaId: 'b', cantidad: 7 },
    ]);
  });

  it('rechaza una línea que supera el movible y dice cuánto cabe', () => {
    const p = new PlanRemision().agregar('a', 10);
    expect(() => p.validarContra(new Map([['a', 6]]))).toThrow(
      expect.objectContaining({ codigo: 'LINEA_EXCEDE_MOVIBLE', detalles: { categoriaId: 'a', maximo: 6 } }),
    );
  });

  it('una categoría sin movible tiene máximo 0', () => {
    expect(() => new PlanRemision().agregar('x', 1).validarContra(new Map())).toThrow(
      expect.objectContaining({ codigo: 'LINEA_EXCEDE_MOVIBLE' }),
    );
  });

  it('no acepta cantidades en cero o negativas', () => {
    expect(() => new PlanRemision().agregar('a', 0)).toThrow();
  });
});
```


- [ ] **Paso 2: el Builder**

```ts
import { ErrorDominio } from '../../comun/errores/error-dominio';

const r3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Builder de las líneas de una remisión en borrador. Junta lo que llega en varios pasos
 * (aprobar una sugerencia, crear a mano, reemplazar las líneas), suma lo repetido y valida
 * todo contra el movible antes de que el DAO escriba.
 */
export class PlanRemision {
  private readonly porCategoria = new Map<string, number>();

  agregar(categoriaId: string, cantidad: number): this {
    if (!(cantidad > 0)) throw new ErrorDominio('CANTIDAD_INVALIDA', 'La cantidad debe ser mayor que cero');
    this.porCategoria.set(categoriaId, r3((this.porCategoria.get(categoriaId) ?? 0) + cantidad));
    return this;
  }

  validarContra(movible: Map<string, number>): this {
    for (const [categoriaId, cantidad] of this.porCategoria) {
      const maximo = movible.get(categoriaId) ?? 0;
      if (cantidad > maximo + 1e-9) {
        throw new ErrorDominio(
          'LINEA_EXCEDE_MOVIBLE',
          `Una línea pide ${cantidad} y el acopio solo puede mandar ${maximo}`,
          422,
          { categoriaId, maximo },
        );
      }
    }
    return this;
  }

  lineas(): { categoriaId: string; cantidad: number }[] {
    return [...this.porCategoria]
      .sort(([x], [y]) => x.localeCompare(y))
      .map(([categoriaId, cantidad]) => ({ categoriaId, cantidad }));
  }
}
```

- [ ] **Paso 3: las pruebas de integración**

Un escenario por prueba: una categoría nueva con `unico`, saldo 40 en `ACOPIO_A` y umbral
0/0 (movible 40). Un Operador de `ACOPIO_A` creado con `crearUsuarioActivo(a, tokenAdmin,
{ rol: 'OPERADOR' })` y otro de `ACOPIO_B` con
`asignaciones: [{ tipo: 'ACOPIO', ubicacionId: ACOPIO_B }]`.

```ts
it('el Operador del origen crea una remisión con zona y sus líneas', async () => {
  const r = await post('/api/remisiones', operadorA, {
    acopioId: ACOPIO_A, zonaId: ZONA_A, responsable: 'Camión de la alcaldía',
    lineas: [{ categoriaId: cat, cantidad: 15 }],
  }).expect(201);
  expect(r.body.codigo).toMatch(/^R-\d{4}-[A-HJ-NP-Z2-9]{5}$/);
  expect(r.body.estado).toBe('BORRADOR');
  expect(r.body.lineas).toEqual([expect.objectContaining({ categoriaId: cat, cantidadPlaneada: 15 })]);
});

it('una línea mayor que el movible responde 422 con el máximo', async () => {
  const r = await post('/api/remisiones', operadorA, {
    acopioId: ACOPIO_A, zonaId: null, lineas: [{ categoriaId: cat, cantidad: 41 }],
  }).expect(422);
  expect(r.body.codigo).toBe('LINEA_EXCEDE_MOVIBLE');
});

it('el Operador de otro acopio no crea remisiones desde este', async () => {
  await post('/api/remisiones', operadorB, {
    acopioId: ACOPIO_A, zonaId: ZONA_A, lineas: [{ categoriaId: cat, cantidad: 1 }],
  }).expect(403);
});

it('reemplazar las líneas con las mismas cantidades no choca con su propio compromiso', async () => {
  const creada = await post('/api/remisiones', operadorA, {
    acopioId: ACOPIO_A, zonaId: ZONA_A, lineas: [{ categoriaId: cat, cantidad: 40 }],
  }).expect(201);
  await put(`/api/remisiones/${creada.body.codigo}/lineas`, operadorA, {
    lineas: [{ categoriaId: cat, cantidad: 40 }],
  }).expect(200);
});

it('fuera de BORRADOR no se editan las líneas', async () => {
  const creada = await crearYDespacharPorBase(); // pone el estado EN_TRANSITO con a.prisma
  const r = await put(`/api/remisiones/${creada.codigo}/lineas`, operadorA, {
    lineas: [{ categoriaId: cat, cantidad: 1 }],
  }).expect(409);
  expect(r.body).toMatchObject({ codigo: 'REMISION_ESTADO_INVALIDO', detalles: { estado: 'EN_TRANSITO' } });
});

it('PATCH cambia el responsable y la zona de un borrador y lo registra', async () => {
  const creada = await post('/api/remisiones', operadorA, {
    acopioId: ACOPIO_A, zonaId: null, lineas: [{ categoriaId: cat, cantidad: 1 }],
  }).expect(201);
  const r = await patch(`/api/remisiones/${creada.body.codigo}`, operadorA, {
    responsable: 'Moto de la Cruz Roja', zonaId: ZONA_A,
  }).expect(200);
  expect(r.body).toMatchObject({ responsable: 'Moto de la Cruz Roja', zona: { id: ZONA_A } });
  const b = await a.prisma.bitacora.findFirst({
    where: { accion: 'remision.editada', entidad_id: r.body.id },
  });
  expect(b).not.toBeNull();
});

it('GET /remisiones filtra por el alcance del Operador', async () => {
  const r = await get('/api/remisiones', operadorB).expect(200);
  expect(r.body.every((x: { acopio: { id: string } }) => x.acopio.id === ACOPIO_B)).toBe(true);
});
```

`post`, `put`, `patch` y `get` son atajos del archivo sobre `a.http()` con
`authorization: Bearer`. `bitacora` guarda `accion`, `entidad_id` y `ubicacion_id`.

Y en `aprobar-sugerencia.int.test.ts`, los menores c y d:

El helper `escenario` del archivo gana un parámetro `unidad` (por defecto
`KILOGRAMO`) que pasa a `unidad_base` al crear la categoría.

```ts
it('en una categoría por unidades, el máximo del 409 es entero', async () => {
  const { cat, sugerencias } = await escenario({ saldo: 20, necesidades: [[ZONA_A, 20]], unidad: 'UNIDAD' });
  // Un déficit de 7,6 en una categoría por unidades, como el que deja la canasta
  // (persona-día × población × días). Se inserta directo: la API ya no acepta 7,6 a mano
  await a.prisma.necesidadManual.create({
    data: { zona_id: ZONA_A, categoria_id: cat, cantidad: 7.6, motivo: 'Déficit fraccionario de la prueba', puesta_por: adminId },
  });
  const r = await aprobar(sugerencias[0]!.id, 20).expect(409);
  expect(r.body.codigo).toBe('SUGERENCIA_DESACTUALIZADA');
  expect(r.body.detalles.maximo).toBe(7);
  expect(r.body.mensaje).toContain('hasta 7.');
});

it('sumar a una línea existente deja el antes y el después en la bitácora', async () => {
  const { cat, sugerencias } = await escenario({ saldo: 50, necesidades: [[ZONA_A, 30]] });
  const primera = await aprobar(sugerencias[0]!.id, 10).expect(200);
  await motor.recalcular();
  const otra = await a.prisma.sugerencia.findFirstOrThrow({
    where: { categoria_id: cat, estado: 'PROPUESTA' },
  });
  await aprobar(otra.id, 5).expect(200);
  const b = await a.prisma.bitacora.findFirstOrThrow({
    where: { accion: 'remision.linea', entidad_id: primera.body.remision.id },
    orderBy: { ocurrido_en: 'desc' },
  });
  expect(b.antes).toMatchObject({ cantidad: 10 });
  expect(b.despues).toMatchObject({ cantidad: 15 });
});
```

`FiltroErrores` pone `detalles` en el cuerpo tal cual, y la fecha de `bitacora` es
`ocurrido_en`.

Y en `necesidad.int.test.ts`, el menor e: `PUT /api/zonas/:id/necesidad-manual/:cat`
con `cantidad: 10.5` en una categoría `UNIDAD` responde 400 `CANTIDAD_ENTERA`.

- [ ] **Paso 4: correr y ver que fallan**

```bash
cd apps/api && bunx jest src/modulos/motor/plan-remision.test.ts \
  && PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439 bunx jest -c jest.int.config.cjs --runInBand src/pruebas-integracion/remisiones.int.test.ts
```

Esperado: la unitaria pasa tras el paso 2; la de integración falla con 404 en
`POST /api/remisiones`.

- [ ] **Paso 5: el servicio**

```ts
@Injectable()
export class RemisionesService {
  constructor(
    private readonly transacciones: Transacciones,
    private readonly remisiones: RemisionDao,
    private readonly estado: EstadoMotorService,
    private readonly zonas: ZonaDao,
    private readonly alcance: AlcanceService,
    private readonly acopios: AcopiosService,
    private readonly bitacora: BitacoraService,
  ) {}

  exigirAccion(r: { estado: EstadoRemision }, accion: AccionRemision) {
    if (!puedeRemision(r.estado, accion)) {
      throw new ErrorDominio(
        'REMISION_ESTADO_INVALIDO',
        `Esta remisión está ${r.estado.toLowerCase().replace('_', ' ')}: no se puede ${VERBO[accion]}`,
        409,
        { estado: r.estado },
      );
    }
  }

  /** El movible de hoy, más lo que este borrador ya compromete (foco de revisión 1). */
  async movibleDe(tx: ClienteBd, acopioId: string, categoriaIds: string[], remisionId?: string) {
    for (const c of [...categoriaIds].sort()) await candadoSaldo(tx, acopioId, c);
    const acopios = await this.estado.acopios(tx, { acopioIds: [acopioId] });
    const ofertas = await this.estado.ofertas(tx, new Date(), acopios, categoriaIds);
    const propio = remisionId ? await this.remisiones.comprometidoPropio(tx, remisionId) : new Map();
    return new Map(categoriaIds.map((c) => [
      c,
      (ofertas.find((o) => o.categoriaId === c)?.movible ?? 0) + (propio.get(c) ?? 0),
    ]));
  }

  async crear(usuario: UsuarioAutenticado, d: {
    acopioId: string; zonaId: string | null; responsable?: string | null;
    lineas: { categoriaId: string; cantidad: number }[];
  }) {
    await this.alcance.exigir(usuario, 'ACOPIO', d.acopioId);
    await this.acopios.exigirAbierto(d.acopioId);
    if (d.zonaId) await this.exigirZonaAbierta(d.zonaId);
    const plan = d.lineas.reduce((p, l) => p.agregar(l.categoriaId, l.cantidad), new PlanRemision());
    return this.transacciones.ejecutar(async (tx) => {
      const lineas = plan.validarContra(
        await this.movibleDe(tx, d.acopioId, plan.lineas().map((l) => l.categoriaId)),
      ).lineas();
      const r = await this.nueva(tx, usuario, d.acopioId, d.zonaId, d.responsable ?? null);
      await this.remisiones.reemplazarLineas(tx, r.id, lineas);
      await this.bitacora.registrar(tx, {
        usuarioId: usuario.id, accion: 'remision.creada', entidad: 'remision', entidadId: r.id,
        ubicacionId: d.acopioId, despues: { codigo: r.codigo, zonaId: d.zonaId, lineas },
      });
      return aRemisionVista((await this.remisiones.porCodigo(r.codigo, tx))!);
    });
  }

  async reemplazarLineas(usuario: UsuarioAutenticado, codigo: string, nuevas: { categoriaId: string; cantidad: number }[]) {
    const r = await this.encontrar(codigo);
    await this.alcance.exigir(usuario, 'ACOPIO', r.acopio_origen_id);
    this.exigirAccion(r, 'editar');
    const plan = nuevas.reduce((p, l) => p.agregar(l.categoriaId, l.cantidad), new PlanRemision());
    return this.transacciones.ejecutar(async (tx) => {
      const categorias = plan.lineas().map((l) => l.categoriaId);
      const lineas = plan.validarContra(await this.movibleDe(tx, r.acopio_origen_id, categorias, r.id)).lineas();
      await this.remisiones.reemplazarLineas(tx, r.id, lineas);
      await this.bitacora.registrar(tx, {
        usuarioId: usuario.id, accion: 'remision.editada', entidad: 'remision', entidadId: r.id,
        ubicacionId: r.acopio_origen_id,
        antes: { lineas: r.lineas.map((l) => ({ categoriaId: l.categoria_id, cantidad: Number(l.cantidad_planeada) })) },
        despues: { lineas },
      });
      return aRemisionVista((await this.remisiones.porCodigo(codigo, tx))!);
    });
  }

  async editar(usuario: UsuarioAutenticado, codigo: string, d: { responsable?: string | null; zonaId?: string | null }) {
    const r = await this.encontrar(codigo);
    await this.alcance.exigir(usuario, 'ACOPIO', r.acopio_origen_id);
    this.exigirAccion(r, 'editar');
    if (d.zonaId) await this.exigirZonaAbierta(d.zonaId);
    return this.transacciones.ejecutar(async (tx) => {
      const cambios = {
        ...(d.responsable !== undefined ? { responsable: d.responsable?.trim() || null } : {}),
        ...(d.zonaId !== undefined ? { zona_destino_id: d.zonaId } : {}),
      };
      const cambiadas = await this.remisiones.cambiarSiEstado(tx, r.id, 'BORRADOR', cambios);
      if (cambiadas === 0) this.exigirAccion(await this.releer(tx, codigo), 'editar');
      await this.bitacora.registrar(tx, {
        usuarioId: usuario.id, accion: 'remision.editada', entidad: 'remision', entidadId: r.id,
        ubicacionId: r.acopio_origen_id,
        antes: { responsable: r.responsable, zonaId: r.zona_destino_id },
        despues: { responsable: cambios.responsable ?? r.responsable, zonaId: cambios.zona_destino_id ?? r.zona_destino_id },
      });
      return aRemisionVista((await this.remisiones.porCodigo(codigo, tx))!);
    });
  }

  async listar(usuario: UsuarioAutenticado, f: { estado?: EstadoRemision; zonaId?: string }) {
    const acopioIds = await this.alcance.idsAsignados(usuario, 'ACOPIO');
    return (await this.remisiones.listar({ acopioIds, ...f })).map(aRemisionVista);
  }

  async ver(usuario: UsuarioAutenticado, codigo: string) {
    const r = await this.encontrar(codigo);
    await this.alcance.exigir(usuario, 'ACOPIO', r.acopio_origen_id);
    return aRemisionVista(r);
  }

  /** 404 REMISION_NO_ENCONTRADA; `releer` hace lo mismo con la tx. */
  private async encontrar(codigo: string) {
    const r = await this.remisiones.porCodigo(codigo);
    if (!r) throw new ErrorDominio('REMISION_NO_ENCONTRADA', 'No encontramos esa remisión', 404);
    return r;
  }
}
```

`nueva(...)` es el código de `RemisionesBorradorService.agregarLinea` que genera el
código, busca uno libre con `remisiones.codigoLibre` y crea con `qr_token`
`randomBytes(18).toString('base64url')`; se mueve a `RemisionesService` y
`agregarLinea` lo llama. `exigirZonaAbierta` lee la zona con `ZonaDao.conEmergencia` y
lanza 409 `ZONA_SOLO_LECTURA` si la emergencia está `CERRADA`, con el mismo mensaje que
`NecesidadService.ponerManual`.

El controlador sigue a `sugerencias.controller.ts`: DTO con `createZodDto`,
`@Roles('ADMIN', 'OPERADOR')`, `@ApiTags('remisiones')`, el código como `@Param('codigo')`.
`lineas` con `z.array(...).min(1).max(40)` y `cantidadPositiva` de
`comun/validacion/cantidades`.

`RemisionesBorradorService.agregarLinea` pasa a construir un `PlanRemision` con la línea
existente más la nueva, y cuando suma a una línea registra `remision.linea` con
`antes: { categoria, cantidad }` y `despues: { categoria, cantidad }` (menor d).

En `aprobar`, el mensaje del 409 y `detalles.maximo` usan `Math.floor(maximo)` cuando la
categoría es por unidades (menor c). En `ponerManual`, `exigirCantidad(datos.cantidad, cat.unidad_base)`
cuando la cantidad no es null (menor e).

- [ ] **Paso 6: correr, contrato y PR**

```bash
cd /home/kali/acopio/apps/api && PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439 \
  bunx jest -c jest.int.config.cjs --runInBand src/pruebas-integracion/{remisiones,aprobar-sugerencia,necesidad}.int.test.ts \
  && cd ../.. && bun run lint && bun run typecheck && bun run --filter @acopio/api depcruise \
  && bun run --filter @acopio/api openapi && bun run --filter @acopio/web api:tipos \
  && git add -A && git commit -m "Motor: remisiones con PlanRemision, crear, listar, ver y editar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git push -u origin etapa2-remisiones
```

---

### Tarea 6: despachar con folios y cancelar

**Archivos:**
- Modificar: `remisiones.service.ts`, `remisiones.controller.ts`,
  `apps/api/src/modulos/comprobantes/comprobantes.module.ts` (exporta `ComprobanteDao`)
- Prueba: `apps/api/src/pruebas-integracion/despacho.int.test.ts` (nueva)

**Interfaces:**
- Consume: `MovimientosService.salidaTrasladoEnTransaccion` y
  `ajusteCancelacionEnTransaccion` (tarea 3), `RemisionDao.cambiarSiEstado` y
  `vincularFolios`, `ComprobanteDao.porFolio`, `normalizarFolio` de `comprobantes/folio`.
- Produce: `POST /remisiones/:codigo/despachar` con `{ folios?: string[] }` y
  `POST /remisiones/:codigo/cancelar` con `{ motivo }`.

- [ ] **Paso 1: las pruebas**

```ts
it('despachar crea una SALIDA por línea, baja el saldo y deja la remisión en tránsito', async () => {
  const r = await crearBorrador([{ categoriaId: cat, cantidad: 10 }], { responsable: 'Ana' });
  const d = await post(`/api/remisiones/${r.codigo}/despachar`, operadorA, {}).expect(200);
  expect(d.body.estado).toBe('EN_TRANSITO');
  const salidas = await a.prisma.movimiento.findMany({ where: { remision_id: r.id, tipo: 'SALIDA' } });
  expect(salidas).toHaveLength(1);
  expect(salidas[0]).toMatchObject({ motivo_salida: 'TRASLADO', nota: `Remisión ${r.codigo}` });
  expect(await saldo(cat)).toBe(30);
});

it('sin responsable no se despacha', async () => {
  const r = await crearBorrador([{ categoriaId: cat, cantidad: 1 }], { responsable: null });
  const d = await post(`/api/remisiones/${r.codigo}/despachar`, operadorA, {}).expect(422);
  expect(d.body.codigo).toBe('RESPONSABLE_OBLIGATORIO');
});

it('si el saldo bajó después del borrador, el despacho no escribe nada', async () => {
  const r = await crearBorrador([{ categoriaId: cat, cantidad: 30 }], { responsable: 'Ana' });
  await salidaManual(cat, 25); // por POST /api/acopios/:id/salidas con el Operador
  const d = await post(`/api/remisiones/${r.codigo}/despachar`, operadorA, {}).expect(409);
  expect(d.body.codigo).toBe('SALDO_INSUFICIENTE');
  expect(await a.prisma.movimiento.count({ where: { remision_id: r.id } })).toBe(0);
  expect((await a.prisma.remision.findUniqueOrThrow({ where: { id: r.id } })).estado).toBe('BORRADOR');
});

it('vincula folios conciliados del mismo acopio y rechaza los demás', async () => {
  const conciliado = await folioConciliado(ACOPIO_A); // helper con a.prisma, estado CONCILIADO
  const pendiente = await folioPendiente(ACOPIO_A);
  const r = await crearBorrador([{ categoriaId: cat, cantidad: 1 }], { responsable: 'Ana' });
  const mal = await post(`/api/remisiones/${r.codigo}/despachar`, operadorA, { folios: [pendiente] }).expect(422);
  expect(mal.body.codigo).toBe('FOLIO_NO_VINCULABLE');
  await post(`/api/remisiones/${r.codigo}/despachar`, operadorA, { folios: [conciliado] }).expect(200);
  expect(await a.prisma.remisionComprobante.count({ where: { remision_id: r.id } })).toBe(1);
});

it('cancelar un borrador libera el compromiso sin movimientos', async () => {
  const r = await crearBorrador([{ categoriaId: cat, cantidad: 10 }], { responsable: null });
  await post(`/api/remisiones/${r.codigo}/cancelar`, operadorA, { motivo: 'Se cayó el puente de la vía' }).expect(200);
  expect(await a.prisma.movimiento.count({ where: { remision_id: r.id } })).toBe(0);
  const exc = await get(`/api/acopios/${ACOPIO_A}/excedentes`, operadorA).expect(200);
  expect(exc.body.find((e: { categoriaId: string }) => e.categoriaId === cat).comprometido).toBe(0);
});

it('cancelar en tránsito devuelve el saldo y deja las sugerencias aprobadas', async () => {
  const { remision, sugerenciaId } = await aprobadaYDespachada(cat, 8); // aprueba por /api/sugerencias y despacha
  const antes = await saldo(cat);
  await post(`/api/remisiones/${remision.codigo}/cancelar`, operadorA, { motivo: 'El conductor no llegó al acopio' }).expect(200);
  expect(await saldo(cat)).toBe(antes + 8);
  const aj = await a.prisma.movimiento.findFirstOrThrow({ where: { remision_id: remision.id, tipo: 'AJUSTE' } });
  expect(aj.motivo).toBe(`Cancelación de la remisión ${remision.codigo}`);
  expect((await a.prisma.sugerencia.findUniqueOrThrow({ where: { id: sugerenciaId } })).estado).toBe('APROBADA');
  const ficha = await get(`/api/zonas/${ZONA_A}/necesidad`, admin).expect(200);
  expect(ficha.body.categorias.find((c: { categoriaId: string }) => c.categoriaId === cat).enCamino).toBe(0);
});

it('una remisión recibida no se cancela', async () => {
  const r = await recibidaPorBase(); // pone RECIBIDA con a.prisma y una evidencia
  const d = await post(`/api/remisiones/${r.codigo}/cancelar`, operadorA, { motivo: 'Ya no hace falta enviarla' }).expect(409);
  expect(d.body.codigo).toBe('REMISION_ESTADO_INVALIDO');
});

it('el motivo de cancelación tiene al menos 10 caracteres', async () => {
  const r = await crearBorrador([{ categoriaId: cat, cantidad: 1 }], { responsable: null });
  await post(`/api/remisiones/${r.codigo}/cancelar`, operadorA, { motivo: 'corto' }).expect(400);
});
```

`salidaManual(cat, n)` llama a `POST /api/acopios/${ACOPIO_A}/salidas` con el Operador y
`{ categoriaId, cantidad: n, motivoSalida: 'ENTREGA_FAMILIAS' }`.
Para `aprobadaYDespachada`, la ficha sale del recálculo con `SugerenciasService` como en
`aprobar-sugerencia.int.test.ts`.

- [ ] **Paso 2: correr y ver que fallan**

Esperado: 404 en `/despachar` y `/cancelar`.

- [ ] **Paso 3: despachar y cancelar**

```ts
async despachar(usuario: UsuarioAutenticado, codigo: string, folios: string[] = []) {
  const r = await this.encontrar(codigo);
  await this.alcance.exigir(usuario, 'ACOPIO', r.acopio_origen_id);
  this.exigirAccion(r, 'despachar');
  if (!r.responsable?.trim()) {
    throw new ErrorDominio('RESPONSABLE_OBLIGATORIO', 'Indica quién lleva el envío antes de despacharlo', 422);
  }
  const comprobantes = await this.foliosVinculables(r.acopio_origen_id, folios);
  return this.transacciones.ejecutar(async (tx) => {
    const ahora = new Date();
    const cambiadas = await this.remisiones.cambiarSiEstado(tx, r.id, 'BORRADOR', {
      estado: estadoTras('BORRADOR', 'despachar'),
      despachada_por: usuario.id,
      despachada_en: ahora,
    });
    if (cambiadas === 0) this.exigirAccion(await this.releer(tx, codigo), 'despachar');
    // Las líneas ya vienen ordenadas por categoría (CON_LINEAS): los candados se toman en orden
    for (const l of r.lineas) {
      await this.movimientos.salidaTrasladoEnTransaccion(tx, usuario, r.acopio_origen_id, {
        categoriaId: l.categoria_id, cantidad: Number(l.cantidad_planeada), remisionId: r.id, codigo: r.codigo,
      });
    }
    if (comprobantes.length) await this.remisiones.vincularFolios(tx, r.id, comprobantes, usuario.id);
    await this.bitacora.registrar(tx, {
      usuarioId: usuario.id, accion: 'remision.despachada', entidad: 'remision', entidadId: r.id,
      ubicacionId: r.acopio_origen_id,
      antes: { estado: 'BORRADOR' },
      despues: { estado: 'EN_TRANSITO', folios, responsable: r.responsable },
    });
    return aRemisionVista((await this.remisiones.porCodigo(codigo, tx))!);
  }, { timeout: 20_000, maxWait: 10_000 });
}

/** Solo folios CONCILIADO del mismo acopio (§6 de la especificación). */
private async foliosVinculables(acopioId: string, folios: string[]) {
  const ids: string[] = [];
  for (const texto of new Set(folios)) {
    const folio = normalizarFolio(texto);
    const c = folio ? await this.comprobantes.porFolio(folio) : null;
    if (!c || c.estado !== 'CONCILIADO' || c.acopio_id !== acopioId) {
      throw new ErrorDominio('FOLIO_NO_VINCULABLE', `El folio ${texto} no está conciliado en este acopio`, 422);
    }
    ids.push(c.id);
  }
  return ids;
}

async cancelar(usuario: UsuarioAutenticado, codigo: string, motivo: string) {
  const r = await this.encontrar(codigo);
  await this.alcance.exigir(usuario, 'ACOPIO', r.acopio_origen_id);
  this.exigirAccion(r, 'cancelar');
  const texto = motivo.trim();
  return this.transacciones.ejecutar(async (tx) => {
    const cambiadas = await this.remisiones.cambiarSiEstado(tx, r.id, r.estado, {
      estado: 'CANCELADA', cancelada_por: usuario.id, cancelada_en: new Date(), motivo_cancelacion: texto,
    });
    if (cambiadas === 0) this.exigirAccion(await this.releer(tx, codigo), 'cancelar');
    // M-07: en tránsito, la mercancía vuelve al acopio con un AJUSTE positivo por línea
    if (r.estado === 'EN_TRANSITO') {
      for (const l of r.lineas) {
        await this.movimientos.ajusteCancelacionEnTransaccion(tx, usuario, r.acopio_origen_id, {
          categoriaId: l.categoria_id, cantidad: Number(l.cantidad_planeada), remisionId: r.id, codigo: r.codigo,
        });
      }
    }
    await this.bitacora.registrar(tx, {
      usuarioId: usuario.id, accion: 'remision.cancelada', entidad: 'remision', entidadId: r.id,
      ubicacionId: r.acopio_origen_id, destacado: r.estado === 'EN_TRANSITO',
      antes: { estado: r.estado }, despues: { estado: 'CANCELADA', motivo: texto },
    });
    return aRemisionVista((await this.remisiones.porCodigo(codigo, tx))!);
  });
}
```

`encontrar` y `releer` son los de la tarea 5.

- [ ] **Paso 4: correr, contrato y PR**

Igual que el paso 6 de la tarea 5, con
`src/pruebas-integracion/{despacho,remisiones,movimientos-remision}.int.test.ts` y la
rama `etapa2-despacho`. Mensaje: `Motor: despachar con folios y cancelar remisiones`.

---

### Tarea 7: evidencia y recepción en zona

**Archivos:**
- Modificar: `apps/api/src/modulos/almacenamiento/almacen.ts` (`leer`),
  `almacen-s3.ts`, `almacen-memoria.ts`, `almacenamiento.service.ts` (`leerImagen`),
  `apps/api/src/modulos/almacenamiento/almacen-s3.test.ts`
- Crear: `apps/api/src/modulos/motor/recepciones.service.ts`,
  `apps/api/src/modulos/motor/recepciones.controller.ts`,
  `apps/api/src/pruebas-integracion/recepcion-zona.int.test.ts`

**Interfaces:**
- Consume: `MovimientosService.registrarRecepcion` (tarea 3),
  `RemisionDao.pendientesParaReceptor`, `porQr`, `marcarRecibidas`, `cambiarSiEstado`,
  `MAXIMO_EVIDENCIAS` (tarea 2), `AlcanceService.idsAsignados(usuario, 'ZONA')`.
- Produce: `Almacen.leer(clave): Promise<{ datos: Buffer; tipo: string }>`;
  `GET /recepciones`, `GET /recepciones/qr/:token`, `POST /remisiones/:codigo/evidencia`,
  `GET /remisiones/:codigo/evidencia/:n`, `POST /remisiones/:codigo/recibir`.

- [ ] **Paso 1: las pruebas**

Escenario: una remisión `EN_TRANSITO` con zona `ZONA_A` y otra general, despachadas con
el servicio de la tarea 6. Un Receptor de `ZONA_A` y otro de una segunda zona creada en
el archivo con `a.prisma.zona.create` (copiar los campos obligatorios de
`sembrarRed` en `test/app-prueba.ts`).

```ts
it('el Receptor ve lo que va a su zona y los despachos generales', async () => {
  const r = await get('/api/recepciones', receptorA).expect(200);
  const codigos = r.body.map((x: { codigo: string }) => x.codigo);
  expect(codigos).toEqual(expect.arrayContaining([conZona.codigo, general.codigo]));
  const otro = await get('/api/recepciones', receptorB).expect(200);
  expect(otro.body.map((x: { codigo: string }) => x.codigo)).not.toContain(conZona.codigo);
});

it('por QR, el Receptor de otra zona recibe 403 ZONA_NO_ASIGNADA', async () => {
  const r = await get(`/api/recepciones/qr/${conZona.qr_token}`, receptorB).expect(403);
  expect(r.body.codigo).toBe('ZONA_NO_ASIGNADA');
});

it('sin foto no se recibe', async () => {
  const r = await post(`/api/remisiones/${conZona.codigo}/recibir`, receptorA, {}).expect(422);
  expect(r.body.codigo).toBe('SIN_EVIDENCIA');
});

it('con foto, recibe: RECEPCION por línea, cantidad recibida = planeada, estado RECIBIDA', async () => {
  await subirFoto(conZona.codigo, receptorA).expect(200);
  await post(`/api/remisiones/${conZona.codigo}/recibir`, receptorA, { nota: 'Llegó una caja mojada' }).expect(200);
  const rem = await a.prisma.remision.findUniqueOrThrow({ where: { id: conZona.id }, include: { lineas: true } });
  expect(rem.estado).toBe('RECIBIDA');
  expect(rem.nota_recepcion).toBe('Llegó una caja mojada');
  expect(rem.lineas.every((l) => l.cantidad_recibida?.equals(l.cantidad_planeada))).toBe(true);
  const rec = await a.prisma.movimiento.findMany({ where: { remision_id: conZona.id, tipo: 'RECEPCION' } });
  expect(rec).toHaveLength(rem.lineas.length);
  expect(rec.every((m) => m.zona_id === ZONA_A && m.acopio_id === null)).toBe(true);
});

it('un despacho general toma la zona del Receptor; zonaId es obligatorio y debe ser suya', async () => {
  await subirFoto(general.codigo, receptorB).expect(200);
  await post(`/api/remisiones/${general.codigo}/recibir`, receptorB, {}).expect(400);
  await post(`/api/remisiones/${general.codigo}/recibir`, receptorB, { zonaId: ZONA_A }).expect(403);
  await post(`/api/remisiones/${general.codigo}/recibir`, receptorB, { zonaId: zonaB }).expect(200);
  const rem = await a.prisma.remision.findUniqueOrThrow({ where: { id: general.id } });
  expect(rem.zona_destino_id).toBe(zonaB);
});

it('dos Receptores confirman a la vez el mismo despacho general: uno gana', async () => {
  const g = await despachoGeneral(); // otro general en tránsito con una foto
  const [x, y] = await Promise.all([
    post(`/api/remisiones/${g.codigo}/recibir`, receptorA, { zonaId: ZONA_A }),
    post(`/api/remisiones/${g.codigo}/recibir`, receptorB, { zonaId: zonaB }),
  ]);
  expect([x.status, y.status].sort()).toEqual([200, 409]);
  expect(await a.prisma.movimiento.count({ where: { remision_id: g.id, tipo: 'RECEPCION' } })).toBe(g.lineas);
});

it('la sexta foto responde 422 EVIDENCIA_MAXIMA', async () => {
  const g = await despachoGeneral({ fotos: 0 });
  for (let i = 0; i < 5; i++) await subirFoto(g.codigo, receptorA).expect(200);
  const r = await subirFoto(g.codigo, receptorA).expect(422);
  expect(r.body.codigo).toBe('EVIDENCIA_MAXIMA');
});

it('la API sirve la foto con su tipo y sin caché; un Receptor ajeno no la ve', async () => {
  const r = await get(`/api/remisiones/${conZona.codigo}/evidencia/0`, receptorA).expect(200);
  expect(r.headers['content-type']).toBe('image/webp');
  expect(r.headers['cache-control']).toBe('private, no-store');
  await get(`/api/remisiones/${conZona.codigo}/evidencia/0`, receptorB).expect(403);
});
```

`subirFoto` usa `.attach('foto', jpeg, 'foto.jpg')` con el `jpeg` de sharp que arma
`facturas.int.test.ts`. En la prueba de la carrera, si el resultado es `[200, 200]`, el
`cambiarSiEstado` no está condicionado al estado.

- [ ] **Paso 2: `Almacen.leer`**

```ts
// almacen.ts
leer(clave: string): Promise<{ datos: Buffer; tipo: string }>;

// almacen-s3.ts
async leer(clave: string) {
  const r = await this.cliente.send(new GetObjectCommand({ Bucket: this.bucket, Key: clave }));
  return { datos: Buffer.from(await r.Body!.transformToByteArray()), tipo: r.ContentType ?? 'application/octet-stream' };
}

// almacen-memoria.ts
async leer(clave: string) {
  const o = this.objetos.get(clave);
  if (!o) throw new Error(`No existe ${clave}`);
  return o;
}
```

`AlmacenamientoService.leerImagen(clave)` lo envuelve. En `almacen-s3.test.ts`, una prueba
con el cliente simulado que ya usa el archivo (revisar cómo lo hace antes).

- [ ] **Paso 3: el servicio**

```ts
async recibir(usuario: UsuarioAutenticado, codigo: string, d: { zonaId?: string; nota?: string }) {
  const r = await this.encontrar(codigo);
  this.remisiones_.exigirAccion(r, 'recibir'); // RemisionesService de la tarea 5
  const zonaId = r.zona_destino_id ?? d.zonaId;
  if (!zonaId) throw new ErrorDominio('ZONA_OBLIGATORIA', 'Indica en qué zona lo recibes', 400);
  await this.exigirZonaPropia(usuario, zonaId);
  if (r.evidencia_keys.length === 0) {
    throw new ErrorDominio('SIN_EVIDENCIA', 'Sube al menos una foto de lo que llegó', 422);
  }
  return this.transacciones.ejecutar(async (tx) => {
    const ahora = new Date();
    const cambiadas = await this.dao.cambiarSiEstado(tx, r.id, 'EN_TRANSITO', {
      estado: 'RECIBIDA', zona_destino_id: zonaId, recibida_por: usuario.id, recibida_en: ahora,
      nota_recepcion: d.nota?.trim() || null,
    });
    if (cambiadas === 0) this.remisiones_.exigirAccion(await this.releer(tx, codigo), 'recibir');
    for (const l of r.lineas) {
      await this.movimientos.registrarRecepcion(tx, usuario, zonaId, {
        categoriaId: l.categoria_id, cantidad: Number(l.cantidad_planeada), remisionId: r.id, ocurridoEn: ahora,
      });
    }
    await this.dao.marcarRecibidas(tx, r.id);
    await this.bitacora.registrar(tx, {
      usuarioId: usuario.id, accion: 'remision.recibida', entidad: 'remision', entidadId: r.id,
      ubicacionId: zonaId, antes: { estado: 'EN_TRANSITO', zonaId: r.zona_destino_id },
      despues: { estado: 'RECIBIDA', zonaId, fotos: r.evidencia_keys.length },
      destacado: r.zona_destino_id === null,
    });
    return aRemisionVista((await this.dao.porCodigo(codigo, tx))!);
  });
}

/** El Receptor solo actúa en sus zonas (403 ZONA_NO_ASIGNADA). */
private async exigirZonaPropia(usuario: UsuarioAutenticado, zonaId: string) {
  const zonas = await this.alcance.idsAsignados(usuario, 'ZONA');
  if (zonas !== null && !zonas.includes(zonaId)) {
    throw new ErrorDominio('ZONA_NO_ASIGNADA', 'Esa zona no está asignada a tu cuenta', 403);
  }
}
```

La subida de evidencia guarda con `AlmacenamientoService.guardarImagen('remisiones/<id>', datos)`
y agrega la clave con `UPDATE remision SET evidencia_keys = array_append(...) WHERE id = $1
AND estado = 'EN_TRANSITO' AND cardinality(evidencia_keys) < 5` en un método nuevo de
`RemisionDao`, `agregarEvidencia(tx, id, clave): Promise<number>`; si devuelve 0, se
borra la foto subida y se responde 422 `EVIDENCIA_MAXIMA` o 409, según el estado leído.
La miniatura no se usa en la evidencia: se borra al guardar.

El controlador de la foto sigue a `facturas.controller.ts` (`FileInterceptor('foto', {
limits: { fileSize: TAMANO_MAXIMO + 1 } })`). `GET .../evidencia/:n` responde con
`StreamableFile` y los encabezados `Content-Type` y `Cache-Control: private, no-store`;
lo leen el Administrador, el Auditor, el Operador del acopio de origen (alcance
`ACOPIO`) y el Receptor de la zona (alcance `ZONA` sobre la zona de destino, o cualquier
Receptor mientras sea un despacho general en tránsito).

- [ ] **Paso 4: correr, contrato y PR**

Rama `etapa2-recepcion`, pruebas
`{recepcion-zona,despacho,facturas}.int.test.ts` y `almacen-s3.test.ts`. Mensaje:
`Motor: evidencia y recepción en zona`.

---

### Tarea 8: reportes de necesidad y capa pública

**Archivos:**
- Crear: `apps/api/src/modulos/motor/reportes.service.ts`,
  `apps/api/src/modulos/motor/reportes.controller.ts`,
  `apps/api/src/modulos/motor/publico.controller.ts`,
  `apps/api/src/pruebas-integracion/reportes-necesidad.int.test.ts`
- Modificar: `apps/api/src/modulos/motor/dao/necesidad.dao.ts` (`crearReportes`,
  `reportesDeZona`, `vigentesPublicos`), `motor.module.ts`

**Interfaces:**
- Consume: `ZonaDao.paraPublico` (tarea 1), `VIGENCIA_REPORTE_DIAS` y
  `RADIO_ZONA_PUBLICA_KM` de `shared`.
- Produce: `POST /zonas/:id/reportes`, `GET /zonas/:id/reportes`,
  `GET /publico/zonas-necesidad` (`@Publico()`).

- [ ] **Paso 1: las pruebas**

```ts
it('el Receptor reporta dos categorías con una nota y queda en la bitácora', async () => {
  await post(`/api/zonas/${ZONA_A}/reportes`, receptorA, {
    categorias: [panales, agua], nota: 'Hay 12 bebés en el coliseo', resuelta: false,
  }).expect(201);
  const r = await get(`/api/zonas/${ZONA_A}/reportes`, receptorA).expect(200);
  expect(r.body.map((x: { categoriaId: string }) => x.categoriaId)).toEqual(expect.arrayContaining([panales, agua]));
  expect(await a.prisma.bitacora.count({ where: { accion: 'reporte.necesidad', ubicacion_id: ZONA_A } })).toBeGreaterThanOrEqual(1);
});

it('un Receptor no reporta en una zona ajena', async () => {
  const r = await post(`/api/zonas/${ZONA_A}/reportes`, receptorB, { categorias: [agua], resuelta: false }).expect(403);
  expect(r.body.codigo).toBe('ZONA_NO_ASIGNADA');
});

it('el público ve el círculo redondeado y la necesidad, y nada más', async () => {
  const r = await a.http().get('/api/publico/zonas-necesidad').expect(200);
  const z = r.body.find((x: { zonaId: string }) => x.zonaId === ZONA_A);
  expect(Object.keys(z).sort()).toEqual(['centro', 'necesidades', 'radioKm', 'zonaId']);
  expect(z.radioKm).toBe(3);
  expect(Number.isInteger(z.centro.lat * 100)).toBe(true);
  expect(z.necesidades[0]).toEqual({
    categoria: expect.any(String), nota: 'Hay 12 bebés en el coliseo', reportadoEn: expect.any(String),
  });
});

it('un reporte resuelto o de hace 8 días no se publica', async () => {
  await post(`/api/zonas/${ZONA_A}/reportes`, receptorA, { categorias: [panales], resuelta: true }).expect(201);
  await a.prisma.reporteNecesidad.create({
    data: {
      zona_id: ZONA_A, categoria_id: jabon, reportado_por: receptorAId, nota: 'Viejo',
      reportado_en: new Date(Date.now() - 8 * 86_400_000),
    },
  });
  const r = await a.http().get('/api/publico/zonas-necesidad').expect(200);
  const z = r.body.find((x: { zonaId: string }) => x.zonaId === ZONA_A);
  const nombres = z.necesidades.map((n: { categoria: string }) => n.categoria);
  expect(nombres).not.toContain(nombrePanales);
  expect(nombres).not.toContain(nombreJabon);
});

it('una zona de una emergencia cerrada no aparece', async () => {
  const cerrada = await zonaDeEmergenciaCerrada(); // con a.prisma
  const r = await a.http().get('/api/publico/zonas-necesidad').expect(200);
  expect(r.body.map((x: { zonaId: string }) => x.zonaId)).not.toContain(cerrada);
});
```

- [ ] **Paso 2: el servicio y la consulta pública**

`ReportesService.reportar(usuario, zonaId, { categorias, nota, resuelta })` exige la zona
propia (mismo `exigirZonaPropia` de la tarea 7, que pasa a un helper compartido en
`motor/alcance-zona.ts`), crea una fila por categoría en una transacción y registra una
entrada `reporte.necesidad` por categoría. La nota se recorta y admite hasta 280
caracteres; el DTO avisa en su descripción que es pública.

`NecesidadDao.vigentesPublicos(ahora)`: el último reporte de cada zona y categoría, con
la misma consulta `DISTINCT ON` de `reportesVigentes` pero para todas las zonas de
`ZonaDao.paraPublico()`, sin `reportado_por`.

```ts
@Publico()
@Get('publico/zonas-necesidad')
@ApiOkResponse({ type: ZonaPublicaDto, isArray: true })
async zonas() {
  const [zonas, reportes] = await Promise.all([this.zonasDao.paraPublico(), this.reportes.vigentesPublicos(new Date())]);
  const redondo = (n: number) => Math.round(n * 100) / 100;
  return zonas.map((z) => ({
    zonaId: z.id,
    centro: { lat: redondo(Number(z.lat)), lng: redondo(Number(z.lng)) },
    radioKm: RADIO_ZONA_PUBLICA_KM,
    necesidades: reportes
      .filter((r) => r.zona_id === z.id)
      .map((r) => ({ categoria: r.categoria, nota: r.nota, reportadoEn: r.reportado_en })),
  }));
}
```

Como el controlador no puede usar un DAO, la consulta va en un método de
`ReportesService` (`capaPublica()`), y el controlador lo llama.

- [ ] **Paso 3: correr, contrato y PR**

Rama `etapa2-reportes`. Mensaje: `Motor: reportes de necesidad y capa pública de zonas`.

---

### Tarea 9: «recibido en destino» en el seguimiento (RF-CMP-007)

**Archivos:**
- Modificar: `apps/api/src/modulos/comprobantes/dao/comprobante.dao.ts`
  (`paraSeguimiento` incluye las remisiones), `seguimiento.service.ts`,
  `apps/api/src/comun/respuestas.ts` (`SeguimientoDto`)
- Prueba: `apps/api/src/pruebas-integracion/seguimiento.int.test.ts`

**Interfaces:**
- Produce: la respuesta del seguimiento gana `recibidoEnDestino: boolean`,
  `remisiones: { estado: 'EN_TRANSITO' | 'RECIBIDA'; despachadaEn: string; recibidaEn: string | null }[]`
  y `parteDeTuDonacion: boolean` (más de una remisión). Un paso nuevo
  `{ paso: 'RECIBIDA_EN_DESTINO', en }` con la primera `recibida_en`.

- [ ] **Paso 1: la prueba**

```ts
it('un folio vinculado a una remisión recibida dice «recibido en destino»', async () => {
  const folio = await folioConciliadoVinculadoA(remisionRecibida); // helper con a.prisma
  const r = await a.http().get(`/api/seguimiento/${folio}`).expect(200);
  expect(r.body.recibidoEnDestino).toBe(true);
  expect(r.body.pasos.at(-1)).toMatchObject({ paso: 'RECIBIDA_EN_DESTINO' });
  expect(r.body.remisiones).toEqual([{ estado: 'RECIBIDA', despachadaEn: expect.any(String), recibidaEn: expect.any(String) }]);
  expect(JSON.stringify(r.body)).not.toMatch(/R-\d{4}-/);
});

it('con dos remisiones avisa que es parte de la donación', async () => {
  const folio = await folioConciliadoVinculadoA(remisionRecibida);
  await vincular(folio, remisionEnTransito); // inserta en remision_comprobante con a.prisma
  const r = await a.http().get(`/api/seguimiento/${folio}`).expect(200);
  expect(r.body.parteDeTuDonacion).toBe(true);
  expect(r.body.remisiones.map((x: { estado: string }) => x.estado).sort()).toEqual(['EN_TRANSITO', 'RECIBIDA']);
});

it('una remisión cancelada no aparece en el seguimiento', async () => {
  const folio = await folioConciliadoVinculadoA(remisionCancelada);
  const r = await a.http().get(`/api/seguimiento/${folio}`).expect(200);
  expect(r.body.remisiones).toEqual([]);
  expect(r.body.recibidoEnDestino).toBe(false);
  expect(r.body.parteDeTuDonacion).toBe(false);
});
```

La ruta es `GET /api/seguimiento/:folio` (`seguimiento.controller.ts`). Las tres
remisiones (`remisionRecibida`, `remisionEnTransito`, `remisionCancelada`) se crean en el
`beforeAll` con `a.prisma`; la recibida necesita `zona_destino_id`, `recibida_en` y una
clave en `evidencia_keys` por el `CHECK`, y la cancelada un motivo de 10 caracteres.

- [ ] **Paso 2: la consulta y la respuesta**

En `ComprobanteDao.paraSeguimiento`, dentro del `select`:

```ts
remisiones: {
  where: { remision: { estado: { in: ['EN_TRANSITO', 'RECIBIDA'] } } },
  select: { remision: { select: { estado: true, despachada_en: true, recibida_en: true } } },
  orderBy: { vinculado_en: 'asc' },
},
```

`comprobantes` lee `remision` por la relación del agregado del comprobante, sin importar
nada de `motor` (que sí importa a `comprobantes`): la tabla de dependencias no cambia.
`SeguimientoService` arma los campos nuevos (E2-03).

- [ ] **Paso 3: correr, contrato y PR**

Rama `etapa2-destino`. Mensaje: `Comprobantes: recibido en destino en el seguimiento (RF-CMP-007)`.

---

### Tarea 10: simulador con semilla

**Archivos:**
- Crear: `packages/shared/src/motor/simulador.ts`, `simulador.test.ts`,
  `apps/api/src/scripts/simular.ts`,
  `docs/03-diseno/motor/simulacion.md` (lo escribe el script)
- Modificar: `packages/shared/src/motor/index.ts`, `apps/api/package.json` (script
  `simular`)

**Interfaces:**
- Produce: `simular({ semilla, zonas, acopios, categorias, dias }): InformeSimulacion` con
  tres estrategias (`motor`, `igualitario`, `cercania`) y, para cada una,
  `desviacionCobertura` (desviación estándar de la cobertura entre zonas) y
  `proporcionVencida` (insumo vencido sobre insumo total).

- [ ] **Paso 1: las pruebas**

```ts
import { simular } from './simulador.js';

const base = { zonas: 8, acopios: 4, categorias: 5, dias: 14 };

describe('simulador', () => {
  it('misma semilla, mismo informe', () => {
    expect(simular({ semilla: 42, ...base })).toEqual(simular({ semilla: 42, ...base }));
  });

  it('otra semilla da otro informe', () => {
    expect(simular({ semilla: 7, ...base })).not.toEqual(simular({ semilla: 42, ...base }));
  });

  it('informa las tres estrategias con números entre 0 y 1', () => {
    const r = simular({ semilla: 42, ...base });
    expect(Object.keys(r.estrategias).sort()).toEqual(['cercania', 'igualitario', 'motor']);
    for (const e of Object.values(r.estrategias)) {
      expect(e.proporcionVencida).toBeGreaterThanOrEqual(0);
      expect(e.proporcionVencida).toBeLessThanOrEqual(1);
      expect(e.desviacionCobertura).toBeGreaterThanOrEqual(0);
    }
  });
});
```

- [ ] **Paso 2: el simulador**

Generador con semilla (mulberry32, sin dependencias):

```ts
export function generador(semilla: number) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

Cada día del escenario: los acopios reciben entradas al azar con vencimientos a 3 a 30
días, cada estrategia reparte el movible hacia las zonas, las zonas consumen su
necesidad diaria y el inventario que pasa su fecha se cuenta como vencido. `motor` usa
`emparejar` con `PESOS_POR_DEFECTO`; `igualitario` divide el movible de cada acopio en
partes iguales entre las zonas con déficit; `cercania` manda todo al par más cercano con
déficit. Las tres parten del mismo escenario generado con la misma semilla. Todo en
funciones puras: nada de `Date.now()` ni `Math.random()`.

- [ ] **Paso 3: el script**

`apps/api/src/scripts/simular.ts` lee `--semilla` (por defecto 42), corre `simular` con
50 zonas, 20 acopios, 40 categorías y 30 días, y escribe
`docs/03-diseno/motor/simulacion.md` con frontmatter (`title`, `type: informe`, `tags`,
`estado: vigente`, `actualizado`), la semilla, los parámetros y una tabla por
estrategia. En `apps/api/package.json`:

```json
"simular": "bun run shared && node -r @swc-node/register src/scripts/simular.ts"
```

- [ ] **Paso 4: correrlo dos veces y comparar**

```bash
cd /home/kali/acopio && bun run --filter @acopio/api simular -- --semilla 42 \
  && cp docs/03-diseno/motor/simulacion.md /tmp/claude-1000/sim1.md \
  && bun run --filter @acopio/api simular -- --semilla 42 \
  && diff /tmp/claude-1000/sim1.md docs/03-diseno/motor/simulacion.md && echo IGUALES
```

Esperado: `IGUALES`. El informe no lleva la hora de la corrida, solo la fecha de
`actualizado`, para que dos corridas del mismo día salgan idénticas.

- [ ] **Paso 5: PR**

Rama `etapa2-simulador`. Mensaje: `shared: simulador del motor con semilla y su informe`.
Si el motor no gana a las dos alternativas en desviación de cobertura, el informe lo
dice tal cual y se anota en `pendientes.md`; no se ajustan los pesos para que gane.

---

### Tarea 11: `seed:demo`, contrato, documentación y cierre

**Archivos:**
- Modificar: `apps/api/src/seed/demo.ts`, `docs/03-diseno/api/openapi.json`,
  `apps/web/src/api/esquema.d.ts`, la especificación (§13 «Cambios al construir»),
  `docs/01-requerimientos/funcionales/motor.md` (RF-MOT-008, 009, 011) y
  `comprobantes.md` (RF-CMP-007), `docs/02-arquitectura/patrones-y-practicas.md` (State
  y Builder pasan a «en uso»), `docs/02-arquitectura/adr/ADR-0017-factura-servida-por-la-api.md`
  (la evidencia ya se sirve así), `docs/05-planes/README.md`,
  `docs/01-requerimientos/pendientes.md` (P-052: la factura con bytes, como la evidencia)

- [ ] **Paso 1: `seed:demo`**

El escenario del §1 de la especificación necesita, además de lo que sembró la etapa 1:
una remisión `EN_TRANSITO` con zona hacia la zona del Receptor de demo, un despacho
general en tránsito, un folio conciliado vinculado a la primera, y dos reportes de
necesidad recientes. Idempotente: buscar por un código fijo (`R-2026-DEMO2`,
`R-2026-DEMO3`) antes de crear.

- [ ] **Paso 2: verificación completa**

```bash
cd /home/kali/acopio && bun run lint && bun run typecheck && bun run --filter @acopio/api depcruise \
  && bun run test && PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439 bun run test:int \
  && bash scripts/revisar-colores.sh && bun run --filter @acopio/api openapi \
  && bun run --filter @acopio/web api:tipos && git status --short
```

Después, con el Compose: `bun run servicios:todo`, `db:migrar`, `seed:demo` y los pasos
4 a 7 del §1 por curl contra `localhost:3000/api` con las cuentas de demo. Anotar el
resultado en la tabla de estado.

- [ ] **Paso 3: documentos y revisión final**

Actualizar los documentos de la lista, la tabla de estado de este plan y el issue #46
con lo probado y lo que falta. Una revisión final del conjunto de la etapa con
superpowers:requesting-code-review antes del último PR; los hallazgos menores se anotan
al pie de la tabla de estado para la interfaz.

## Qué se recorta si el tiempo no alcanza

El orden de recorte de la especificación (§11): primero RF-CMP-007 (tarea 9), después la
capa pública (mitad de la tarea 8). El simulador no se recorta. La tarea 1 tampoco: sin
ella, `motor` incumple ADR-0019.
