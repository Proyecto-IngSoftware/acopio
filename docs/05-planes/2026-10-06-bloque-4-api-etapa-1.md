---
title: "Bloque 4 · Motor: API, etapa 1 · plan"
type: plan
tags: [plan, bloque-4]
estado: aprobado
bloque: 4
actualizado: 2026-10-07
---

# Bloque 4 · Motor: API, etapa 1 · plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usar superpowers:subagent-driven-development
> (recomendada) o superpowers:executing-plans para ejecutar este plan tarea por tarea.
> Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** la API calcula la necesidad, el déficit y la cobertura de cada zona y el
excedente de cada acopio, propone traslados con su justificación, y deja que el
Administrador los apruebe (lo que arma una remisión en borrador) o los descarte.

**Arquitectura:** las fórmulas y el emparejamiento son funciones puras en
`packages/shared/src/motor/`, que también usará el simulador. Nace el módulo `motor`.
`EstadoMotorService` lee la base y arma la entrada del cálculo, `NecesidadService` sirve
la ficha de zona y los excedentes, `SugerenciasService` recalcula, aprueba y descarta, y
`ConfiguracionService` guarda los pesos. Las zonas reciben en `movimiento` con `zona_id`
(M-01), así que la migración toca el núcleo del Bloque 2.

**Stack:** NestJS 11, Prisma 7.10 sobre PostgreSQL 16, nestjs-zod, Jest con `@swc/jest`,
supertest, `@nestjs/schedule`.

**Especificación:** [2026-10-06-bloque-4-motor-design.md](../superpowers/specs/2026-10-06-bloque-4-motor-design.md)

La etapa 2 (remisiones, recepción, reportes, mapa público y RF-CMP-007), el simulador y
las pantallas tienen sus propios planes. Esta etapa ya crea todas las tablas del bloque,
porque aprobar una sugerencia escribe en `remision`.

## Estado

| Tarea | Estado | Qué falta |
|---|---|---|
| 1 Esquema del motor y movimientos de zona | ✅ | `f7b24b1` |
| 2 Fórmulas del motor en `shared` | ✅ | `503bd65` |
| 3 Emparejamiento y justificación en `shared` | ✅ | `20ec636` |
| 4 Módulo `motor`: ficha de zona, necesidad manual y excedentes | ✅ | `1e2fa2b` |
| 5 Población con fuente nueva (RF-MOT-012) | ✅ | `e396207` |
| 6 Recálculo y ranking | ✅ | `9344ead` |
| 7 Configuración del motor con vista previa | ✅ | `9dd792f` |
| 8 Aprobar y descartar | ✅ | `48b78cc` |
| 9 Datos de ejemplo del motor | ✅ | `de77414` |
| 10 Contrato, documentación y cierre de la etapa | ✅ | El commit de esta tarea. La revisión final y el CI quedan anotados abajo |

## Restricciones globales

- Node 22 (`nvm use`), Bun 1.3 para instalar y correr scripts.
- TypeScript 6.0, NestJS 11, Prisma 7.10: no se suben (§11 del Bloque 0).
- Código, nombres y mensajes en español, con los términos del glosario (`zona`,
  `acopio`, `remisión`, `sugerencia`).
- Toda escritura registra su evento en la bitácora dentro de la misma transacción
  (`BitacoraService.registrar(tx, …)`). El recálculo no escribe en la bitácora.
- Errores con `ErrorDominio(codigo, mensaje, estado, detalles?)`.
- `movimiento`, `reporte_necesidad`, `necesidad_manual` y `remision_comprobante`:
  `acopio_app` solo `SELECT` e `INSERT`. `remision` y `configuracion_motor`: sin `DELETE`.
- Solo `inventario` escribe en `movimiento` (§6 de la especificación). En esta etapa
  `motor` no crea movimientos; solo toma el candado de saldo de `inventario`.
- `motor` importa de `inventario`, `catalogo`, `acopios`, `comprobantes` y
  `almacenamiento`, y nadie importa de `motor` (`.dependency-cruiser.cjs` ya lo dice).
- Candados: el motor toma primero `motor:sugerencias` y después el de saldo
  `acopio:categoría`. Nadie toma el del motor después del de saldo.
- Pesos por defecto 0,45 · 0,25 · 0,15 · 0,15; cantidad mínima 5; bloqueo tras descarte
  de 24 horas; ventana del recibido = `horizonte_dias` de la emergencia (M-02).
- Las pruebas de integración corren contra el contenedor aparte
  (`PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439`), nunca contra la
  base del Compose. La base de pruebas es una sola para todos los archivos: cada suite
  crea sus propias categorías con `unico(...)` y filtra por ellas.
- Commits en español con el área al inicio (`API: …`, `shared: …`) y la línea
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, directo a `main`, con las
  verificaciones encadenadas con `&&`.

## Foco de revisión

Entradas que la especificación implica y que ninguna tarea cubriría sin pensarlo. Cada
una tiene su prueba en la tarea que la posee.

1. Dos aprobaciones simultáneas desde el mismo acopio y categoría hacia zonas distintas,
   que por separado caben y juntas superan el movible: una responde 200 y la otra 409
   `SUGERENCIA_DESACTUALIZADA`, y las líneas planeadas no superan el movible (tarea 8).
2. Una zona cuya emergencia está cerrada: la ficha se sigue leyendo, el motor no le
   propone nada y la necesidad manual responde 409 `ZONA_SOLO_LECTURA` (tareas 4 y 6).
3. Un acopio con mercancía perecedera ya vencida en el estante: lo vencido no cuenta como
   movible y la urgencia sale de lo que vence después (tareas 2 y 4).
4. Una categoría por unidades con déficit fraccionario (10,4 jabones): la sugerencia es
   entera, 10, y el motor no se queda en un ciclo (tarea 3).
5. La configuración con pesos que suman 0,9995 se acepta y con 0,98 se rechaza con 422
   `PESOS_NO_SUMAN_UNO`; la vista previa no guarda nada (tarea 7).

---

### Tarea 1: esquema del motor y movimientos de zona

**Archivos:**
- Modificar: `prisma/schema.prisma`, `apps/api/src/seed/sembrar.ts`,
  `apps/api/src/modulos/inventario/movimientos.service.ts`,
  `apps/api/src/modulos/inventario/consultas.service.ts`,
  `apps/api/src/modulos/comprobantes/conciliacion.service.ts`,
  `apps/api/src/pruebas-integracion/base.int.test.ts`
- Crear: `prisma/migrations/<marca>_bloque_4_motor/migration.sql`

**Interfaces:**
- Produce: modelos `Remision`, `LineaRemision`, `RemisionComprobante`, `Sugerencia`,
  `ReporteNecesidad`, `NecesidadManual`, `ConfiguracionMotor`; enums `EstadoRemision`,
  `EstadoSugerencia`; `TipoMovimiento.RECEPCION`; `Movimiento.acopio_id` opcional con
  `zona_id` y `remision_id`.

- [ ] **Paso 1: modelos**

En `prisma/schema.prisma`, `TipoMovimiento` gana `RECEPCION`, y `Movimiento` cambia así:

```prisma
model Movimiento {
  id             String                 @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  /// Nulo en una RECEPCION: esa es de una zona (M-01, ADR-0018)
  acopio_id      String?                @db.Uuid
  acopio         Acopio?                @relation(fields: [acopio_id], references: [id])
  zona_id        String?                @db.Uuid
  zona           Zona?                  @relation(fields: [zona_id], references: [id])
  remision_id    String?                @db.Uuid
  remision       Remision?              @relation(fields: [remision_id], references: [id])
  // … el resto de los campos sin cambios …

  @@index([acopio_id, categoria_id, registrado_en])
  @@index([registrado_en])
  @@index([zona_id, categoria_id, ocurrido_en])
  @@map("movimiento")
}
```

Los modelos nuevos, al final del archivo, en una sección `// ── Motor (Bloque 4) ──`:

```prisma
enum EstadoRemision {
  BORRADOR
  EN_TRANSITO
  RECIBIDA
  CANCELADA
}

enum EstadoSugerencia {
  PROPUESTA
  APROBADA
  DESCARTADA
}

/// RF-MOT-008. Sin zona es un despacho general. Se cancela, no se borra.
model Remision {
  id                 String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  codigo             String         @unique
  acopio_origen_id   String         @db.Uuid
  acopio_origen      Acopio         @relation(fields: [acopio_origen_id], references: [id])
  zona_destino_id    String?        @db.Uuid
  zona_destino       Zona?          @relation(fields: [zona_destino_id], references: [id])
  estado             EstadoRemision @default(BORRADOR)
  /// Se completa antes de despachar: al aprobar una sugerencia aún no se sabe
  responsable        String?
  qr_token           String         @unique
  creada_por         String         @db.Uuid
  creador            Usuario        @relation("remisiones_creadas", fields: [creada_por], references: [id])
  creada_en          DateTime       @default(now()) @db.Timestamptz
  despachada_por     String?        @db.Uuid
  despachador        Usuario?       @relation("remisiones_despachadas", fields: [despachada_por], references: [id])
  despachada_en      DateTime?      @db.Timestamptz
  recibida_por       String?        @db.Uuid
  receptor           Usuario?       @relation("remisiones_recibidas", fields: [recibida_por], references: [id])
  recibida_en        DateTime?      @db.Timestamptz
  evidencia_keys     String[]       @default([])
  nota_recepcion     String?
  cancelada_por      String?        @db.Uuid
  cancelador         Usuario?       @relation("remisiones_canceladas", fields: [cancelada_por], references: [id])
  cancelada_en       DateTime?      @db.Timestamptz
  motivo_cancelacion String?
  lineas             LineaRemision[]
  sugerencias        Sugerencia[]
  movimientos        Movimiento[]
  comprobantes       RemisionComprobante[]

  @@index([estado, acopio_origen_id])
  @@index([estado, zona_destino_id])
  @@map("remision")
}

/// Una línea por categoría. Se edita solo en BORRADOR (disparador linea_remision_editable).
model LineaRemision {
  id                String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  remision_id       String    @db.Uuid
  remision          Remision  @relation(fields: [remision_id], references: [id])
  categoria_id      String    @db.Uuid
  categoria         Categoria @relation(fields: [categoria_id], references: [id])
  cantidad_planeada Decimal   @db.Decimal(12, 3)
  cantidad_recibida Decimal?  @db.Decimal(12, 3)

  @@unique([remision_id, categoria_id])
  @@map("linea_remision")
}

/// RF-CMP-007. Solo inserción.
model RemisionComprobante {
  remision_id    String      @db.Uuid
  remision       Remision    @relation(fields: [remision_id], references: [id])
  comprobante_id String      @db.Uuid
  comprobante    Comprobante @relation(fields: [comprobante_id], references: [id])
  vinculado_por  String      @db.Uuid
  vinculador     Usuario     @relation("remisiones_vinculadas", fields: [vinculado_por], references: [id])
  vinculado_en   DateTime    @default(now()) @db.Timestamptz

  @@id([remision_id, comprobante_id])
  @@index([comprobante_id])
  @@map("remision_comprobante")
}

/// RF-MOT-005 a 007. Las PROPUESTA se reemplazan en cada recálculo; las decididas quedan (M-04).
model Sugerencia {
  id                String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ronda             DateTime         @db.Timestamptz
  emergencia_id     String           @db.Uuid
  emergencia        Emergencia       @relation(fields: [emergencia_id], references: [id])
  acopio_id         String           @db.Uuid
  acopio            Acopio           @relation(fields: [acopio_id], references: [id])
  zona_id           String           @db.Uuid
  zona              Zona             @relation(fields: [zona_id], references: [id])
  categoria_id      String           @db.Uuid
  categoria         Categoria        @relation(fields: [categoria_id], references: [id])
  cantidad          Decimal          @db.Decimal(12, 3)
  puntaje           Decimal          @db.Decimal(6, 4)
  /// {criticidad, urgencia, proximidad, magnitud}
  desglose          Json
  justificacion     String
  estado            EstadoSugerencia @default(PROPUESTA)
  cantidad_aprobada Decimal?         @db.Decimal(12, 3)
  remision_id       String?          @db.Uuid
  remision          Remision?        @relation(fields: [remision_id], references: [id])
  motivo_descarte   String?
  decidida_por      String?          @db.Uuid
  decisor           Usuario?         @relation("sugerencias_decididas", fields: [decidida_por], references: [id])
  decidida_en       DateTime?        @db.Timestamptz

  @@index([estado, puntaje])
  @@index([acopio_id, zona_id, categoria_id, decidida_en])
  @@map("sugerencia")
}

/// RF-MOT-011. Solo inserción: la vigente de una categoría es la más reciente.
model ReporteNecesidad {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  zona_id       String    @db.Uuid
  zona          Zona      @relation(fields: [zona_id], references: [id])
  categoria_id  String    @db.Uuid
  categoria     Categoria @relation(fields: [categoria_id], references: [id])
  reportado_por String    @db.Uuid
  reportante    Usuario   @relation("reportes_necesidad", fields: [reportado_por], references: [id])
  nota          String?
  resuelta      Boolean   @default(false)
  reportado_en  DateTime  @default(now()) @db.Timestamptz

  @@index([zona_id, categoria_id, reportado_en])
  @@map("reporte_necesidad")
}

/// RF-MOT-002. Solo inserción: vale la más reciente; cantidad nula vuelve al cálculo.
model NecesidadManual {
  id           String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  zona_id      String    @db.Uuid
  zona         Zona      @relation(fields: [zona_id], references: [id])
  categoria_id String    @db.Uuid
  categoria    Categoria @relation(fields: [categoria_id], references: [id])
  cantidad     Decimal?  @db.Decimal(12, 3)
  motivo       String
  puesta_por   String    @db.Uuid
  autor        Usuario   @relation("necesidades_manuales", fields: [puesta_por], references: [id])
  puesta_en    DateTime  @default(now()) @db.Timestamptz

  @@index([zona_id, categoria_id, puesta_en])
  @@map("necesidad_manual")
}

/// RF-CAT-006. Una sola fila, global (ADR-0010).
model ConfiguracionMotor {
  id              Int      @id @db.SmallInt
  /// {criticidad, urgencia, proximidad, magnitud}, suman 1
  pesos           Json
  cantidad_minima Decimal  @db.Decimal(12, 3)
  actualizado_por String?  @db.Uuid
  actualizador    Usuario? @relation("configuracion_motor", fields: [actualizado_por], references: [id])
  actualizado_en  DateTime @default(now()) @db.Timestamptz

  @@map("configuracion_motor")
}
```

Relaciones inversas:
- `Usuario`: `remisiones_creadas Remision[] @relation("remisiones_creadas")`,
  `remisiones_despachadas Remision[] @relation("remisiones_despachadas")`,
  `remisiones_recibidas Remision[] @relation("remisiones_recibidas")`,
  `remisiones_canceladas Remision[] @relation("remisiones_canceladas")`,
  `remisiones_vinculadas RemisionComprobante[] @relation("remisiones_vinculadas")`,
  `sugerencias_decididas Sugerencia[] @relation("sugerencias_decididas")`,
  `reportes_necesidad ReporteNecesidad[] @relation("reportes_necesidad")`,
  `necesidades_manuales NecesidadManual[] @relation("necesidades_manuales")`,
  `configuracion_motor ConfiguracionMotor[] @relation("configuracion_motor")`.
- `Acopio`: `remisiones Remision[]`, `sugerencias Sugerencia[]`.
- `Zona`: `movimientos Movimiento[]`, `remisiones Remision[]`, `sugerencias Sugerencia[]`,
  `reportes ReporteNecesidad[]`, `necesidades_manuales NecesidadManual[]`.
- `Categoria`: `lineas_remision LineaRemision[]`, `sugerencias Sugerencia[]`,
  `reportes_necesidad ReporteNecesidad[]`, `necesidades_manuales NecesidadManual[]`.
- `Emergencia`: `sugerencias Sugerencia[]`.
- `Comprobante`: `remisiones RemisionComprobante[]`.

Run: `cd apps/api && bunx prisma migrate dev --create-only --name bloque_4_motor`.

- [ ] **Paso 2: reglas a mano al final de la migración**

Prisma agrega `RECEPCION` con `ALTER TYPE … ADD VALUE`. PostgreSQL no deja usar un valor
de enum nuevo en la misma transacción en que se agrega, así que los `CHECK` comparan
`"tipo"::text`.

```sql
-- ── Motor (Bloque 4) ────────────────────────────────────────────────────────
-- Un movimiento es de un acopio o de una zona, nunca de los dos (M-01, ADR-0018)
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_acopio_o_zona"
  CHECK (("acopio_id" IS NULL) <> ("zona_id" IS NULL));
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_recepcion_en_zona"
  CHECK (("tipo"::text = 'RECEPCION') = ("zona_id" IS NOT NULL));
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_recepcion_con_remision"
  CHECK ("tipo"::text <> 'RECEPCION' OR ("remision_id" IS NOT NULL AND "signo" = 1));

-- Las zonas no tienen saldo: el disparador solo corre en movimientos de acopio
DROP TRIGGER movimiento_actualiza_saldo ON movimiento;
CREATE TRIGGER movimiento_actualiza_saldo
  AFTER INSERT ON movimiento
  FOR EACH ROW WHEN (NEW.acopio_id IS NOT NULL)
  EXECUTE FUNCTION inventario_actualizar_saldo();

ALTER TABLE "remision" ADD CONSTRAINT "remision_codigo_formato"
  CHECK ("codigo" ~ '^R-[0-9]{4}-[A-HJ-NP-Z2-9]{5}$');
ALTER TABLE "remision" ADD CONSTRAINT "remision_recibida_completa"
  CHECK ("estado" <> 'RECIBIDA' OR ("zona_destino_id" IS NOT NULL
         AND "recibida_en" IS NOT NULL AND cardinality("evidencia_keys") >= 1));
ALTER TABLE "remision" ADD CONSTRAINT "remision_despachada_con_responsable"
  CHECK ("estado" IN ('BORRADOR', 'CANCELADA') OR length(trim(coalesce("responsable", ''))) > 0);
ALTER TABLE "remision" ADD CONSTRAINT "remision_cancelada_con_motivo"
  CHECK ("estado" <> 'CANCELADA' OR length(trim(coalesce("motivo_cancelacion", ''))) >= 10);
ALTER TABLE "linea_remision" ADD CONSTRAINT "linea_remision_planeada_positiva"
  CHECK ("cantidad_planeada" > 0);
ALTER TABLE "linea_remision" ADD CONSTRAINT "linea_remision_recibida_no_negativa"
  CHECK ("cantidad_recibida" IS NULL OR "cantidad_recibida" >= 0);
ALTER TABLE "sugerencia" ADD CONSTRAINT "sugerencia_cantidad_positiva"
  CHECK ("cantidad" > 0);
ALTER TABLE "sugerencia" ADD CONSTRAINT "sugerencia_descartada_con_motivo"
  CHECK ("estado" <> 'DESCARTADA' OR length(trim(coalesce("motivo_descarte", ''))) >= 10);
ALTER TABLE "sugerencia" ADD CONSTRAINT "sugerencia_aprobada_con_remision"
  CHECK ("estado" <> 'APROBADA' OR ("remision_id" IS NOT NULL AND "cantidad_aprobada" > 0));
ALTER TABLE "necesidad_manual" ADD CONSTRAINT "necesidad_manual_cantidad"
  CHECK ("cantidad" IS NULL OR "cantidad" >= 0);
ALTER TABLE "necesidad_manual" ADD CONSTRAINT "necesidad_manual_motivo"
  CHECK (length(trim("motivo")) >= 10);
ALTER TABLE "configuracion_motor" ADD CONSTRAINT "configuracion_motor_una_fila"
  CHECK ("id" = 1);
ALTER TABLE "configuracion_motor" ADD CONSTRAINT "configuracion_motor_minimo"
  CHECK ("cantidad_minima" >= 0);

-- Las líneas se editan solo en BORRADOR. En tránsito solo cambia cantidad_recibida,
-- que la recepción iguala a la planeada (RF-MOT-009)
CREATE FUNCTION motor_linea_editable() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  rid uuid;
  e text;
BEGIN
  IF TG_OP = 'DELETE' THEN rid := OLD.remision_id; ELSE rid := NEW.remision_id; END IF;
  SELECT estado::text INTO e FROM remision WHERE id = rid;
  IF e = 'BORRADOR' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND e = 'EN_TRANSITO'
     AND NEW.remision_id = OLD.remision_id AND NEW.categoria_id = OLD.categoria_id
     AND NEW.cantidad_planeada = OLD.cantidad_planeada THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'linea_remision_no_editable: la remisión está %', e
    USING ERRCODE = 'check_violation';
END
$$;
CREATE TRIGGER linea_remision_editable
  BEFORE INSERT OR UPDATE OR DELETE ON linea_remision
  FOR EACH ROW EXECUTE FUNCTION motor_linea_editable();

-- Una sugerencia decidida no se borra; las PROPUESTA sí, en cada recálculo (M-04)
CREATE FUNCTION motor_sugerencia_borrable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.estado <> 'PROPUESTA' THEN
    RAISE EXCEPTION 'sugerencia_decidida_no_se_borra' USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END
$$;
CREATE TRIGGER sugerencia_borrable
  BEFORE DELETE ON sugerencia
  FOR EACH ROW EXECUTE FUNCTION motor_sugerencia_borrable();

-- Solo inserción (§4 de la especificación)
REVOKE UPDATE, DELETE, TRUNCATE ON "reporte_necesidad", "necesidad_manual", "remision_comprobante" FROM acopio_app;
-- Una remisión se cancela, no se borra; la configuración es una fila fija
REVOKE DELETE, TRUNCATE ON "remision", "configuracion_motor" FROM acopio_app;
```

- [ ] **Paso 3: el resto del código con `acopio_id` opcional**

Run: `cd apps/api && bun run typecheck`. Esperado: errores donde un `Movimiento.acopio_id`
ahora es `string | null` o donde `tipo` incluye `RECEPCION`. Los conocidos y su arreglo:

En `modulos/inventario/movimientos.service.ts`, el tipo de la vista:

```ts
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'RECEPCION';
```

En `modulos/inventario/consultas.service.ts`, `saldos()` solo lee movimientos de un acopio,
pero el tipo no lo sabe. Antes del `.map` que arma la entrada de `vencimientoEstimado`:

```ts
                  .filter((m) => m.categoria_id === c.id)
                  .filter(
                    (m): m is typeof m & { tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE' } =>
                      m.tipo !== 'RECEPCION',
                  )
```

En `modulos/comprobantes/conciliacion.service.ts`, `vincular()` (una `ENTRADA` siempre
tiene acopio por el `CHECK`, pero el tipo no lo sabe):

```ts
    const acopioId = movs[0]!.acopio_id;
    if (!acopioId) throw noVinculable('Solo se vinculan entradas de un acopio');
```

Si `typecheck` muestra otro sitio, se arregla igual: un filtro o una guarda explícita que
descarte el nulo, nunca un `!` ni un `as string`. Cada sitio nuevo se anota en «Cambios
al construir» de la especificación.

- [ ] **Paso 4: la fila de configuración en el seed**

En `apps/api/src/seed/sembrar.ts`, después de cargar la canasta y antes del
administrador (las constantes llegan en la tarea 2; mientras tanto, los valores van
literales y la tarea 2 los reemplaza por `PESOS_POR_DEFECTO` y
`CANTIDAD_MINIMA_POR_DEFECTO`):

```ts
  // RF-CAT-006: una sola fila global con los pesos por defecto
  await prisma.configuracionMotor.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      pesos: { criticidad: 0.45, urgencia: 0.25, proximidad: 0.15, magnitud: 0.15 },
      cantidad_minima: 5,
    },
  });
```

- [ ] **Paso 5: pruebas de la base**

En `base.int.test.ts`, dentro de `describe('base de datos', …)`, después de
`describe('inventario (Bloque 2)', …)`:

```ts
  describe('motor (Bloque 4)', () => {
    let categoria: string;
    let adminId: string;
    let remision: string;

    beforeAll(async () => {
      categoria = (
        await a.prisma.categoria.create({
          data: { nombre: `Base motor ${Date.now()}`, grupo: 'HERRAMIENTAS', unidad_base: 'UNIDAD' },
        })
      ).id;
      adminId = (await a.prisma.usuario.findFirstOrThrow({ where: { username: ADMIN.username } })).id;
      remision = (
        await a.prisma.remision.create({
          data: {
            codigo: 'R-2026-BASE2',
            acopio_origen_id: ACOPIO_A,
            zona_destino_id: ZONA_A,
            qr_token: `base-${Date.now()}`,
            creada_por: adminId,
            lineas: { create: [{ categoria_id: categoria, cantidad_planeada: 4 }] },
          },
        })
      ).id;
    });

    const recepcion = (extra: Record<string, unknown> = {}) =>
      a.prisma.movimiento.create({
        data: {
          zona_id: ZONA_A,
          categoria_id: categoria,
          tipo: 'RECEPCION',
          signo: 1,
          cantidad: 4,
          remision_id: remision,
          usuario_id: adminId,
          ocurrido_en: new Date(),
          ...extra,
        },
      });

    it('una RECEPCION en zona entra y no crea saldo', async () => {
      const antes = await a.prisma.saldo.count();
      await recepcion();
      expect(await a.prisma.saldo.count()).toBe(antes);
    });

    it('un movimiento no es de un acopio y de una zona a la vez', async () => {
      await expect(recepcion({ acopio_id: ACOPIO_A })).rejects.toThrow(/movimiento_acopio_o_zona/);
    });

    it('una RECEPCION sin remisión no entra', async () => {
      await expect(recepcion({ remision_id: null })).rejects.toThrow(
        /movimiento_recepcion_con_remision/,
      );
    });

    it('una ENTRADA en una zona no entra', async () => {
      await expect(recepcion({ tipo: 'ENTRADA' })).rejects.toThrow(/movimiento_recepcion_en_zona/);
    });

    it('las líneas de una remisión en tránsito no se editan, salvo lo recibido', async () => {
      await a.prisma.remision.update({
        where: { id: remision },
        data: { estado: 'EN_TRANSITO', responsable: 'Conductor de prueba', despachada_en: new Date() },
      });
      await expect(
        app.query(`UPDATE linea_remision SET cantidad_planeada = 9 WHERE remision_id = $1`, [remision]),
      ).rejects.toThrow(/linea_remision_no_editable/);
      await expect(app.query(`DELETE FROM linea_remision WHERE remision_id = $1`, [remision])).rejects.toThrow(
        /linea_remision_no_editable/,
      );
      await expect(
        app.query(`UPDATE linea_remision SET cantidad_recibida = 4 WHERE remision_id = $1`, [remision]),
      ).resolves.toBeDefined();
    });

    it('una sugerencia decidida no se borra; una propuesta sí', async () => {
      const base = {
        ronda: new Date(),
        emergencia_id: EMERGENCIA_PRUEBA,
        acopio_id: ACOPIO_A,
        zona_id: ZONA_A,
        categoria_id: categoria,
        cantidad: 3,
        puntaje: 0.5,
        desglose: {},
        justificacion: 'Prueba de la base',
      };
      const decidida = await a.prisma.sugerencia.create({
        data: { ...base, estado: 'DESCARTADA', motivo_descarte: 'No hace falta ahora', decidida_por: adminId, decidida_en: new Date() },
      });
      const propuesta = await a.prisma.sugerencia.create({ data: base });
      await expect(app.query(`DELETE FROM sugerencia WHERE id = $1`, [decidida.id])).rejects.toThrow(
        /sugerencia_decidida_no_se_borra/,
      );
      await expect(app.query(`DELETE FROM sugerencia WHERE id = $1`, [propuesta.id])).resolves.toBeDefined();
    });

    it.each([
      ['reporte_necesidad', 'zona_id = zona_id'],
      ['necesidad_manual', 'zona_id = zona_id'],
      ['remision_comprobante', 'vinculado_en = now()'],
    ])('acopio_app no cambia ni borra %s', async (tabla, asignacion) => {
      await expect(app.query(`DELETE FROM ${tabla} WHERE false`)).rejects.toThrow(/permission denied/);
      await expect(app.query(`UPDATE ${tabla} SET ${asignacion} WHERE false`)).rejects.toThrow(
        /permission denied/,
      );
    });

    it.each(['remision', 'configuracion_motor'])('acopio_app no borra %s', async (tabla) => {
      await expect(app.query(`DELETE FROM ${tabla} WHERE false`)).rejects.toThrow(/permission denied/);
    });
  });
```

Agregar `EMERGENCIA_PRUEBA` a la importación de `../../test/app-prueba`.

- [ ] **Paso 6: aplicar, verificar y commit**

```bash
cd apps/api && bun run db:migrar && bun run typecheck && bun run lint && PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439 bun run test:int && git add -A ../../prisma src && git commit -m "API: tablas del motor y movimientos de zona en el mismo libro (M-01)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

`test:int` completo es el control del riesgo de la especificación: el `acopio_id` opcional
no puede romper inventario ni comprobantes.

---

### Tarea 2: fórmulas del motor en `shared`

**Archivos:**
- Crear: `packages/shared/src/motor/calculo.ts`, `packages/shared/src/motor/calculo.test.ts`,
  `packages/shared/src/motor/index.ts`
- Modificar: `packages/shared/src/index.ts`, `apps/api/src/seed/sembrar.ts`,
  `docs/superpowers/specs/2026-10-06-bloque-4-motor-design.md` (§13)

**Interfaces:**
- Consume: `vencimientoEstimado` y `MovimientoParaVencimiento` de `../inventario.js`.
- Produce: `Pesos`, `Componentes`, `PESOS_POR_DEFECTO`, `CANTIDAD_MINIMA_POR_DEFECTO`,
  `BLOQUEO_DESCARTE_HORAS`, `VIGENCIA_REPORTE_DIAS`, `RADIO_ZONA_PUBLICA_KM`,
  `necesidad(cantidadPersonaDia, poblacion, horizonteDias): number`,
  `estadoZona(necesidad, recibido, enCamino): EstadoZonaCategoria | null`,
  `coberturaGlobal(coberturas: number[]): number | null`,
  `estadoAcopio(e: EntradaAcopioCategoria, hoy: string): EstadoAcopioCategoria`,
  `urgencia(dias: number | null): number`, `puntaje(c: Componentes, p: Pesos): number`,
  `pesosValidos(p: Pesos): boolean`, `diasEntre(desde: string, hasta: string): number`.

Diferencia con M-05: `shared` ya estima los vencimientos con `vencimientoEstimado`
(V-02 del Bloque 2), que supone que sale primero lo que vence antes, y C3 Inventario
muestra eso. El motor usa la misma estimación para que su urgencia no contradiga el
inventario. Lo vencido que queda en el estante no cuenta como movible. Se anota en el §13
de la especificación (paso 5).

- [ ] **Paso 1: pruebas que fallan**

`packages/shared/src/motor/calculo.test.ts`:

```ts
import type { MovimientoParaVencimiento } from '../inventario.js';
import {
  PESOS_POR_DEFECTO,
  coberturaGlobal,
  diasEntre,
  estadoAcopio,
  estadoZona,
  necesidad,
  pesosValidos,
  puntaje,
  urgencia,
} from './calculo.js';

describe('necesidad', () => {
  it('es canasta × población × horizonte', () => {
    expect(necesidad(15, 1200, 7)).toBe(126000);
  });

  it('redondea a milésimas', () => {
    expect(necesidad(0.0067, 333, 7)).toBe(15.617);
  });
});

describe('estadoZona', () => {
  it('descuenta lo recibido y lo que va en camino', () => {
    expect(estadoZona(100, 30, 20)).toEqual({
      necesidad: 100,
      recibido: 30,
      enCamino: 20,
      deficit: 50,
      cobertura: 0.3,
      criticidad: 0.5,
    });
  });

  it('con más de lo necesario no hay déficit y la cobertura se topa en 1', () => {
    expect(estadoZona(100, 120, 0)).toMatchObject({ deficit: 0, cobertura: 1, criticidad: 0 });
  });

  it('sin necesidad la categoría no entra al cálculo', () => {
    expect(estadoZona(0, 10, 0)).toBeNull();
  });
});

describe('coberturaGlobal', () => {
  it('promedia las coberturas topadas en 1 (M-11)', () => {
    expect(coberturaGlobal([0.2, 1.5, 0.5])).toBeCloseTo(1.7 / 3);
  });

  it('sin categorías no hay cobertura', () => {
    expect(coberturaGlobal([])).toBeNull();
  });
});

describe('estadoAcopio', () => {
  const base = {
    saldo: 80,
    umbral: { minimo: 10, maximo: 50 },
    noRecibe: false,
    comprometido: 5,
    perecedero: false,
    movimientos: [],
  };

  it('sin umbral no hay excedente (M-12)', () => {
    expect(estadoAcopio({ ...base, umbral: null }, '2026-10-06')).toMatchObject({
      movible: 0,
      superavit: 0,
      aviso: 'SIN_UMBRAL',
    });
  });

  it('libera lo que pasa del máximo, menos lo comprometido en borradores', () => {
    expect(estadoAcopio(base, '2026-10-06')).toEqual({
      superavit: 30,
      vencido: 0,
      movible: 25,
      diasParaVencer: null,
      aviso: null,
    });
  });

  it('en «no recibir» libera hasta el mínimo', () => {
    expect(estadoAcopio({ ...base, noRecibe: true }, '2026-10-06').movible).toBe(65);
  });

  it('nunca es negativo', () => {
    expect(estadoAcopio({ ...base, saldo: 20 }, '2026-10-06').movible).toBe(0);
  });

  it('lo vencido no se mueve y la urgencia sale de lo que vence después', () => {
    const entrada = (cantidad: number, venceEn: string): MovimientoParaVencimiento => ({
      tipo: 'ENTRADA',
      signo: 1,
      cantidad,
      venceEn,
    });
    const r = estadoAcopio(
      {
        ...base,
        umbral: { minimo: 0, maximo: 20 },
        comprometido: 0,
        perecedero: true,
        movimientos: [entrada(30, '2026-10-01'), entrada(50, '2026-10-20')],
      },
      '2026-10-06',
    );
    expect(r).toMatchObject({ vencido: 30, movible: 30, diasParaVencer: 14 });
  });
});

describe('urgencia', () => {
  it('es 0 sin fecha y 1 / (1 + días) con fecha', () => {
    expect(urgencia(null)).toBe(0);
    expect(urgencia(0)).toBe(1);
    expect(urgencia(4)).toBe(0.2);
  });
});

describe('puntaje', () => {
  it('suma los componentes con sus pesos', () => {
    expect(
      puntaje({ criticidad: 1, urgencia: 0, proximidad: 1, magnitud: 1 }, PESOS_POR_DEFECTO),
    ).toBe(0.75);
  });
});

describe('pesosValidos', () => {
  it('acepta pesos que suman 1 con tolerancia de 0,001', () => {
    expect(pesosValidos(PESOS_POR_DEFECTO)).toBe(true);
    expect(pesosValidos({ criticidad: 0.4995, urgencia: 0.25, proximidad: 0.15, magnitud: 0.1 })).toBe(true);
  });

  it('rechaza los que no suman 1 o tienen un negativo', () => {
    expect(pesosValidos({ criticidad: 0.43, urgencia: 0.25, proximidad: 0.15, magnitud: 0.15 })).toBe(false);
    expect(pesosValidos({ criticidad: 1.2, urgencia: -0.2, proximidad: 0, magnitud: 0 })).toBe(false);
  });
});

describe('diasEntre', () => {
  it('cuenta días de calendario', () => {
    expect(diasEntre('2026-10-06', '2026-10-20')).toBe(14);
    expect(diasEntre('2026-10-06', '2026-10-06')).toBe(0);
  });
});
```

Run: `cd packages/shared && bunx jest src/motor/calculo.test.ts`. Esperado: FAIL, no
encuentra `./calculo.js`.

- [ ] **Paso 2: implementación**

`packages/shared/src/motor/calculo.ts`:

```ts
import { vencimientoEstimado, type MovimientoParaVencimiento } from '../inventario.js';

/** Los cuatro pesos del puntaje (RF-MOT-005, RF-CAT-006). Suman 1. */
export interface Pesos {
  criticidad: number;
  urgencia: number;
  proximidad: number;
  magnitud: number;
}
/** Los cuatro componentes de una sugerencia, cada uno entre 0 y 1. */
export type Componentes = Pesos;

export const PESOS_POR_DEFECTO: Pesos = {
  criticidad: 0.45,
  urgencia: 0.25,
  proximidad: 0.15,
  magnitud: 0.15,
};
/** No se proponen traslados menores, en unidad base (RF-MOT-005). */
export const CANTIDAD_MINIMA_POR_DEFECTO = 5;
/** Un par descartado no se vuelve a proponer durante este tiempo (M-04). */
export const BLOQUEO_DESCARTE_HORAS = 24;
/** Un reporte del Receptor se muestra hasta esta antigüedad (M-09). */
export const VIGENCIA_REPORTE_DIAS = 7;
/** Radio del área de una zona en el mapa público (M-09). */
export const RADIO_ZONA_PUBLICA_KM = 3;

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const DIA_MS = 86_400_000;

/** RF-MOT-002: canasta × población × horizonte, en unidad base. */
export function necesidad(cantidadPersonaDia: number, poblacion: number, horizonteDias: number) {
  return r3(cantidadPersonaDia * poblacion * horizonteDias);
}

export interface EstadoZonaCategoria {
  necesidad: number;
  recibido: number;
  enCamino: number;
  deficit: number;
  /** Lo que ya llegó sobre lo necesario, topado en 1 (RF-MOT-003). */
  cobertura: number;
  /** 1 − (recibido + en camino) / necesidad, topado: lo que el motor todavía ve sin cubrir. */
  criticidad: number;
}

/** RF-MOT-003 con M-02 y M-03. Sin necesidad, la categoría no entra al cálculo. */
export function estadoZona(
  necesidad: number,
  recibido: number,
  enCamino: number,
): EstadoZonaCategoria | null {
  if (!(necesidad > 0)) return null;
  return {
    necesidad,
    recibido,
    enCamino,
    deficit: Math.max(0, r3(necesidad - recibido - enCamino)),
    cobertura: Math.min(1, recibido / necesidad),
    criticidad: 1 - Math.min(1, (recibido + enCamino) / necesidad),
  };
}

/** M-11: promedio de las coberturas por categoría, cada una topada en 1. */
export function coberturaGlobal(coberturas: number[]): number | null {
  if (coberturas.length === 0) return null;
  return coberturas.reduce((s, c) => s + Math.min(1, c), 0) / coberturas.length;
}

export interface EntradaAcopioCategoria {
  saldo: number;
  umbral: { minimo: number; maximo: number } | null;
  noRecibe: boolean;
  /** Líneas en BORRADOR que salen de este acopio (M-03). */
  comprometido: number;
  perecedero: boolean;
  /** Movimientos del acopio en la categoría; solo cuentan si es perecedera. */
  movimientos: MovimientoParaVencimiento[];
}

export interface EstadoAcopioCategoria {
  /** Lo que pasa del máximo (RF-MOT-004). */
  superavit: number;
  /** Lo que la estimación de vencimientos da por vencido y sigue en el estante. */
  vencido: number;
  /** Lo que el motor puede proponer sacar. */
  movible: number;
  /** Días hasta lo próximo que vence; null sin fecha. */
  diasParaVencer: number | null;
  aviso: 'SIN_UMBRAL' | null;
}

/** Días de calendario entre dos fechas `YYYY-MM-DD`. */
export function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / DIA_MS);
}

/**
 * RF-MOT-004 con M-03, M-05 y M-12. `hoy` es la fecha de Bogotá en `YYYY-MM-DD`. Los
 * vencimientos salen de la misma estimación que C3 (V-02): lo que vence antes sale primero.
 */
export function estadoAcopio(e: EntradaAcopioCategoria, hoy: string): EstadoAcopioCategoria {
  const lotes = e.perecedero ? vencimientoEstimado(e.movimientos) : [];
  const vencido = r3(
    lotes.filter((l) => l.venceEn !== null && l.venceEn < hoy).reduce((s, l) => s + l.cantidad, 0),
  );
  // vencimientoEstimado ordena por fecha: el primero sin vencer es el más próximo
  const proximo = lotes.find((l) => l.venceEn !== null && l.venceEn >= hoy);
  const diasParaVencer = proximo?.venceEn ? diasEntre(hoy, proximo.venceEn) : null;
  if (!e.umbral) return { superavit: 0, vencido, movible: 0, diasParaVencer, aviso: 'SIN_UMBRAL' };
  const superavit = Math.max(0, r3(e.saldo - e.umbral.maximo));
  const limite = e.noRecibe ? e.umbral.minimo : e.umbral.maximo;
  const movible = Math.max(0, r3(e.saldo - vencido - limite - e.comprometido));
  return { superavit, vencido, movible, diasParaVencer, aviso: null };
}

/** M-05: 1 / (1 + días); 0 sin fecha, que incluye las categorías no perecederas. */
export function urgencia(diasParaVencer: number | null): number {
  return diasParaVencer === null ? 0 : 1 / (1 + Math.max(0, diasParaVencer));
}

export function puntaje(c: Componentes, p: Pesos): number {
  const total =
    p.criticidad * c.criticidad +
    p.urgencia * c.urgencia +
    p.proximidad * c.proximidad +
    p.magnitud * c.magnitud;
  return Math.round(total * 10_000) / 10_000;
}

/** RF-CAT-006: cada peso entre 0 y 1 y la suma igual a 1, con tolerancia de 0,001. */
export function pesosValidos(p: Pesos): boolean {
  const v = [p.criticidad, p.urgencia, p.proximidad, p.magnitud];
  return v.every((x) => x >= 0 && x <= 1) && Math.abs(v.reduce((s, x) => s + x, 0) - 1) <= 0.001;
}
```

`packages/shared/src/motor/index.ts`:

```ts
export * from './calculo.js';
```

Al final de `packages/shared/src/index.ts`:

```ts
export * from './motor/index.js';
```

- [ ] **Paso 3: correr las pruebas**

Run: `cd packages/shared && bunx jest src/motor/calculo.test.ts`. Esperado: PASS.

- [ ] **Paso 4: el seed usa las constantes**

En `apps/api/src/seed/sembrar.ts`, importar `CANTIDAD_MINIMA_POR_DEFECTO` y
`PESOS_POR_DEFECTO` de `@acopio/shared` y reemplazar los literales de la tarea 1:

```ts
    create: { id: 1, pesos: { ...PESOS_POR_DEFECTO }, cantidad_minima: CANTIDAD_MINIMA_POR_DEFECTO },
```

- [ ] **Paso 5: anotar la diferencia en la especificación**

En el §13 de `2026-10-06-bloque-4-motor-design.md`, reemplazar «(vacío)» por:

```markdown
**2026-10-06 · API, etapa 1.** Según el [plan](../../05-planes/2026-10-06-bloque-4-api-etapa-1.md).

| Qué | Por qué |
|---|---|
| `dias_para_vencer` usa `vencimientoEstimado` (V-02): sale primero lo que vence antes, no lo que entró primero como decía M-05. Lo vencido que sigue en el estante no cuenta como movible | C3 ya muestra los vencimientos con esa estimación; con otra, la urgencia del motor contradiría el inventario |
| `remision.responsable` es opcional en `BORRADOR` y obligatorio desde `EN_TRANSITO` (`remision_despachada_con_responsable`) | Al aprobar una sugerencia todavía no se sabe quién lleva el envío |
```

- [ ] **Paso 6: verificar y commit**

```bash
cd packages/shared && bun run typecheck && bun run test && cd ../../apps/api && bun run typecheck && cd ../.. && bun run lint && git add packages/shared apps/api/src/seed docs/superpowers/specs/2026-10-06-bloque-4-motor-design.md && git commit -m "shared: fórmulas del motor (necesidad, déficit, cobertura, movible, urgencia y puntaje)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 3: emparejamiento y justificación en `shared`

**Archivos:**
- Crear: `packages/shared/src/motor/emparejar.ts`, `packages/shared/src/motor/emparejar.test.ts`,
  `packages/shared/src/motor/justificar.ts`, `packages/shared/src/motor/justificar.test.ts`
- Modificar: `packages/shared/src/motor/index.ts`

**Interfaces:**
- Consume: `Pesos`, `Componentes`, `puntaje`, `urgencia` (tarea 2); `distanciaKm`;
  `formatearCantidad`, `formatearNumero`; `UnidadBase`.
- Produce:
  - `interface ZonaMotor { id: string; nombre: string; lat: number; lng: number }`
  - `interface AcopioMotor { id: string; nombre: string; lat: number; lng: number }`
  - `interface CategoriaMotor { id: string; nombre: string; unidad: UnidadBase }`
  - `interface DemandaMotor { zonaId: string; categoriaId: string; necesidad: number; recibido: number; enCamino: number }`
  - `interface OfertaMotor { acopioId: string; categoriaId: string; movible: number; superavit: number; noRecibe: boolean; diasParaVencer: number | null }`
  - `interface EntradaMotor { zonas; acopios; categorias; demandas; ofertas; bloqueados?: ReadonlySet<string> }`
  - `clavePar(acopioId, zonaId, categoriaId): string`
  - `interface SugerenciaCalculada { acopioId; zonaId; categoriaId; cantidad: number; puntaje: number; desglose: Componentes; justificacion: string }`
  - `emparejar(entrada: EntradaMotor, pesos: Pesos, minimo: number): SugerenciaCalculada[]`,
    ya ordenadas para el ranking.
  - `justificar(d: DatosJustificacion): string`.

- [ ] **Paso 1: pruebas de la justificación**

`packages/shared/src/motor/justificar.test.ts`:

```ts
import { justificar } from './justificar.js';

const base = {
  zona: 'Zona 7',
  categoria: 'Agua potable',
  unidad: 'LITRO' as const,
  cobertura: 0.12,
  acopio: 'Acopio Norte',
  noRecibe: false,
  superavit: 800,
  movible: 800,
  km: 40.6,
  diasParaVencer: null,
};

describe('justificar', () => {
  it('nombra la cobertura, el sobrante y la distancia', () => {
    expect(justificar(base)).toBe(
      'Zona 7 tiene 12 % de cobertura en agua potable; Acopio Norte tiene 800 L sobre su máximo, a 41 km',
    );
  });

  it('con vencimiento, lo dice como estimado', () => {
    expect(justificar({ ...base, diasParaVencer: 4 })).toMatch(
      /; lo más próximo vence en 4 días \(estimado\)$/,
    );
    expect(justificar({ ...base, diasParaVencer: 1 })).toMatch(/vence en 1 día \(estimado\)$/);
    expect(justificar({ ...base, diasParaVencer: 0 })).toMatch(/vence hoy \(estimado\)$/);
  });

  it('un acopio en «no recibir» libera hasta su mínimo', () => {
    expect(justificar({ ...base, noRecibe: true, superavit: 0, movible: 1240.5 })).toContain(
      'Acopio Norte no recibe agua potable y puede liberar 1.240,5 L hasta su mínimo',
    );
  });
});
```

- [ ] **Paso 2: implementación de la justificación**

`packages/shared/src/motor/justificar.ts`:

```ts
import { formatearCantidad, formatearNumero } from '../formato.js';
import type { UnidadBase } from '../unidades.js';

export interface DatosJustificacion {
  zona: string;
  categoria: string;
  unidad: UnidadBase;
  /** (recibido + en camino) / necesidad antes de esta sugerencia. */
  cobertura: number;
  acopio: string;
  noRecibe: boolean;
  superavit: number;
  movible: number;
  km: number;
  diasParaVencer: number | null;
}

/** RF-MOT-006: la razón de una sugerencia en una frase. Nadie aprueba un número que no entiende. */
export function justificar(d: DatosJustificacion): string {
  const categoria = d.categoria.toLowerCase();
  const sobra = d.noRecibe
    ? `${d.acopio} no recibe ${categoria} y puede liberar ${formatearCantidad(d.movible, d.unidad)} hasta su mínimo`
    : `${d.acopio} tiene ${formatearCantidad(d.superavit, d.unidad)} sobre su máximo`;
  const partes = [
    `${d.zona} tiene ${Math.round(d.cobertura * 100)} % de cobertura en ${categoria}`,
    `${sobra}, a ${formatearNumero(Math.round(d.km))} km`,
  ];
  if (d.diasParaVencer !== null) {
    const cuando =
      d.diasParaVencer === 0
        ? 'hoy'
        : `en ${d.diasParaVencer} ${d.diasParaVencer === 1 ? 'día' : 'días'}`;
    partes.push(`lo más próximo vence ${cuando} (estimado)`);
  }
  return partes.join('; ');
}
```

Run: `cd packages/shared && bunx jest src/motor/justificar.test.ts`. Esperado: PASS.

- [ ] **Paso 3: pruebas del emparejamiento**

`packages/shared/src/motor/emparejar.test.ts`. Las coordenadas están sobre el meridiano
-74,1: Z1 en 4,6; «Cerca» a unos 5 km; «Lejos» a unos 50 km.

```ts
import { PESOS_POR_DEFECTO } from './calculo.js';
import { clavePar, emparejar, type EntradaMotor } from './emparejar.js';

const agua = { id: 'agua', nombre: 'Agua potable', unidad: 'LITRO' as const };
const jabon = { id: 'jabon', nombre: 'Jabón de baño', unidad: 'UNIDAD' as const };
const z1 = { id: 'z1', nombre: 'Zona 1', lat: 4.6, lng: -74.1 };
const z2 = { id: 'z2', nombre: 'Zona 2', lat: 4.6, lng: -74.1 };
const cerca = { id: 'cerca', nombre: 'Acopio Cerca', lat: 4.645, lng: -74.1 };
const lejos = { id: 'lejos', nombre: 'Acopio Lejos', lat: 5.05, lng: -74.1 };
const oferta = (acopioId: string, movible: number, categoriaId = 'agua') => ({
  acopioId,
  categoriaId,
  movible,
  superavit: movible,
  noRecibe: false,
  diasParaVencer: null,
});
const demanda = (zonaId: string, necesidad: number, recibido = 0, categoriaId = 'agua') => ({
  zonaId,
  categoriaId,
  necesidad,
  recibido,
  enCamino: 0,
});
const entrada = (e: Partial<EntradaMotor>): EntradaMotor => ({
  zonas: [z1, z2],
  acopios: [cerca, lejos],
  categorias: [agua, jabon],
  demandas: [],
  ofertas: [],
  ...e,
});

describe('emparejar', () => {
  it('la proximidad decide quién atiende, aunque el lejano tenga más (M-06)', () => {
    const r = emparejar(
      entrada({ demandas: [demanda('z1', 100)], ofertas: [oferta('cerca', 100), oferta('lejos', 200)] }),
      PESOS_POR_DEFECTO,
      5,
    );
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ acopioId: 'cerca', zonaId: 'z1', cantidad: 100 });
    expect(r[0]!.justificacion).toContain('Acopio Cerca');
  });

  it('con poco sobrante va primero a la zona más crítica', () => {
    const r = emparejar(
      entrada({
        demandas: [demanda('z1', 100, 80), demanda('z2', 100, 0)],
        ofertas: [oferta('cerca', 30)],
      }),
      PESOS_POR_DEFECTO,
      5,
    );
    expect(r).toEqual([expect.objectContaining({ zonaId: 'z2', cantidad: 30 })]);
  });

  it('reparte un déficit entre varios acopios y descuenta lo asignado', () => {
    const r = emparejar(
      entrada({ demandas: [demanda('z1', 150)], ofertas: [oferta('cerca', 100), oferta('lejos', 100)] }),
      PESOS_POR_DEFECTO,
      5,
    );
    expect(r.map((s) => [s.acopioId, s.cantidad])).toEqual([
      ['cerca', 100],
      ['lejos', 50],
    ]);
  });

  it('salta un par bloqueado por un descarte reciente', () => {
    const r = emparejar(
      entrada({
        demandas: [demanda('z1', 100)],
        ofertas: [oferta('cerca', 100), oferta('lejos', 100)],
        bloqueados: new Set([clavePar('cerca', 'z1', 'agua')]),
      }),
      PESOS_POR_DEFECTO,
      5,
    );
    expect(r.map((s) => s.acopioId)).toEqual(['lejos']);
  });

  it('no propone cantidades menores que el mínimo', () => {
    const r = emparejar(
      entrada({ demandas: [demanda('z1', 3)], ofertas: [oferta('cerca', 100)] }),
      PESOS_POR_DEFECTO,
      5,
    );
    expect(r).toEqual([]);
  });

  it('una categoría por unidades se propone entera y no se queda en un ciclo', () => {
    const r = emparejar(
      entrada({
        demandas: [demanda('z1', 10.4, 0, 'jabon')],
        ofertas: [oferta('cerca', 100, 'jabon')],
      }),
      PESOS_POR_DEFECTO,
      1,
    );
    expect(r.map((s) => s.cantidad)).toEqual([10]);
  });

  it('en empate ordena por cantidad y después por nombre de zona', () => {
    const r = emparejar(
      entrada({
        demandas: [demanda('z2', 50), demanda('z1', 50)],
        ofertas: [oferta('cerca', 100)],
      }),
      PESOS_POR_DEFECTO,
      5,
    );
    expect(r.map((s) => s.zonaId)).toEqual(['z1', 'z2']);
  });

  it('el desglose explica el puntaje', () => {
    const [s] = emparejar(
      entrada({ demandas: [demanda('z1', 100)], ofertas: [oferta('cerca', 100)] }),
      PESOS_POR_DEFECTO,
      5,
    );
    expect(s!.desglose).toEqual({ criticidad: 1, urgencia: 0, proximidad: 1, magnitud: 1 });
    expect(s!.puntaje).toBe(0.75);
  });
});
```

Run: `cd packages/shared && bunx jest src/motor/emparejar.test.ts`. Esperado: FAIL, no
encuentra `./emparejar.js`.

- [ ] **Paso 4: implementación del emparejamiento**

`packages/shared/src/motor/emparejar.ts`:

```ts
import { distanciaKm } from '../distancia.js';
import type { UnidadBase } from '../unidades.js';
import { puntaje, urgencia, type Componentes, type Pesos } from './calculo.js';
import { justificar } from './justificar.js';

export interface ZonaMotor {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
}
export interface AcopioMotor {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
}
export interface CategoriaMotor {
  id: string;
  nombre: string;
  unidad: UnidadBase;
}
export interface DemandaMotor {
  zonaId: string;
  categoriaId: string;
  necesidad: number;
  recibido: number;
  enCamino: number;
}
export interface OfertaMotor {
  acopioId: string;
  categoriaId: string;
  movible: number;
  superavit: number;
  noRecibe: boolean;
  diasParaVencer: number | null;
}
export interface EntradaMotor {
  zonas: ZonaMotor[];
  acopios: AcopioMotor[];
  categorias: CategoriaMotor[];
  demandas: DemandaMotor[];
  ofertas: OfertaMotor[];
  /** Pares descartados hace menos de 24 horas, con `clavePar` (M-04). */
  bloqueados?: ReadonlySet<string>;
}
export interface SugerenciaCalculada {
  acopioId: string;
  zonaId: string;
  categoriaId: string;
  cantidad: number;
  puntaje: number;
  desglose: Componentes;
  justificacion: string;
}

export const clavePar = (acopioId: string, zonaId: string, categoriaId: string) =>
  `${acopioId}:${zonaId}:${categoriaId}`;

const r3 = (n: number) => Math.round(n * 1000) / 1000;

interface Candidata {
  sugerencia: SugerenciaCalculada;
  zona: string;
  acopio: string;
}

/** Puntaje mayor, luego cantidad mayor, luego zona y acopio por nombre: orden estable (M-04). */
const antes = (x: Candidata, y: Candidata) =>
  y.sugerencia.puntaje - x.sugerencia.puntaje ||
  y.sugerencia.cantidad - x.sugerencia.cantidad ||
  x.zona.localeCompare(y.zona, 'es') ||
  x.acopio.localeCompare(y.acopio, 'es') ||
  x.sugerencia.zonaId.localeCompare(y.sugerencia.zonaId) ||
  x.sugerencia.acopioId.localeCompare(y.sugerencia.acopioId);

/**
 * M-06: voraz por puntaje. En cada categoría se puntúan todos los pares acopio y zona, se
 * toma el mejor, se le asigna min(movible, déficit), se descuenta de los dos lados y se
 * repite hasta que no quede un par que alcance la cantidad mínima.
 */
export function emparejar(entrada: EntradaMotor, pesos: Pesos, minimo: number): SugerenciaCalculada[] {
  const zonas = new Map(entrada.zonas.map((z) => [z.id, z]));
  const acopios = new Map(entrada.acopios.map((a) => [a.id, a]));
  const bloqueados = entrada.bloqueados ?? new Set<string>();
  const distancias = new Map<string, number>();
  const km = (a: AcopioMotor, z: ZonaMotor) => {
    const clave = `${a.id}:${z.id}`;
    let d = distancias.get(clave);
    if (d === undefined) distancias.set(clave, (d = distanciaKm(a, z)));
    return d;
  };

  // distancia_max: la mayor entre los pares candidatos de la ronda (M-06)
  let distanciaMax = 0;
  for (const d of entrada.demandas) {
    const z = zonas.get(d.zonaId);
    if (!z || d.necesidad - d.recibido - d.enCamino <= 0) continue;
    for (const o of entrada.ofertas) {
      const a = acopios.get(o.acopioId);
      if (a && o.categoriaId === d.categoriaId && o.movible > 0) distanciaMax = Math.max(distanciaMax, km(a, z));
    }
  }

  const elegidas: Candidata[] = [];
  for (const cat of entrada.categorias) {
    const demandas = entrada.demandas
      .filter((d) => d.categoriaId === cat.id && zonas.has(d.zonaId))
      .map((d) => ({ ...d, asignado: 0 }));
    const ofertas = entrada.ofertas
      .filter((o) => o.categoriaId === cat.id && acopios.has(o.acopioId))
      .map((o) => ({ ...o, restante: o.movible }));

    for (;;) {
      let mejor: (Candidata & { d: (typeof demandas)[number]; o: (typeof ofertas)[number] }) | null = null;
      for (const d of demandas) {
        const deficit = r3(d.necesidad - d.recibido - d.enCamino - d.asignado);
        if (deficit <= 0) continue;
        const z = zonas.get(d.zonaId)!;
        for (const o of ofertas) {
          if (o.restante <= 0 || bloqueados.has(clavePar(o.acopioId, d.zonaId, cat.id))) continue;
          const bruta = Math.min(o.restante, deficit);
          const cantidad = cat.unidad === 'UNIDAD' ? Math.floor(bruta) : r3(bruta);
          if (cantidad <= 0 || cantidad < minimo) continue;
          const a = acopios.get(o.acopioId)!;
          const distancia = km(a, z);
          const cubierto = Math.min(1, (d.recibido + d.enCamino + d.asignado) / d.necesidad);
          const desglose: Componentes = {
            criticidad: 1 - cubierto,
            urgencia: urgencia(o.diasParaVencer),
            proximidad: distanciaMax > 0 ? 1 - distancia / distanciaMax : 1,
            magnitud: Math.min(1, o.restante / deficit),
          };
          const candidata = {
            d,
            o,
            zona: z.nombre,
            acopio: a.nombre,
            sugerencia: {
              acopioId: a.id,
              zonaId: z.id,
              categoriaId: cat.id,
              cantidad,
              puntaje: puntaje(desglose, pesos),
              desglose,
              justificacion: justificar({
                zona: z.nombre,
                categoria: cat.nombre,
                unidad: cat.unidad,
                cobertura: cubierto,
                acopio: a.nombre,
                noRecibe: o.noRecibe,
                superavit: o.superavit,
                movible: o.restante,
                km: distancia,
                diasParaVencer: o.diasParaVencer,
              }),
            },
          };
          if (!mejor || antes(candidata, mejor) < 0) mejor = candidata;
        }
      }
      if (!mejor) break;
      elegidas.push({ sugerencia: mejor.sugerencia, zona: mejor.zona, acopio: mejor.acopio });
      mejor.d.asignado = r3(mejor.d.asignado + mejor.sugerencia.cantidad);
      mejor.o.restante = r3(mejor.o.restante - mejor.sugerencia.cantidad);
    }
  }
  return elegidas.sort(antes).map((c) => c.sugerencia);
}
```

La justificación se arma para cada candidata aunque se descarte. Con 50 zonas, 20 acopios
y 40 categorías son unas 40 mil frases por ronda, dentro de lo que exige RF-MOT-005; si la
prueba de rendimiento de la tarea 6 pasa de 5 s, se arma solo para la elegida.

En `packages/shared/src/motor/index.ts`:

```ts
export * from './calculo.js';
export * from './emparejar.js';
export * from './justificar.js';
```

- [ ] **Paso 5: correr las pruebas**

Run: `cd packages/shared && bunx jest src/motor`. Esperado: PASS.

- [ ] **Paso 6: verificar y commit**

```bash
cd packages/shared && bun run typecheck && bun run test && cd ../.. && bun run lint && git add packages/shared && git commit -m "shared: emparejamiento voraz por puntaje y justificación de cada sugerencia (M-06)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 4: módulo `motor`: ficha de zona, necesidad manual y excedentes

**Archivos:**
- Crear: `apps/api/src/modulos/motor/motor.module.ts`,
  `apps/api/src/modulos/motor/estado-motor.service.ts`,
  `apps/api/src/modulos/motor/necesidad.service.ts`,
  `apps/api/src/modulos/motor/necesidad.controller.ts`,
  `apps/api/src/modulos/motor/codigo-remision.ts`,
  `apps/api/src/pruebas-integracion/necesidad.int.test.ts`
- Modificar: `apps/api/src/app.module.ts`, `apps/api/src/comun/respuestas.ts`

**Interfaces:**
- Consume: `estadoAcopio`, `estadoZona`, `coberturaGlobal`, `necesidad`,
  `VIGENCIA_REPORTE_DIAS` y los tipos de la tarea 3; `hoyEnBogota` de
  `catalogo/emergencias.service`; `AlcanceService`; `BitacoraService`; `ALFABETO_FOLIO`.
- Produce:
  - `EstadoMotorService` con
    `zonas(cliente: ClienteBd, filtro: { zonaIds?: string[] }): Promise<ZonaCargada[]>`,
    `demandas(cliente, ahora: Date, zonas: ZonaCargada[], categoriaIds?: string[]): Promise<DemandaDetallada[]>`,
    `acopios(cliente, filtro: { acopioIds?: string[] }): Promise<AcopioMotor[]>`,
    `ofertas(cliente, ahora: Date, acopios: AcopioMotor[], categoriaIds?: string[]): Promise<OfertaDetallada[]>`,
    `categorias(cliente, ids: string[]): Promise<CategoriaMotor[]>`.
    Sin `zonaIds`, `zonas` trae las de emergencias `ACTIVA` y `EN_SEGUIMIENTO`; sin
    `acopioIds`, `acopios` trae los `ACTIVO` y `PAUSADO`.
  - `generarCodigoRemision(anio: number, azar?): string` → `R-2026-7KQ4M` (su prueba
    unitaria llega en la tarea 8; aquí la usan las pruebas de integración).
  - `GET /api/zonas/:id/necesidad` (ADMIN, RECEPTOR de la zona),
    `PUT /api/zonas/:id/necesidad-manual/:categoriaId` (ADMIN),
    `GET /api/acopios/:id/excedentes` (ADMIN, OPERADOR del acopio).

- [ ] **Paso 1: el código de remisión**

`apps/api/src/modulos/motor/codigo-remision.ts`:

```ts
import { randomBytes } from 'node:crypto';
import { ALFABETO_FOLIO } from '../comprobantes/folio';

/** R-2026-7KQ4M: mismo alfabeto que el folio, sin 0/O ni 1/I. No es secuencial. */
export function generarCodigoRemision(anio: number, azar: (n: number) => Buffer = randomBytes): string {
  const sufijo = [...azar(5)].map((b) => ALFABETO_FOLIO[b % 32]).join('');
  return `R-${anio}-${sufijo}`;
}
```

- [ ] **Paso 2: pruebas que fallan**

`apps/api/src/pruebas-integracion/necesidad.int.test.ts`:

```ts
import {
  ACOPIO_A,
  ACOPIO_B,
  ADMIN,
  EMERGENCIA_PRUEBA,
  ZONA_A,
  crearAppPrueba,
  crearUsuarioActivo,
  iniciarSesion,
  unico,
  type AppPrueba,
} from '../../test/app-prueba';
import { generarCodigoRemision } from '../modulos/motor/codigo-remision';

/** RF-MOT-002, 003 y 004 en lectura: la ficha de zona y los excedentes. */
describe('necesidad y excedentes', () => {
  let a: AppPrueba;
  let tokenAdmin: string;
  let adminId: string;
  let agua: string;
  let arroz: string;
  const como = (t: string) => ({ authorization: `Bearer ${t}` });
  const DIA = 86_400_000;

  const entrada = (acopio: string, categoria: string, cantidad: number, venceEn: Date | null = null) =>
    a.prisma.movimiento.create({
      data: {
        acopio_id: acopio,
        categoria_id: categoria,
        tipo: 'ENTRADA',
        signo: 1,
        cantidad,
        vence_en: venceEn,
        usuario_id: adminId,
        ocurrido_en: new Date(),
      },
    });

  /** Una remisión de ACOPIO_B a ZONA_A con una línea; RECIBIDA crea su RECEPCION. */
  async function remision(
    estado: 'BORRADOR' | 'EN_TRANSITO' | 'RECIBIDA',
    categoria: string,
    cantidad: number,
    ocurrido = new Date(),
  ) {
    const r = await a.prisma.remision.create({
      data: {
        codigo: generarCodigoRemision(2026),
        acopio_origen_id: ACOPIO_B,
        zona_destino_id: ZONA_A,
        qr_token: unico('qr'),
        creada_por: adminId,
        lineas: { create: [{ categoria_id: categoria, cantidad_planeada: cantidad }] },
      },
    });
    if (estado === 'BORRADOR') return r;
    await a.prisma.remision.update({
      where: { id: r.id },
      data: { estado: 'EN_TRANSITO', responsable: 'Conductor', despachada_en: ocurrido },
    });
    if (estado === 'EN_TRANSITO') return r;
    await a.prisma.movimiento.create({
      data: {
        zona_id: ZONA_A,
        categoria_id: categoria,
        tipo: 'RECEPCION',
        signo: 1,
        cantidad,
        remision_id: r.id,
        usuario_id: adminId,
        ocurrido_en: ocurrido,
      },
    });
    return a.prisma.remision.update({
      where: { id: r.id },
      data: { estado: 'RECIBIDA', recibida_en: ocurrido, evidencia_keys: ['prueba/foto.webp'] },
    });
  }

  beforeAll(async () => {
    a = await crearAppPrueba();
    tokenAdmin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
    adminId = (await a.prisma.usuario.findFirstOrThrow({ where: { username: ADMIN.username } })).id;
    // Categorías propias: la canasta del seed también aparece en la ficha
    agua = (await a.prisma.categoria.create({ data: { nombre: unico('Agua motor '), grupo: 'AGUA_Y_BEBIDAS', unidad_base: 'LITRO' } })).id;
    arroz = (await a.prisma.categoria.create({ data: { nombre: unico('Arroz motor '), grupo: 'ALIMENTOS', unidad_base: 'KILOGRAMO', perecedero: true } })).id;
    await a.prisma.canastaEstandar.create({
      data: { categoria_id: agua, cantidad_persona_dia: 15, fuente: 'Esfera de prueba', vigente_desde: new Date('2026-01-01T00:00:00Z') },
    });
  });
  afterAll(() => a.cerrar());

  const ficha = async (token = tokenAdmin) =>
    (await a.http().get(`/api/zonas/${ZONA_A}/necesidad`).set(como(token)).expect(200)).body;
  const fila = (body: { categorias: { categoriaId: string }[] }, cat: string) =>
    body.categorias.find((c) => c.categoriaId === cat) as Record<string, unknown> | undefined;

  it('la necesidad sale de la canasta, la población y el horizonte, con sus fuentes', async () => {
    const body = await ficha();
    expect(body.zona).toMatchObject({ id: ZONA_A, poblacionEstimada: 1200, poblacionFuente: 'Censo de prueba' });
    expect(body.zona.emergencia).toMatchObject({ id: EMERGENCIA_PRUEBA, horizonteDias: 7 });
    expect(fila(body, agua)).toMatchObject({
      origen: 'CANASTA',
      cantidadPersonaDia: 15,
      fuenteCanasta: 'Esfera de prueba',
      necesidad: 126000,
      recibido: 0,
      enCamino: 0,
      deficit: 126000,
      cobertura: 0,
    });
  });

  it('cuenta lo recibido en la ventana del horizonte y lo que va en camino', async () => {
    await remision('RECIBIDA', agua, 26000);
    await remision('RECIBIDA', agua, 50000, new Date(Date.now() - 8 * DIA)); // fuera de la ventana
    await remision('EN_TRANSITO', agua, 10000);
    await remision('BORRADOR', agua, 5000);
    expect(fila(await ficha(), agua)).toMatchObject({
      recibido: 26000,
      enCamino: 15000,
      deficit: 85000,
    });
  });

  it('la necesidad manual reemplaza el cálculo y dice quién la puso', async () => {
    await a
      .http()
      .put(`/api/zonas/${ZONA_A}/necesidad-manual/${arroz}`)
      .set(como(tokenAdmin))
      .send({ cantidad: 500, motivo: 'Lote de arroz dañado por el agua' })
      .expect(200);
    expect(fila(await ficha(), arroz)).toMatchObject({
      origen: 'MANUAL',
      necesidad: 500,
      manual: expect.objectContaining({ cantidad: 500, puestaPor: expect.any(String) }),
    });
    expect(
      await a.prisma.bitacora.findFirst({ where: { accion: 'necesidad.manual', ubicacion_id: ZONA_A } }),
    ).not.toBeNull();
  });

  it('quitar la necesidad manual vuelve al cálculo; sin canasta, la categoría sale de la ficha', async () => {
    await a
      .http()
      .put(`/api/zonas/${ZONA_A}/necesidad-manual/${arroz}`)
      .set(como(tokenAdmin))
      .send({ cantidad: null, motivo: 'Ya llegó la reposición del lote' })
      .expect(200);
    expect(fila(await ficha(), arroz)).toBeUndefined();
  });

  it('un motivo corto no se acepta', async () => {
    await a
      .http()
      .put(`/api/zonas/${ZONA_A}/necesidad-manual/${arroz}`)
      .set(como(tokenAdmin))
      .send({ cantidad: 5, motivo: 'corto' })
      .expect(400);
  });

  it('trae la cobertura global y la categoría más baja', async () => {
    const body = await ficha();
    expect(typeof body.coberturaGlobal).toBe('number');
    expect(body.categoriaMasBaja).toEqual(expect.objectContaining({ categoriaId: expect.any(String) }));
  });

  it('el Receptor de la zona la lee; el de otra zona y el Operador no', async () => {
    const receptor = await crearUsuarioActivo(a, tokenAdmin, {
      rol: 'RECEPTOR',
      asignaciones: [{ tipo: 'ZONA', ubicacionId: ZONA_A }],
    });
    await ficha(receptor.token);
    const otraZona = await a.prisma.zona.create({
      data: { emergencia_id: EMERGENCIA_PRUEBA, nombre: unico('Otra zona '), municipio: 'Bogotá', lat: 4.5, lng: -74.2, poblacion_estimada: 10, poblacion_fuente: 'Prueba', poblacion_fecha: new Date() },
    });
    const ajeno = await crearUsuarioActivo(a, tokenAdmin, {
      rol: 'RECEPTOR',
      asignaciones: [{ tipo: 'ZONA', ubicacionId: otraZona.id }],
    });
    await a.http().get(`/api/zonas/${ZONA_A}/necesidad`).set(como(ajeno.token)).expect(403);
    const op = await crearUsuarioActivo(a, tokenAdmin, { rol: 'OPERADOR' });
    await a.http().get(`/api/zonas/${ZONA_A}/necesidad`).set(como(op.token)).expect(403);
  });

  it('una zona de una emergencia cerrada se lee, pero no admite necesidad manual', async () => {
    const cerrada = await a.prisma.emergencia.create({
      data: { nombre: unico('Cerrada '), tipo: 'Sequía', inicio: new Date('2026-01-01T00:00:00Z'), destacada_hasta: new Date('2026-02-01T00:00:00Z'), estado: 'CERRADA', cerrada_en: new Date(), motivo_cierre: 'Terminó' },
    });
    const z = await a.prisma.zona.create({
      data: { emergencia_id: cerrada.id, nombre: unico('Zona cerrada '), municipio: 'Bogotá', lat: 4.5, lng: -74.1, poblacion_estimada: 100, poblacion_fuente: 'Prueba', poblacion_fecha: new Date() },
    });
    await a.http().get(`/api/zonas/${z.id}/necesidad`).set(como(tokenAdmin)).expect(200);
    const r = await a
      .http()
      .put(`/api/zonas/${z.id}/necesidad-manual/${arroz}`)
      .set(como(tokenAdmin))
      .send({ cantidad: 5, motivo: 'Prueba en zona cerrada' })
      .expect(409);
    expect(r.body.codigo).toBe('ZONA_SOLO_LECTURA');
  });

  describe('excedentes', () => {
    it('descuenta lo comprometido en borradores y avisa sin umbral', async () => {
      await entrada(ACOPIO_B, agua, 900);
      await a.prisma.umbral.create({
        data: { acopio_id: ACOPIO_B, categoria_id: agua, minimo: 100, maximo: 400, actualizado_por: adminId },
      });
      await entrada(ACOPIO_B, arroz, 50, new Date('2099-01-01T00:00:00Z'));
      const r = await a.http().get(`/api/acopios/${ACOPIO_B}/excedentes`).set(como(tokenAdmin)).expect(200);
      const filaAgua = r.body.find((x: { categoriaId: string }) => x.categoriaId === agua);
      // 900 − 400 de máximo = 500, menos 5000 en el borrador que sale de ACOPIO_B: nada movible
      expect(filaAgua).toMatchObject({ saldo: 900, superavit: 500, comprometido: 5000, movible: 0, aviso: null });
      expect(r.body.find((x: { categoriaId: string }) => x.categoriaId === arroz)).toMatchObject({
        aviso: 'SIN_UMBRAL',
        movible: 0,
      });
    });

    it('lo vencido no se mueve', async () => {
      const leche = (await a.prisma.categoria.create({ data: { nombre: unico('Leche motor '), grupo: 'ALIMENTOS', unidad_base: 'LITRO', perecedero: true } })).id;
      await entrada(ACOPIO_A, leche, 30, new Date('2026-01-01T00:00:00Z'));
      await entrada(ACOPIO_A, leche, 50, new Date('2099-01-01T00:00:00Z'));
      await a.prisma.umbral.create({
        data: { acopio_id: ACOPIO_A, categoria_id: leche, minimo: 0, maximo: 20, actualizado_por: adminId },
      });
      const r = await a.http().get(`/api/acopios/${ACOPIO_A}/excedentes`).set(como(tokenAdmin)).expect(200);
      expect(r.body.find((x: { categoriaId: string }) => x.categoriaId === leche)).toMatchObject({
        vencido: 30,
        movible: 30,
      });
    });

    it('el Operador ve los de su acopio y no los de otro', async () => {
      const op = await crearUsuarioActivo(a, tokenAdmin, { rol: 'OPERADOR' });
      await a.http().get(`/api/acopios/${ACOPIO_A}/excedentes`).set(como(op.token)).expect(200);
      await a.http().get(`/api/acopios/${ACOPIO_B}/excedentes`).set(como(op.token)).expect(403);
    });
  });
});
```

Run: `cd apps/api && PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439 bunx jest -c jest.int.config.cjs --runInBand src/pruebas-integracion/necesidad.int.test.ts`.
Esperado: FAIL con 404 en `/api/zonas/:id/necesidad`.

- [ ] **Paso 3: `EstadoMotorService`**

`apps/api/src/modulos/motor/estado-motor.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import {
  estadoAcopio,
  necesidad as calcularNecesidad,
  type AcopioMotor,
  type CategoriaMotor,
  type DemandaMotor,
  type OfertaMotor,
  type ZonaMotor,
} from '@acopio/shared';
import type { ClienteBd } from '../../comun/prisma/cliente-bd';
import { Prisma } from '../../generado/prisma/client';
import { hoyEnBogota } from '../catalogo/emergencias.service';

const uuids = (ids: string[]) => Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`));
const dia = (d: Date) => d.toISOString().slice(0, 10);
const clave = (x: string, y: string) => `${x}:${y}`;

export interface ZonaCargada extends ZonaMotor {
  emergenciaId: string;
  horizonteDias: number;
  poblacion: number;
}

export interface DemandaDetallada extends DemandaMotor {
  origen: 'CANASTA' | 'MANUAL';
  cantidadPersonaDia: number | null;
  fuenteCanasta: string | null;
  manual: { cantidad: number; motivo: string; puestaPor: string; puestaEn: Date } | null;
}

export interface OfertaDetallada extends OfertaMotor {
  saldo: number;
  umbral: { minimo: number; maximo: number } | null;
  comprometido: number;
  vencido: number;
  aviso: 'SIN_UMBRAL' | null;
}

/**
 * Lee la base y arma la entrada del cálculo (§5 de la especificación). Recibe el cliente
 * para leer dentro de la transacción de quien llama: aprobar valida con datos frescos.
 */
@Injectable()
export class EstadoMotorService {
  async zonas(cliente: ClienteBd, filtro: { zonaIds?: string[] }): Promise<ZonaCargada[]> {
    const filas = await cliente.zona.findMany({
      where: filtro.zonaIds
        ? { id: { in: filtro.zonaIds } }
        : { emergencia: { estado: { in: ['ACTIVA', 'EN_SEGUIMIENTO'] } } },
      include: { emergencia: { select: { horizonte_dias: true } } },
      orderBy: { nombre: 'asc' },
    });
    return filas.map((z) => ({
      id: z.id,
      nombre: z.nombre,
      lat: Number(z.lat),
      lng: Number(z.lng),
      emergenciaId: z.emergencia_id,
      horizonteDias: z.emergencia.horizonte_dias,
      poblacion: z.poblacion_estimada,
    }));
  }

  async demandas(
    cliente: ClienteBd,
    ahora: Date,
    zonas: ZonaCargada[],
    categoriaIds?: string[],
  ): Promise<DemandaDetallada[]> {
    if (zonas.length === 0) return [];
    const ids = zonas.map((z) => z.id);
    const hoy = dia(hoyEnBogota(ahora));
    const canasta = await cliente.$queryRaw<
      { categoria_id: string; cantidad_persona_dia: Prisma.Decimal; fuente: string }[]
    >`
      SELECT DISTINCT ON (ce.categoria_id) ce.categoria_id, ce.cantidad_persona_dia, ce.fuente
      FROM canasta_estandar ce JOIN categoria c ON c.id = ce.categoria_id
      WHERE ce.vigente_desde <= ${hoy}::date AND NOT c.archivada
      ORDER BY ce.categoria_id, ce.vigente_desde DESC`;
    const manuales = await cliente.$queryRaw<
      {
        zona_id: string;
        categoria_id: string;
        cantidad: Prisma.Decimal | null;
        motivo: string;
        puesta_en: Date;
        autor: string;
      }[]
    >`
      SELECT DISTINCT ON (n.zona_id, n.categoria_id)
             n.zona_id, n.categoria_id, n.cantidad, n.motivo, n.puesta_en, u.nombre AS autor
      FROM necesidad_manual n
      JOIN usuario u ON u.id = n.puesta_por
      JOIN categoria c ON c.id = n.categoria_id
      WHERE n.zona_id IN (${uuids(ids)}) AND NOT c.archivada
      ORDER BY n.zona_id, n.categoria_id, n.puesta_en DESC`;
    // M-02: solo lo que llegó dentro del horizonte de la emergencia de cada zona
    const recibidos = await cliente.$queryRaw<
      { zona_id: string; categoria_id: string; total: Prisma.Decimal }[]
    >`
      SELECT m.zona_id, m.categoria_id, SUM(m.cantidad) AS total
      FROM movimiento m
      JOIN zona z ON z.id = m.zona_id
      JOIN emergencia e ON e.id = z.emergencia_id
      WHERE m.tipo = 'RECEPCION' AND m.zona_id IN (${uuids(ids)})
        AND m.ocurrido_en >= ${ahora}::timestamptz - make_interval(days => e.horizonte_dias)
      GROUP BY m.zona_id, m.categoria_id`;
    // M-03: lo que va en camino, en borrador o en tránsito, con zona fija
    const enCamino = await cliente.$queryRaw<
      { zona_id: string; categoria_id: string; total: Prisma.Decimal }[]
    >`
      SELECT r.zona_destino_id AS zona_id, l.categoria_id, SUM(l.cantidad_planeada) AS total
      FROM linea_remision l JOIN remision r ON r.id = l.remision_id
      WHERE r.estado IN ('BORRADOR', 'EN_TRANSITO') AND r.zona_destino_id IN (${uuids(ids)})
      GROUP BY r.zona_destino_id, l.categoria_id`;

    const rec = new Map(recibidos.map((r) => [clave(r.zona_id, r.categoria_id), Number(r.total)]));
    const cam = new Map(enCamino.map((r) => [clave(r.zona_id, r.categoria_id), Number(r.total)]));
    const man = new Map(manuales.map((m) => [clave(m.zona_id, m.categoria_id), m]));
    const can = new Map(canasta.map((c) => [c.categoria_id, c]));

    const resultado: DemandaDetallada[] = [];
    for (const z of zonas) {
      const categorias = new Set([
        ...canasta.map((c) => c.categoria_id),
        ...manuales.filter((m) => m.zona_id === z.id).map((m) => m.categoria_id),
      ]);
      for (const categoriaId of categorias) {
        if (categoriaIds && !categoriaIds.includes(categoriaId)) continue;
        const m = man.get(clave(z.id, categoriaId));
        const c = can.get(categoriaId);
        const manual =
          m && m.cantidad !== null
            ? { cantidad: Number(m.cantidad), motivo: m.motivo, puestaPor: m.autor, puestaEn: m.puesta_en }
            : null;
        if (!manual && !c) continue;
        resultado.push({
          zonaId: z.id,
          categoriaId,
          necesidad: manual
            ? manual.cantidad
            : calcularNecesidad(Number(c!.cantidad_persona_dia), z.poblacion, z.horizonteDias),
          recibido: rec.get(clave(z.id, categoriaId)) ?? 0,
          enCamino: cam.get(clave(z.id, categoriaId)) ?? 0,
          origen: manual ? 'MANUAL' : 'CANASTA',
          cantidadPersonaDia: c ? Number(c.cantidad_persona_dia) : null,
          fuenteCanasta: c?.fuente ?? null,
          manual,
        });
      }
    }
    return resultado;
  }

  async acopios(cliente: ClienteBd, filtro: { acopioIds?: string[] }): Promise<AcopioMotor[]> {
    const filas = await cliente.acopio.findMany({
      where: filtro.acopioIds
        ? { id: { in: filtro.acopioIds } }
        : { estado: { in: ['ACTIVO', 'PAUSADO'] } },
      select: { id: true, nombre: true, lat: true, lng: true },
      orderBy: { nombre: 'asc' },
    });
    return filas.map((f) => ({ id: f.id, nombre: f.nombre, lat: Number(f.lat), lng: Number(f.lng) }));
  }

  async ofertas(
    cliente: ClienteBd,
    ahora: Date,
    acopios: AcopioMotor[],
    categoriaIds?: string[],
  ): Promise<OfertaDetallada[]> {
    if (acopios.length === 0) return [];
    const ids = acopios.map((a) => a.id);
    const hoyFecha = hoyEnBogota(ahora);
    const hoy = dia(hoyFecha);
    const porCategoria = categoriaIds ? { in: categoriaIds } : undefined;
    const saldos = await cliente.saldo.findMany({
      where: { acopio_id: { in: ids }, categoria_id: porCategoria },
    });
    const umbrales = await cliente.umbral.findMany({
      where: { acopio_id: { in: ids }, categoria_id: porCategoria },
    });
    const noRecibir = await cliente.noRecibir.findMany({
      where: {
        acopio_id: { in: ids },
        categoria_id: porCategoria,
        OR: [{ hasta: null }, { hasta: { gte: hoyFecha } }],
      },
      select: { acopio_id: true, categoria_id: true },
    });
    const comprometidos = await cliente.$queryRaw<
      { acopio_id: string; categoria_id: string; total: Prisma.Decimal }[]
    >`
      SELECT r.acopio_origen_id AS acopio_id, l.categoria_id, SUM(l.cantidad_planeada) AS total
      FROM linea_remision l JOIN remision r ON r.id = l.remision_id
      WHERE r.estado = 'BORRADOR' AND r.acopio_origen_id IN (${uuids(ids)})
      GROUP BY r.acopio_origen_id, l.categoria_id`;

    const pares = new Map<string, { acopioId: string; categoriaId: string }>();
    for (const f of [...saldos, ...umbrales])
      pares.set(clave(f.acopio_id, f.categoria_id), { acopioId: f.acopio_id, categoriaId: f.categoria_id });
    const categorias = await cliente.categoria.findMany({
      where: { id: { in: [...new Set([...pares.values()].map((p) => p.categoriaId))] } },
      select: { id: true, perecedero: true },
    });
    const perecederas = categorias.filter((c) => c.perecedero).map((c) => c.id);
    const movimientos = perecederas.length
      ? await cliente.movimiento.findMany({
          where: { acopio_id: { in: ids }, categoria_id: { in: perecederas } },
          select: { acopio_id: true, categoria_id: true, tipo: true, signo: true, cantidad: true, vence_en: true },
        })
      : [];

    const saldo = new Map(saldos.map((s) => [clave(s.acopio_id, s.categoria_id), Number(s.cantidad)]));
    const umbral = new Map(
      umbrales.map((u) => [clave(u.acopio_id, u.categoria_id), { minimo: Number(u.minimo), maximo: Number(u.maximo) }]),
    );
    const noRecibe = new Set(noRecibir.map((n) => clave(n.acopio_id, n.categoria_id)));
    const comprometido = new Map(
      comprometidos.map((c) => [clave(c.acopio_id, c.categoria_id), Number(c.total)]),
    );

    return [...pares.values()].map(({ acopioId, categoriaId }) => {
      const k = clave(acopioId, categoriaId);
      const e = {
        saldo: saldo.get(k) ?? 0,
        umbral: umbral.get(k) ?? null,
        noRecibe: noRecibe.has(k),
        comprometido: comprometido.get(k) ?? 0,
      };
      const calculo = estadoAcopio(
        {
          ...e,
          perecedero: perecederas.includes(categoriaId),
          movimientos: movimientos
            .filter((m) => m.acopio_id === acopioId && m.categoria_id === categoriaId)
            .filter(
              (m): m is typeof m & { tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE' } => m.tipo !== 'RECEPCION',
            )
            .map((m) => ({
              tipo: m.tipo,
              signo: m.signo as 1 | -1,
              cantidad: Number(m.cantidad),
              venceEn: m.vence_en ? dia(m.vence_en) : null,
            })),
        },
        hoy,
      );
      return { acopioId, categoriaId, ...e, ...calculo };
    });
  }

  async categorias(cliente: ClienteBd, ids: string[]): Promise<CategoriaMotor[]> {
    const filas = await cliente.categoria.findMany({
      where: { id: { in: [...new Set(ids)] } },
      select: { id: true, nombre: true, unidad_base: true },
      orderBy: { nombre: 'asc' },
    });
    return filas.map((c) => ({ id: c.id, nombre: c.nombre, unidad: c.unidad_base }));
  }
}
```

- [ ] **Paso 4: `NecesidadService`**

`apps/api/src/modulos/motor/necesidad.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { VIGENCIA_REPORTE_DIAS, coberturaGlobal, estadoZona } from '@acopio/shared';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { PrismaService } from '../../comun/prisma/prisma.service';
import { BitacoraService } from '../auditoria/bitacora.service';
import { AlcanceService } from '../identidad/autenticacion/alcance.service';
import { EstadoMotorService } from './estado-motor.service';

/** C10 Ficha de zona (RF-MOT-002, 003) y excedentes de un acopio (RF-MOT-004). */
@Injectable()
export class NecesidadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bitacora: BitacoraService,
    private readonly alcance: AlcanceService,
    private readonly estado: EstadoMotorService,
  ) {}

  async ficha(usuario: UsuarioAutenticado, zonaId: string, ahora = new Date()) {
    await this.alcance.exigir(usuario, 'ZONA', zonaId);
    const z = await this.prisma.zona.findUnique({ where: { id: zonaId }, include: { emergencia: true } });
    if (!z) throw new ErrorDominio('ZONA_NO_ENCONTRADA', 'La zona no existe', 404);
    const zonas = await this.estado.zonas(this.prisma, { zonaIds: [zonaId] });
    const demandas = await this.estado.demandas(this.prisma, ahora, zonas);
    const cats = await this.estado.categorias(this.prisma, demandas.map((d) => d.categoriaId));
    const categorias = demandas
      .map((d) => {
        const c = cats.find((x) => x.id === d.categoriaId)!;
        const e = estadoZona(d.necesidad, d.recibido, d.enCamino);
        return {
          categoriaId: d.categoriaId,
          categoria: c.nombre,
          unidad: c.unidad,
          origen: d.origen,
          cantidadPersonaDia: d.cantidadPersonaDia,
          fuenteCanasta: d.fuenteCanasta,
          manual: d.manual,
          necesidad: d.necesidad,
          recibido: d.recibido,
          enCamino: d.enCamino,
          deficit: e?.deficit ?? 0,
          cobertura: e?.cobertura ?? null,
        };
      })
      .sort((x, y) => x.categoria.localeCompare(y.categoria, 'es'));
    const conCobertura = categorias.filter((c) => c.cobertura !== null);
    const masBaja = conCobertura.reduce<(typeof conCobertura)[number] | null>(
      (min, c) => (!min || c.cobertura! < min.cobertura! ? c : min),
      null,
    );
    return {
      zona: {
        id: z.id,
        nombre: z.nombre,
        municipio: z.municipio,
        poblacionEstimada: z.poblacion_estimada,
        poblacionFuente: z.poblacion_fuente,
        poblacionFecha: z.poblacion_fecha,
        emergencia: {
          id: z.emergencia.id,
          nombre: z.emergencia.nombre,
          estado: z.emergencia.estado,
          horizonteDias: z.emergencia.horizonte_dias,
        },
      },
      categorias,
      coberturaGlobal: coberturaGlobal(conCobertura.map((c) => c.cobertura!)),
      categoriaMasBaja: masBaja
        ? { categoriaId: masBaja.categoriaId, categoria: masBaja.categoria, cobertura: masBaja.cobertura! }
        : null,
      reportes: await this.reportesVigentes(zonaId, ahora),
    };
  }

  /** RF-MOT-011: el último reporte de cada categoría, si no está resuelto y es reciente. */
  private async reportesVigentes(zonaId: string, ahora: Date) {
    const filas = await this.prisma.$queryRaw<
      { categoria_id: string; categoria: string; nota: string | null; reportado_en: Date }[]
    >`
      SELECT t.categoria_id, t.categoria, t.nota, t.reportado_en FROM (
        SELECT DISTINCT ON (r.categoria_id)
               r.categoria_id, c.nombre AS categoria, r.nota, r.resuelta, r.reportado_en
        FROM reporte_necesidad r JOIN categoria c ON c.id = r.categoria_id
        WHERE r.zona_id = ${zonaId}::uuid
        ORDER BY r.categoria_id, r.reportado_en DESC
      ) t
      WHERE NOT t.resuelta
        AND t.reportado_en >= ${ahora}::timestamptz - make_interval(days => ${VIGENCIA_REPORTE_DIAS}::int)
      ORDER BY t.reportado_en DESC`;
    return filas.map((f) => ({
      categoriaId: f.categoria_id,
      categoria: f.categoria,
      nota: f.nota,
      reportadoEn: f.reportado_en,
    }));
  }

  async ponerManual(
    admin: UsuarioAutenticado,
    zonaId: string,
    categoriaId: string,
    datos: { cantidad: number | null; motivo: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const zona = await tx.zona.findUnique({
        where: { id: zonaId },
        include: { emergencia: { select: { estado: true } } },
      });
      if (!zona) throw new ErrorDominio('ZONA_NO_ENCONTRADA', 'La zona no existe', 404);
      if (zona.emergencia.estado === 'CERRADA') {
        throw new ErrorDominio(
          'ZONA_SOLO_LECTURA',
          'La emergencia está cerrada: sus zonas quedan en solo lectura',
          409,
        );
      }
      const cat = await tx.categoria.findUnique({ where: { id: categoriaId } });
      if (!cat || cat.archivada)
        throw new ErrorDominio('CATEGORIA_NO_ENCONTRADA', 'La categoría no existe', 404);
      const previa = await tx.necesidadManual.findFirst({
        where: { zona_id: zonaId, categoria_id: categoriaId },
        orderBy: { puesta_en: 'desc' },
      });
      const motivo = datos.motivo.trim();
      const fila = await tx.necesidadManual.create({
        data: {
          zona_id: zonaId,
          categoria_id: categoriaId,
          cantidad: datos.cantidad,
          motivo,
          puesta_por: admin.id,
          puesta_en: new Date(),
        },
      });
      await this.bitacora.registrar(tx, {
        usuarioId: admin.id,
        accion: 'necesidad.manual',
        entidad: 'necesidad_manual',
        entidadId: fila.id,
        ubicacionId: zonaId,
        antes: {
          categoria: cat.nombre,
          cantidad: previa?.cantidad != null ? Number(previa.cantidad) : null,
        },
        despues: { categoria: cat.nombre, cantidad: datos.cantidad, motivo },
      });
      return { categoriaId, cantidad: datos.cantidad, motivo, puestaEn: fila.puesta_en };
    });
  }

  async excedentes(usuario: UsuarioAutenticado, acopioId: string, ahora = new Date()) {
    await this.alcance.exigir(usuario, 'ACOPIO', acopioId);
    const acopios = await this.estado.acopios(this.prisma, { acopioIds: [acopioId] });
    if (acopios.length === 0) throw new ErrorDominio('ACOPIO_NO_ENCONTRADO', 'El acopio no existe', 404);
    const ofertas = await this.estado.ofertas(this.prisma, ahora, acopios);
    const cats = await this.estado.categorias(this.prisma, ofertas.map((o) => o.categoriaId));
    return ofertas
      .map((o) => {
        const c = cats.find((x) => x.id === o.categoriaId)!;
        return {
          categoriaId: o.categoriaId,
          categoria: c.nombre,
          unidad: c.unidad,
          saldo: o.saldo,
          umbral: o.umbral,
          noRecibe: o.noRecibe,
          superavit: o.superavit,
          comprometido: o.comprometido,
          vencido: o.vencido,
          movible: o.movible,
          diasParaVencer: o.diasParaVencer,
          aviso: o.aviso,
        };
      })
      .sort((x, y) => x.categoria.localeCompare(y.categoria, 'es'));
  }
}
```

`AlcanceService.exigir` deja pasar al Administrador y exige la asignación a los demás, así
que con los roles del controlador basta.

- [ ] **Paso 5: controlador, DTO y módulo**

En `apps/api/src/comun/respuestas.ts`, al final:

```ts
// ── Motor (Bloque 4) ────────────────────────────────────────────────────────
const unidad = z.enum(['LITRO', 'KILOGRAMO', 'UNIDAD']);
const componentes = z.object({
  criticidad: z.number(),
  urgencia: z.number(),
  proximidad: z.number(),
  magnitud: z.number(),
});

export class FichaZonaDto extends createZodDto(
  z.object({
    zona: z.object({
      id: z.uuid(),
      nombre: z.string(),
      municipio: z.string(),
      poblacionEstimada: z.number().int(),
      poblacionFuente: z.string(),
      poblacionFecha: fecha,
      emergencia: z.object({
        id: z.uuid(),
        nombre: z.string(),
        estado: z.enum(['ACTIVA', 'EN_SEGUIMIENTO', 'CERRADA']),
        horizonteDias: z.number().int(),
      }),
    }),
    categorias: z.array(
      z.object({
        categoriaId: z.uuid(),
        categoria: z.string(),
        unidad,
        origen: z.enum(['CANASTA', 'MANUAL']),
        cantidadPersonaDia: z.number().nullable(),
        fuenteCanasta: z.string().nullable(),
        manual: z
          .object({ cantidad: z.number(), motivo: z.string(), puestaPor: z.string(), puestaEn: fecha })
          .nullable(),
        necesidad: z.number(),
        recibido: z.number(),
        enCamino: z.number(),
        deficit: z.number(),
        cobertura: z.number().nullable(),
      }),
    ),
    coberturaGlobal: z.number().nullable(),
    categoriaMasBaja: z
      .object({ categoriaId: z.uuid(), categoria: z.string(), cobertura: z.number() })
      .nullable(),
    reportes: z.array(
      z.object({ categoriaId: z.uuid(), categoria: z.string(), nota: z.string().nullable(), reportadoEn: fecha }),
    ),
  }),
) {}

export class NecesidadManualDto extends createZodDto(
  z.object({
    categoriaId: z.uuid(),
    cantidad: z.number().nullable(),
    motivo: z.string(),
    puestaEn: fecha,
  }),
) {}

export class ExcedenteDto extends createZodDto(
  z.object({
    categoriaId: z.uuid(),
    categoria: z.string(),
    unidad,
    saldo: z.number(),
    umbral: z.object({ minimo: z.number(), maximo: z.number() }).nullable(),
    noRecibe: z.boolean(),
    superavit: z.number(),
    comprometido: z.number(),
    vencido: z.number(),
    movible: z.number(),
    diasParaVencer: z.number().int().nullable(),
    aviso: z.enum(['SIN_UMBRAL']).nullable(),
  }),
) {}
```

`componentes` lo usan `SugerenciaDto` (tarea 6) y `ConfiguracionMotorDto` (tarea 7); se
declara aquí para que viva junto a los demás esquemas del motor.

`apps/api/src/modulos/motor/necesidad.controller.ts`:

```ts
import { Body, Controller, Get, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Roles, UsuarioActual } from '../../comun/autorizacion/decoradores';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDto, ExcedenteDto, FichaZonaDto, NecesidadManualDto } from '../../comun/respuestas';
import { cantidadNoNegativa } from '../../comun/validacion/cantidades';
import { NecesidadService } from './necesidad.service';

class ManualDto extends createZodDto(
  z.object({
    cantidad: cantidadNoNegativa.nullable(),
    motivo: z.string().trim().min(10).max(280),
  }),
) {}

const errores = { status: 'default' as const, type: ErrorDto, description: 'Error' };

/** C10 Ficha de zona y excedentes de un acopio (RF-MOT-002 a 004). */
@ApiTags('motor')
@ApiBearerAuth()
@Controller()
export class NecesidadController {
  constructor(private readonly necesidad: NecesidadService) {}

  @Roles('ADMIN', 'RECEPTOR')
  @Get('zonas/:id/necesidad')
  @ApiOkResponse({ type: FichaZonaDto })
  @ApiResponse(errores)
  ficha(@UsuarioActual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.necesidad.ficha(u, id);
  }

  @Roles('ADMIN')
  @Put('zonas/:id/necesidad-manual/:categoriaId')
  @ApiOkResponse({ type: NecesidadManualDto })
  @ApiResponse(errores)
  ponerManual(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('categoriaId', ParseUUIDPipe) categoriaId: string,
    @Body() datos: ManualDto,
  ) {
    return this.necesidad.ponerManual(admin, id, categoriaId, datos);
  }

  @Roles('ADMIN', 'OPERADOR')
  @Get('acopios/:id/excedentes')
  @ApiOkResponse({ type: ExcedenteDto, isArray: true })
  @ApiResponse(errores)
  excedentes(@UsuarioActual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.necesidad.excedentes(u, id);
  }
}
```

`apps/api/src/modulos/motor/motor.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { EstadoMotorService } from './estado-motor.service';
import { NecesidadController } from './necesidad.controller';
import { NecesidadService } from './necesidad.service';

/** Motor (Bloque 4): necesidad, excedentes, sugerencias y remisiones. Nadie lo importa. */
@Module({
  controllers: [NecesidadController],
  providers: [EstadoMotorService, NecesidadService],
})
export class MotorModule {}
```

En `apps/api/src/app.module.ts`, importar `MotorModule` y agregarlo después de
`ComprobantesModule`.

- [ ] **Paso 6: correr las pruebas**

Run: el comando del paso 2. Esperado: PASS.

- [ ] **Paso 7: verificar y commit**

```bash
cd apps/api && bun run typecheck && bun run depcruise && bun run test && PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439 bun run test:int && cd ../.. && bun run lint && git add apps/api/src && git commit -m "API: módulo motor con la ficha de zona, la necesidad manual y los excedentes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 5: población con fuente nueva (RF-MOT-012)

**Archivos:**
- Modificar: `apps/api/src/modulos/acopios/zonas.service.ts`
- Crear: `apps/api/src/pruebas-integracion/zonas-poblacion.int.test.ts`

**Interfaces:**
- Produce: `PATCH /api/zonas/:id` responde 422 `POBLACION_SIN_FUENTE_NUEVA` si cambia
  `poblacionEstimada` sin traer `poblacionFuente` y una `poblacionFecha` distinta de la
  guardada.

Un número nuevo puede venir de la misma fuente con otra fecha (la alcaldía actualiza su
conteo), así que la fuente se exige en la petición, aunque repita el texto, y lo que
tiene que cambiar es la fecha.

- [ ] **Paso 1: pruebas que fallan**

`apps/api/src/pruebas-integracion/zonas-poblacion.int.test.ts`:

```ts
import {
  ADMIN,
  EMERGENCIA_PRUEBA,
  crearAppPrueba,
  iniciarSesion,
  unico,
  type AppPrueba,
} from '../../test/app-prueba';

/** RF-MOT-012: la población cambia con su fuente y su fecha. */
describe('población de una zona', () => {
  let a: AppPrueba;
  let token: string;
  let zona: string;
  const como = (t: string) => ({ authorization: `Bearer ${t}` });

  beforeAll(async () => {
    a = await crearAppPrueba();
    token = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
    zona = (
      await a.prisma.zona.create({
        data: {
          emergencia_id: EMERGENCIA_PRUEBA,
          nombre: unico('Zona población '),
          municipio: 'Mocoa',
          lat: 1.15,
          lng: -76.65,
          poblacion_estimada: 1000,
          poblacion_fuente: 'DANE 2020-2035',
          poblacion_fecha: new Date('2026-09-01T00:00:00Z'),
        },
      })
    ).id;
  });
  afterAll(() => a.cerrar());

  const patch = (cuerpo: object) => a.http().patch(`/api/zonas/${zona}`).set(como(token)).send(cuerpo);

  it('un número nuevo sin fuente ni fecha no se guarda', async () => {
    const r = await patch({ poblacionEstimada: 1500 }).expect(422);
    expect(r.body.codigo).toBe('POBLACION_SIN_FUENTE_NUEVA');
  });

  it('con la misma fecha tampoco', async () => {
    const r = await patch({
      poblacionEstimada: 1500,
      poblacionFuente: 'Alcaldía de Mocoa',
      poblacionFecha: '2026-09-01',
    }).expect(422);
    expect(r.body.codigo).toBe('POBLACION_SIN_FUENTE_NUEVA');
  });

  it('con fuente y fecha nuevas se guarda y la bitácora tiene el antes y el después', async () => {
    const r = await patch({
      poblacionEstimada: 1500,
      poblacionFuente: 'Alcaldía de Mocoa',
      poblacionFecha: '2026-10-05',
    }).expect(200);
    expect(r.body).toMatchObject({ poblacionEstimada: 1500, poblacionFuente: 'Alcaldía de Mocoa' });
    const b = await a.prisma.bitacora.findFirst({
      where: { accion: 'zona.actualizada', entidad_id: zona },
      orderBy: { creado_en: 'desc' },
    });
    expect(b?.antes).toMatchObject({ poblacionEstimada: 1000 });
    expect(b?.despues).toMatchObject({ poblacionEstimada: 1500 });
  });

  it('cambiar otro campo sin tocar la población no exige fuente', async () => {
    await patch({ nombre: unico('Zona renombrada ') }).expect(200);
  });
});
```

Si la columna de fecha de `bitacora` no se llama `creado_en`, usar la que tenga el modelo.

Run: `cd apps/api && PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439 bunx jest -c jest.int.config.cjs --runInBand src/pruebas-integracion/zonas-poblacion.int.test.ts`.
Esperado: FAIL, los dos primeros casos responden 200.

- [ ] **Paso 2: implementación**

En `ZonasService.actualizar`, después de `exigirEmergenciaAbierta(tx, antes.emergencia_id)`:

```ts
      // RF-MOT-012: un número nuevo llega con su fuente y la fecha de esa estimación
      if (
        cambios.poblacionEstimada !== undefined &&
        cambios.poblacionEstimada !== antes.poblacion_estimada &&
        (!cambios.poblacionFuente?.trim() ||
          !cambios.poblacionFecha ||
          cambios.poblacionFecha.getTime() === antes.poblacion_fecha.getTime())
      ) {
        throw new ErrorDominio(
          'POBLACION_SIN_FUENTE_NUEVA',
          'Un número nuevo de población necesita su fuente y la fecha de esa estimación',
        );
      }
```

- [ ] **Paso 3: correr las pruebas, verificar y commit**

```bash
cd apps/api && bun run typecheck && PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439 bun run test:int && cd ../.. && bun run lint && git add apps/api/src && git commit -m "API: la población de una zona cambia solo con fuente y fecha nuevas (RF-MOT-012)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

`test:int` completo: otras suites editan zonas y alguna puede cambiar la población sin
fuente.

---

### Tarea 6: recálculo y ranking

**Archivos:**
- Crear: `apps/api/src/modulos/motor/configuracion.ts`,
  `apps/api/src/modulos/motor/sugerencias.service.ts`,
  `apps/api/src/modulos/motor/sugerencias.controller.ts`,
  `apps/api/src/modulos/motor/vistas.ts`,
  `apps/api/src/pruebas-integracion/sugerencias.int.test.ts`,
  `apps/api/src/pruebas-integracion/motor-rendimiento.int.test.ts`
- Modificar: `apps/api/src/modulos/motor/motor.module.ts`, `apps/api/src/comun/respuestas.ts`

**Interfaces:**
- Consume: `EstadoMotorService` (tarea 4); `emparejar`, `clavePar`,
  `BLOQUEO_DESCARTE_HORAS`, `PESOS_POR_DEFECTO`, `CANTIDAD_MINIMA_POR_DEFECTO` (tareas 2 y 3).
- Produce:
  - `leerConfiguracion(cliente: ClienteBd): Promise<{ pesos: Pesos; cantidadMinima: number; actualizadoEn: Date | null; actualizadoPor: string | null }>`
  - `bloquearMotor(tx: ClienteBd): Promise<void>`
  - `SugerenciasService.cargarEntrada(cliente, ahora): Promise<{ entrada: EntradaMotor; zonas: ZonaCargada[] }>`
  - `SugerenciasService.recalcular(ahora?: Date): Promise<{ ronda: Date; generadas: number }>`
    (también `@Cron` cada 15 minutos)
  - `SugerenciasService.listar(filtro)`, `GET /api/sugerencias`,
    `POST /api/sugerencias/recalcular` (ADMIN).
  - `INCLUIR_SUGERENCIA` y `aSugerenciaVista(fila)` en `vistas.ts`.

- [ ] **Paso 1: pruebas que fallan**

`apps/api/src/pruebas-integracion/sugerencias.int.test.ts`. La zona A está en (4,5;
-74,1), el acopio A a unos 12 km y el B a unos 23 km.

```ts
import {
  ACOPIO_A,
  ACOPIO_B,
  ADMIN,
  EMERGENCIA_PRUEBA,
  ZONA_A,
  crearAppPrueba,
  crearUsuarioActivo,
  iniciarSesion,
  unico,
  type AppPrueba,
} from '../../test/app-prueba';
import { SugerenciasService } from '../modulos/motor/sugerencias.service';

/** RF-MOT-005 y 006: el recálculo y el ranking. */
describe('sugerencias', () => {
  let a: AppPrueba;
  let motor: SugerenciasService;
  let tokenAdmin: string;
  let adminId: string;
  let cat: string;
  const como = (t: string) => ({ authorization: `Bearer ${t}` });

  const propuestas = () =>
    a.prisma.sugerencia.findMany({
      where: { categoria_id: cat, estado: 'PROPUESTA' },
      orderBy: { puntaje: 'desc' },
    });

  beforeAll(async () => {
    a = await crearAppPrueba();
    motor = a.app.get(SugerenciasService);
    tokenAdmin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
    adminId = (await a.prisma.usuario.findFirstOrThrow({ where: { username: ADMIN.username } })).id;
    cat = (await a.prisma.categoria.create({ data: { nombre: unico('Agua ranking '), grupo: 'AGUA_Y_BEBIDAS', unidad_base: 'LITRO' } })).id;
    await a.prisma.necesidadManual.create({
      data: { zona_id: ZONA_A, categoria_id: cat, cantidad: 1000, motivo: 'Necesidad de prueba del motor', puesta_por: adminId },
    });
    for (const acopio of [ACOPIO_A, ACOPIO_B]) {
      await a.prisma.movimiento.create({
        data: { acopio_id: acopio, categoria_id: cat, tipo: 'ENTRADA', signo: 1, cantidad: 900, usuario_id: adminId, ocurrido_en: new Date() },
      });
      await a.prisma.umbral.create({
        data: { acopio_id: acopio, categoria_id: cat, minimo: 100, maximo: 400, actualizado_por: adminId },
      });
    }
  });
  afterAll(() => a.cerrar());

  it('propone desde los dos acopios, el más cercano primero, con justificación y desglose', async () => {
    const r = await motor.recalcular();
    expect(r.generadas).toBeGreaterThanOrEqual(2);
    const s = await propuestas();
    expect(s.map((x) => [x.acopio_id, Number(x.cantidad)])).toEqual([
      [ACOPIO_A, 500],
      [ACOPIO_B, 500],
    ]);
    expect(s[0]!.justificacion).toMatch(/Zona A tiene 0 % de cobertura/);
    expect(s[0]!.desglose).toEqual(
      expect.objectContaining({ criticidad: 1, urgencia: 0, magnitud: 1 }),
    );
    expect(s[0]!.emergencia_id).toBe(EMERGENCIA_PRUEBA);
  });

  it('un recálculo reemplaza las propuestas', async () => {
    const antes = (await propuestas()).map((x) => x.id);
    await motor.recalcular();
    const despues = (await propuestas()).map((x) => x.id);
    expect(despues).toHaveLength(antes.length);
    expect(despues.some((id) => antes.includes(id))).toBe(false);
  });

  it('un par descartado hace menos de 24 horas no se propone; después sí', async () => {
    const descartada = await a.prisma.sugerencia.create({
      data: {
        ronda: new Date(),
        emergencia_id: EMERGENCIA_PRUEBA,
        acopio_id: ACOPIO_B,
        zona_id: ZONA_A,
        categoria_id: cat,
        cantidad: 10,
        puntaje: 0.1,
        desglose: {},
        justificacion: 'Descartada en la prueba',
        estado: 'DESCARTADA',
        motivo_descarte: 'El camino está cerrado',
        decidida_por: adminId,
        decidida_en: new Date(),
      },
    });
    await motor.recalcular();
    expect((await propuestas()).map((x) => x.acopio_id)).toEqual([ACOPIO_A]);
    await motor.recalcular(new Date(descartada.decidida_en!.getTime() + 25 * 3_600_000));
    expect((await propuestas()).map((x) => x.acopio_id)).toContain(ACOPIO_B);
  });

  it('un acopio cerrado no propone', async () => {
    await a.prisma.acopio.update({ where: { id: ACOPIO_B }, data: { estado: 'CERRADO' } });
    try {
      await motor.recalcular(new Date(Date.now() + 25 * 3_600_000));
      expect((await propuestas()).map((x) => x.acopio_id)).toEqual([ACOPIO_A]);
    } finally {
      await a.prisma.acopio.update({ where: { id: ACOPIO_B }, data: { estado: 'ACTIVO' } });
    }
  });

  it('una zona de una emergencia cerrada no recibe propuestas', async () => {
    const cerrada = await a.prisma.emergencia.create({
      data: { nombre: unico('Cerrada motor '), tipo: 'Sequía', inicio: new Date('2026-01-01T00:00:00Z'), destacada_hasta: new Date('2026-02-01T00:00:00Z'), estado: 'CERRADA', cerrada_en: new Date(), motivo_cierre: 'Terminó' },
    });
    const z = await a.prisma.zona.create({
      data: { emergencia_id: cerrada.id, nombre: unico('Zona cerrada motor '), municipio: 'Bogotá', lat: 4.6, lng: -74.08, poblacion_estimada: 100, poblacion_fuente: 'Prueba', poblacion_fecha: new Date() },
    });
    await a.prisma.necesidadManual.create({
      data: { zona_id: z.id, categoria_id: cat, cantidad: 300, motivo: 'Necesidad en zona cerrada', puesta_por: adminId },
    });
    await motor.recalcular();
    expect((await propuestas()).some((x) => x.zona_id === z.id)).toBe(false);
  });

  it('el ranking por la API se filtra por categoría y es solo del Administrador', async () => {
    const r = await a
      .http()
      .post('/api/sugerencias/recalcular')
      .set(como(tokenAdmin))
      .expect(200);
    expect(r.body.generadas).toEqual(expect.any(Number));
    const lista = await a
      .http()
      .get(`/api/sugerencias?categoria=${cat}`)
      .set(como(tokenAdmin))
      .expect(200);
    expect(lista.body[0]).toMatchObject({
      estado: 'PROPUESTA',
      acopio: { id: ACOPIO_A, nombre: 'Acopio A' },
      zona: { id: ZONA_A, nombre: 'Zona A' },
      categoria: { id: cat, unidad: 'LITRO' },
      cantidad: 500,
      justificacion: expect.stringContaining('Acopio A'),
    });
    const op = await crearUsuarioActivo(a, tokenAdmin, { rol: 'OPERADOR' });
    await a.http().get('/api/sugerencias').set(como(op.token)).expect(403);
  });
});
```

`apps/api/src/pruebas-integracion/motor-rendimiento.int.test.ts`:

```ts
import {
  ADMIN,
  ENTIDAD_PRUEBA,
  HORARIO_PRUEBA,
  crearAppPrueba,
  unico,
  type AppPrueba,
} from '../../test/app-prueba';
import { SugerenciasService } from '../modulos/motor/sugerencias.service';

/** RF-MOT-005: con 50 zonas, 20 acopios y 40 categorías, el recálculo tarda menos de 5 s. */
describe('rendimiento del motor', () => {
  let a: AppPrueba;
  let emergencia: string;
  let acopios: string[];

  beforeAll(async () => {
    a = await crearAppPrueba();
    const adminId = (await a.prisma.usuario.findFirstOrThrow({ where: { username: ADMIN.username } })).id;
    emergencia = (
      await a.prisma.emergencia.create({
        data: { nombre: unico('Rendimiento '), tipo: 'Inundación', inicio: new Date('2026-09-01T00:00:00Z'), destacada_hasta: new Date('2099-01-01T00:00:00Z') },
      })
    ).id;
    const categorias: string[] = [];
    for (let i = 0; i < 40; i++)
      categorias.push(
        (await a.prisma.categoria.create({ data: { nombre: unico(`Rend ${i} `), grupo: 'ALIMENTOS', unidad_base: 'KILOGRAMO' } })).id,
      );
    const zonas: string[] = [];
    for (let i = 0; i < 50; i++)
      zonas.push(
        (
          await a.prisma.zona.create({
            data: { emergencia_id: emergencia, nombre: unico(`Rend zona ${i} `), municipio: 'Mocoa', lat: 1 + i * 0.01, lng: -76.6, poblacion_estimada: 500, poblacion_fuente: 'Prueba', poblacion_fecha: new Date() },
          })
        ).id,
      );
    acopios = [];
    for (let i = 0; i < 20; i++)
      acopios.push(
        (
          await a.prisma.acopio.create({
            data: { entidad_id: ENTIDAD_PRUEBA, nombre: unico(`Rend acopio ${i} `), direccion: 'Calle 1', municipio: 'Mocoa', lat: 1.2 + i * 0.01, lng: -76.5, horario: HORARIO_PRUEBA },
          })
        ).id,
      );
    await a.prisma.necesidadManual.createMany({
      data: zonas.flatMap((z) =>
        categorias.map((c) => ({ zona_id: z, categoria_id: c, cantidad: 100, motivo: 'Carga de rendimiento', puesta_por: adminId })),
      ),
    });
    await a.prisma.movimiento.createMany({
      data: acopios.flatMap((ac) =>
        categorias.map((c) => ({ acopio_id: ac, categoria_id: c, tipo: 'ENTRADA' as const, signo: 1, cantidad: 300, usuario_id: adminId, ocurrido_en: new Date() })),
      ),
    });
    await a.prisma.umbral.createMany({
      data: acopios.flatMap((ac) =>
        categorias.map((c) => ({ acopio_id: ac, categoria_id: c, minimo: 10, maximo: 50, actualizado_por: adminId })),
      ),
    });
  }, 120_000);

  afterAll(async () => {
    // La base es una para todas las suites: estas zonas y acopios salen del cálculo
    await a.prisma.emergencia.update({
      where: { id: emergencia },
      data: { estado: 'CERRADA', cerrada_en: new Date(), motivo_cierre: 'Fin de la prueba' },
    });
    await a.prisma.acopio.updateMany({ where: { id: { in: acopios } }, data: { estado: 'CERRADO' } });
    await a.cerrar();
  });

  it('recalcula en menos de 5 s', async () => {
    const motor = a.app.get(SugerenciasService);
    const inicio = performance.now();
    const r = await motor.recalcular();
    const ms = performance.now() - inicio;
    expect(r.generadas).toBeGreaterThan(0);
    expect(ms).toBeLessThan(5000);
  }, 30_000);
});
```

`HORARIO_PRUEBA` ya está exportado de `test/app-prueba.ts`.

Run: `cd apps/api && PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439 bunx jest -c jest.int.config.cjs --runInBand src/pruebas-integracion/sugerencias.int.test.ts`.
Esperado: FAIL, no encuentra `sugerencias.service`.

- [ ] **Paso 2: configuración y candado**

`apps/api/src/modulos/motor/configuracion.ts`:

```ts
import {
  CANTIDAD_MINIMA_POR_DEFECTO,
  PESOS_POR_DEFECTO,
  type Pesos,
} from '@acopio/shared';
import type { ClienteBd } from '../../comun/prisma/cliente-bd';

/** La fila única de configuracion_motor; sin fila, los valores por defecto. */
export async function leerConfiguracion(cliente: ClienteBd) {
  const fila = await cliente.configuracionMotor.findUnique({
    where: { id: 1 },
    include: { actualizador: { select: { nombre: true } } },
  });
  return {
    pesos: (fila?.pesos as Pesos | undefined) ?? PESOS_POR_DEFECTO,
    cantidadMinima: fila ? Number(fila.cantidad_minima) : CANTIDAD_MINIMA_POR_DEFECTO,
    actualizadoEn: fila?.actualizado_en ?? null,
    actualizadoPor: fila?.actualizador?.nombre ?? null,
  };
}

/**
 * Ordena el recálculo y las aprobaciones entre sí. Se toma antes que cualquier candado
 * de saldo; nadie lo toma después de uno.
 */
export async function bloquearMotor(tx: ClienteBd): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('motor:sugerencias', 0))`;
}
```

- [ ] **Paso 3: `SugerenciasService` y la vista**

`apps/api/src/modulos/motor/vistas.ts`:

```ts
import type { Componentes } from '@acopio/shared';
import type { Prisma } from '../../generado/prisma/client';

export const INCLUIR_SUGERENCIA = {
  acopio: { select: { nombre: true } },
  zona: { select: { nombre: true } },
  emergencia: { select: { nombre: true } },
  categoria: { select: { nombre: true, unidad_base: true } },
  remision: { select: { codigo: true } },
  decisor: { select: { nombre: true } },
} as const;

export type FilaSugerencia = Prisma.SugerenciaGetPayload<{ include: typeof INCLUIR_SUGERENCIA }>;

export const aSugerenciaVista = (s: FilaSugerencia) => ({
  id: s.id,
  ronda: s.ronda,
  estado: s.estado,
  acopio: { id: s.acopio_id, nombre: s.acopio.nombre },
  zona: { id: s.zona_id, nombre: s.zona.nombre },
  emergencia: { id: s.emergencia_id, nombre: s.emergencia.nombre },
  categoria: { id: s.categoria_id, nombre: s.categoria.nombre, unidad: s.categoria.unidad_base },
  cantidad: Number(s.cantidad),
  puntaje: Number(s.puntaje),
  desglose: s.desglose as unknown as Componentes,
  justificacion: s.justificacion,
  cantidadAprobada: s.cantidad_aprobada === null ? null : Number(s.cantidad_aprobada),
  remisionCodigo: s.remision?.codigo ?? null,
  motivoDescarte: s.motivo_descarte,
  decididaPor: s.decisor?.nombre ?? null,
  decididaEn: s.decidida_en,
});
```

`apps/api/src/modulos/motor/sugerencias.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BLOQUEO_DESCARTE_HORAS, clavePar, emparejar, type EntradaMotor } from '@acopio/shared';
import type { ClienteBd } from '../../comun/prisma/cliente-bd';
import { PrismaService } from '../../comun/prisma/prisma.service';
import type { EstadoSugerencia } from '../../generado/prisma/enums';
import { bloquearMotor, leerConfiguracion } from './configuracion';
import { EstadoMotorService, type ZonaCargada } from './estado-motor.service';
import { INCLUIR_SUGERENCIA, aSugerenciaVista } from './vistas';

const HORA = 3_600_000;

/** C11 Motor de sugerencias (RF-MOT-005 a 007). */
@Injectable()
export class SugerenciasService {
  private readonly log = new Logger(SugerenciasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly estado: EstadoMotorService,
  ) {}

  /** Todo lo que el emparejamiento necesita, leído con el cliente de quien llama. */
  async cargarEntrada(
    cliente: ClienteBd,
    ahora: Date,
  ): Promise<{ entrada: EntradaMotor; zonas: ZonaCargada[] }> {
    const zonas = await this.estado.zonas(cliente, {});
    const acopios = await this.estado.acopios(cliente, {});
    const demandas = await this.estado.demandas(cliente, ahora, zonas);
    const ofertas = await this.estado.ofertas(cliente, ahora, acopios);
    const categorias = await this.estado.categorias(cliente, demandas.map((d) => d.categoriaId));
    const descartadas = await cliente.sugerencia.findMany({
      where: { estado: 'DESCARTADA', decidida_en: { gt: new Date(ahora.getTime() - BLOQUEO_DESCARTE_HORAS * HORA) } },
      select: { acopio_id: true, zona_id: true, categoria_id: true },
    });
    const bloqueados = new Set(descartadas.map((d) => clavePar(d.acopio_id, d.zona_id, d.categoria_id)));
    return { entrada: { zonas, acopios, categorias, demandas, ofertas, bloqueados }, zonas };
  }

  /** Cada 15 minutos y bajo demanda: borra las PROPUESTA y guarda la ronda nueva (M-04). */
  @Cron('*/15 * * * *', { name: 'motor-recalculo', timeZone: 'America/Bogota' })
  async recalcular(ahora = new Date()): Promise<{ ronda: Date; generadas: number }> {
    const r = await this.prisma.$transaction(
      async (tx) => {
        await bloquearMotor(tx);
        const { pesos, cantidadMinima } = await leerConfiguracion(tx);
        const { entrada, zonas } = await this.cargarEntrada(tx, ahora);
        const calculadas = emparejar(entrada, pesos, cantidadMinima);
        const emergencia = new Map(zonas.map((z) => [z.id, z.emergenciaId]));
        await tx.sugerencia.deleteMany({ where: { estado: 'PROPUESTA' } });
        await tx.sugerencia.createMany({
          data: calculadas.map((s) => ({
            ronda: ahora,
            emergencia_id: emergencia.get(s.zonaId)!,
            acopio_id: s.acopioId,
            zona_id: s.zonaId,
            categoria_id: s.categoriaId,
            cantidad: s.cantidad,
            puntaje: s.puntaje,
            desglose: { ...s.desglose },
            justificacion: s.justificacion,
          })),
        });
        return { ronda: ahora, generadas: calculadas.length };
      },
      { timeout: 30_000, maxWait: 10_000 },
    );
    this.log.log(`Motor: ${r.generadas} sugerencias`);
    return r;
  }

  async listar(filtro: {
    zonaId?: string;
    acopioId?: string;
    categoriaId?: string;
    estado?: EstadoSugerencia;
  }) {
    const filas = await this.prisma.sugerencia.findMany({
      where: {
        zona_id: filtro.zonaId,
        acopio_id: filtro.acopioId,
        categoria_id: filtro.categoriaId,
        estado: filtro.estado ?? 'PROPUESTA',
      },
      include: INCLUIR_SUGERENCIA,
      orderBy: [{ puntaje: 'desc' }, { cantidad: 'desc' }, { zona: { nombre: 'asc' } }],
      take: 200,
    });
    return filas.map(aSugerenciaVista);
  }
}
```

- [ ] **Paso 4: controlador, DTO y módulo**

En `apps/api/src/comun/respuestas.ts`, después de `ExcedenteDto`:

```ts
const referencia = z.object({ id: z.uuid(), nombre: z.string() });

export class SugerenciaDto extends createZodDto(
  z.object({
    id: z.uuid(),
    ronda: fecha,
    estado: z.enum(['PROPUESTA', 'APROBADA', 'DESCARTADA']),
    acopio: referencia,
    zona: referencia,
    emergencia: referencia,
    categoria: referencia.extend({ unidad }),
    cantidad: z.number(),
    puntaje: z.number(),
    desglose: componentes,
    justificacion: z.string(),
    cantidadAprobada: z.number().nullable(),
    remisionCodigo: z.string().nullable(),
    motivoDescarte: z.string().nullable(),
    decididaPor: z.string().nullable(),
    decididaEn: fecha.nullable(),
  }),
) {}

export class RecalculoDto extends createZodDto(
  z.object({ ronda: fecha, generadas: z.number().int() }),
) {}
```

`apps/api/src/modulos/motor/sugerencias.controller.ts`:

```ts
import { Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Roles } from '../../comun/autorizacion/decoradores';
import { RecalculoDto, SugerenciaDto } from '../../comun/respuestas';
import { SugerenciasService } from './sugerencias.service';

class FiltroSugerenciasDto extends createZodDto(
  z.object({
    zona: z.uuid().optional(),
    acopio: z.uuid().optional(),
    categoria: z.uuid().optional(),
    estado: z.enum(['PROPUESTA', 'APROBADA', 'DESCARTADA']).optional(),
  }),
) {}

/** C11 Motor de sugerencias. Solo el Administrador. */
@ApiTags('motor')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('sugerencias')
export class SugerenciasController {
  constructor(private readonly sugerencias: SugerenciasService) {}

  @Get()
  @ApiOkResponse({ type: SugerenciaDto, isArray: true })
  listar(@Query() f: FiltroSugerenciasDto) {
    return this.sugerencias.listar({
      zonaId: f.zona,
      acopioId: f.acopio,
      categoriaId: f.categoria,
      estado: f.estado,
    });
  }

  @Post('recalcular')
  @HttpCode(200)
  @ApiOkResponse({ type: RecalculoDto })
  recalcular() {
    return this.sugerencias.recalcular();
  }
}
```

En `motor.module.ts`, sumar `SugerenciasController` a `controllers` y
`SugerenciasService` a `providers`.

- [ ] **Paso 5: correr las pruebas**

Run: el comando del paso 1 para `sugerencias.int.test.ts` y el mismo con
`motor-rendimiento.int.test.ts`. Esperado: PASS. Si el rendimiento pasa de 5 s, medir con
`console.time` dónde se va el tiempo (lectura o `emparejar`) antes de cambiar nada, y
anotar en «Cambios al construir» lo que se cambió.

- [ ] **Paso 6: verificar y commit**

```bash
cd apps/api && bun run typecheck && bun run depcruise && bun run test && PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439 bun run test:int && cd ../.. && bun run lint && git add apps/api/src && git commit -m "API: recálculo del motor cada 15 minutos y ranking de sugerencias (RF-MOT-005, 006)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 7: configuración del motor con vista previa

**Archivos:**
- Crear: `apps/api/src/modulos/motor/configuracion.service.ts`,
  `apps/api/src/modulos/motor/configuracion.controller.ts`,
  `apps/api/src/pruebas-integracion/configuracion-motor.int.test.ts`
- Modificar: `apps/api/src/modulos/motor/motor.module.ts`, `apps/api/src/comun/respuestas.ts`

**Interfaces:**
- Consume: `leerConfiguracion` (tarea 6), `SugerenciasService.cargarEntrada` (tarea 6),
  `emparejar`, `pesosValidos`, `Pesos`.
- Produce: `GET /api/motor/configuracion`, `PUT /api/motor/configuracion`,
  `POST /api/motor/configuracion/vista-previa` (ADMIN).

- [ ] **Paso 1: pruebas que fallan**

`apps/api/src/pruebas-integracion/configuracion-motor.int.test.ts`:

```ts
import { ADMIN, crearAppPrueba, crearUsuarioActivo, iniciarSesion, type AppPrueba } from '../../test/app-prueba';

/** RF-CAT-006: los pesos del motor. */
describe('configuración del motor', () => {
  let a: AppPrueba;
  let token: string;
  const como = (t: string) => ({ authorization: `Bearer ${t}` });
  const POR_DEFECTO = { criticidad: 0.45, urgencia: 0.25, proximidad: 0.15, magnitud: 0.15 };

  beforeAll(async () => {
    a = await crearAppPrueba();
    token = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
  });
  afterAll(async () => {
    // La base es compartida: las demás suites cuentan con los valores por defecto
    await a.http().put('/api/motor/configuracion').set(como(token)).send({ pesos: POR_DEFECTO, cantidadMinima: 5 });
    await a.cerrar();
  });

  it('lee los valores del seed', async () => {
    const r = await a.http().get('/api/motor/configuracion').set(como(token)).expect(200);
    expect(r.body).toMatchObject({ pesos: POR_DEFECTO, cantidadMinima: 5 });
  });

  it('guarda pesos que suman 1 con tolerancia, con bitácora', async () => {
    const pesos = { criticidad: 0.4995, urgencia: 0.25, proximidad: 0.15, magnitud: 0.1 };
    const r = await a
      .http()
      .put('/api/motor/configuracion')
      .set(como(token))
      .send({ pesos, cantidadMinima: 2 })
      .expect(200);
    expect(r.body).toMatchObject({ pesos, cantidadMinima: 2, actualizadoPor: expect.any(String) });
    expect(await a.prisma.bitacora.findFirst({ where: { accion: 'motor.configuracion' } })).not.toBeNull();
  });

  it('rechaza pesos que no suman 1', async () => {
    const r = await a
      .http()
      .put('/api/motor/configuracion')
      .set(como(token))
      .send({ pesos: { ...POR_DEFECTO, criticidad: 0.43 }, cantidadMinima: 5 })
      .expect(422);
    expect(r.body.codigo).toBe('PESOS_NO_SUMAN_UNO');
  });

  it('la vista previa devuelve los dos rankings y no guarda nada', async () => {
    const antes = await a.prisma.configuracionMotor.findUniqueOrThrow({ where: { id: 1 } });
    const r = await a
      .http()
      .post('/api/motor/configuracion/vista-previa')
      .set(como(token))
      .send({ pesos: { criticidad: 0.1, urgencia: 0.1, proximidad: 0.7, magnitud: 0.1 }, cantidadMinima: 5 })
      .expect(200);
    expect(r.body).toEqual({ actual: expect.any(Array), propuesta: expect.any(Array) });
    const despues = await a.prisma.configuracionMotor.findUniqueOrThrow({ where: { id: 1 } });
    expect(despues.actualizado_en).toEqual(antes.actualizado_en);
  });

  it('solo el Administrador', async () => {
    const op = await crearUsuarioActivo(a, token, { rol: 'OPERADOR' });
    await a.http().get('/api/motor/configuracion').set(como(op.token)).expect(403);
  });
});
```

Run: `cd apps/api && PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439 bunx jest -c jest.int.config.cjs --runInBand src/pruebas-integracion/configuracion-motor.int.test.ts`.
Esperado: FAIL con 404.

- [ ] **Paso 2: implementación**

`apps/api/src/modulos/motor/configuracion.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { emparejar, pesosValidos, type Pesos, type SugerenciaCalculada } from '@acopio/shared';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { PrismaService } from '../../comun/prisma/prisma.service';
import { BitacoraService } from '../auditoria/bitacora.service';
import { leerConfiguracion } from './configuracion';
import { SugerenciasService } from './sugerencias.service';

export interface DatosConfiguracion {
  pesos: Pesos;
  cantidadMinima: number;
}

const exigirPesos = (p: Pesos) => {
  if (!pesosValidos(p))
    throw new ErrorDominio('PESOS_NO_SUMAN_UNO', 'Los cuatro pesos deben sumar 1');
};

/** RF-CAT-006: pesos globales del motor. Cambiarlos no toca las sugerencias decididas. */
@Injectable()
export class ConfiguracionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bitacora: BitacoraService,
    private readonly sugerencias: SugerenciasService,
  ) {}

  leer() {
    return leerConfiguracion(this.prisma);
  }

  async guardar(admin: UsuarioAutenticado, d: DatosConfiguracion) {
    exigirPesos(d.pesos);
    await this.prisma.$transaction(async (tx) => {
      const antes = await leerConfiguracion(tx);
      await tx.configuracionMotor.upsert({
        where: { id: 1 },
        update: { pesos: { ...d.pesos }, cantidad_minima: d.cantidadMinima, actualizado_por: admin.id, actualizado_en: new Date() },
        create: { id: 1, pesos: { ...d.pesos }, cantidad_minima: d.cantidadMinima, actualizado_por: admin.id },
      });
      await this.bitacora.registrar(tx, {
        usuarioId: admin.id,
        accion: 'motor.configuracion',
        entidad: 'configuracion_motor',
        antes: { pesos: antes.pesos, cantidadMinima: antes.cantidadMinima },
        despues: { pesos: d.pesos, cantidadMinima: d.cantidadMinima },
      });
    });
    return this.leer();
  }

  /** El ranking con los pesos guardados y con los propuestos, sin guardar nada. */
  async vistaPrevia(d: DatosConfiguracion, ahora = new Date()) {
    exigirPesos(d.pesos);
    const actual = await leerConfiguracion(this.prisma);
    const { entrada } = await this.sugerencias.cargarEntrada(this.prisma, ahora);
    const nombre = (lista: { id: string; nombre: string }[], id: string) =>
      lista.find((x) => x.id === id)?.nombre ?? '';
    const vista = (s: SugerenciaCalculada) => ({
      acopio: nombre(entrada.acopios, s.acopioId),
      zona: nombre(entrada.zonas, s.zonaId),
      categoria: nombre(entrada.categorias, s.categoriaId),
      cantidad: s.cantidad,
      puntaje: s.puntaje,
    });
    return {
      actual: emparejar(entrada, actual.pesos, actual.cantidadMinima).slice(0, 50).map(vista),
      propuesta: emparejar(entrada, d.pesos, d.cantidadMinima).slice(0, 50).map(vista),
    };
  }
}
```

En `respuestas.ts`:

```ts
export class ConfiguracionMotorDto extends createZodDto(
  z.object({
    pesos: componentes,
    cantidadMinima: z.number(),
    actualizadoEn: fecha.nullable(),
    actualizadoPor: z.string().nullable(),
  }),
) {}

const filaVistaPrevia = z.object({
  acopio: z.string(),
  zona: z.string(),
  categoria: z.string(),
  cantidad: z.number(),
  puntaje: z.number(),
});
export class VistaPreviaMotorDto extends createZodDto(
  z.object({ actual: z.array(filaVistaPrevia), propuesta: z.array(filaVistaPrevia) }),
) {}
```

`apps/api/src/modulos/motor/configuracion.controller.ts`:

```ts
import { Body, Controller, Get, HttpCode, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Roles, UsuarioActual } from '../../comun/autorizacion/decoradores';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ConfiguracionMotorDto, ErrorDto, VistaPreviaMotorDto } from '../../comun/respuestas';
import { cantidadNoNegativa } from '../../comun/validacion/cantidades';
import { ConfiguracionService } from './configuracion.service';

const peso = z.number().min(0).max(1);
class GuardarConfiguracionDto extends createZodDto(
  z.object({
    pesos: z.object({ criticidad: peso, urgencia: peso, proximidad: peso, magnitud: peso }),
    cantidadMinima: cantidadNoNegativa,
  }),
) {}

const errores = { status: 'default' as const, type: ErrorDto, description: 'Error' };

/** RF-CAT-006. Solo el Administrador. */
@ApiTags('motor')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('motor/configuracion')
export class ConfiguracionController {
  constructor(private readonly configuracion: ConfiguracionService) {}

  @Get()
  @ApiOkResponse({ type: ConfiguracionMotorDto })
  leer() {
    return this.configuracion.leer();
  }

  @Put()
  @ApiOkResponse({ type: ConfiguracionMotorDto })
  @ApiResponse(errores)
  guardar(@UsuarioActual() admin: UsuarioAutenticado, @Body() d: GuardarConfiguracionDto) {
    return this.configuracion.guardar(admin, d);
  }

  @Post('vista-previa')
  @HttpCode(200)
  @ApiOkResponse({ type: VistaPreviaMotorDto })
  @ApiResponse(errores)
  vistaPrevia(@Body() d: GuardarConfiguracionDto) {
    return this.configuracion.vistaPrevia(d);
  }
}
```

En `motor.module.ts`, sumar `ConfiguracionController` y `ConfiguracionService`.

- [ ] **Paso 3: correr las pruebas, verificar y commit**

```bash
cd apps/api && bun run typecheck && PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439 bun run test:int && cd ../.. && bun run lint && git add apps/api/src && git commit -m "API: pesos del motor con vista previa del ranking (RF-CAT-006)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 8: aprobar y descartar

**Archivos:**
- Crear: `apps/api/src/modulos/motor/codigo-remision.test.ts`,
  `apps/api/src/modulos/motor/remisiones-borrador.service.ts`,
  `apps/api/src/pruebas-integracion/aprobar-sugerencia.int.test.ts`
- Modificar: `apps/api/src/modulos/inventario/movimientos.service.ts`,
  `apps/api/src/modulos/motor/sugerencias.service.ts`,
  `apps/api/src/modulos/motor/sugerencias.controller.ts`,
  `apps/api/src/modulos/motor/motor.module.ts`, `apps/api/src/comun/respuestas.ts`

**Interfaces:**
- Consume: `generarCodigoRemision` (tarea 4); `exigirCantidad` de
  `inventario/cantidades`; `AcopiosService.exigirAbierto`; `estadoZona`.
- Produce:
  - `candadoSaldo(tx: ClienteBd, acopioId: string, categoriaId: string): Promise<void>`
    exportada de `inventario/movimientos.service.ts`, la misma que usa `bloquearSaldo`.
  - `RemisionesBorradorService.agregarLinea(tx, usuario, { acopioId, zonaId, categoriaId, cantidad }): Promise<{ id: string; codigo: string; creada: boolean }>`.
    La etapa 2 la reutiliza.
  - `SugerenciasService.aprobar(admin, id, cantidad?)`, `descartar(admin, id, motivo)`,
    `descartes(desde?, hasta?)`; `POST /api/sugerencias/:id/aprobar`,
    `POST /api/sugerencias/:id/descartar`, `GET /api/sugerencias/descartes`.

- [ ] **Paso 1: el candado de saldo, exportado**

En `inventario/movimientos.service.ts`, junto a `exigirOcurridoEn`:

```ts
/**
 * Candado de la transacción por (acopio, categoría). Lo toman las salidas, los ajustes y
 * el motor al aprobar: así se ordenan entre sí sin FOR UPDATE (ADR-0015).
 */
export async function candadoSaldo(tx: ClienteBd, acopioId: string, categoriaId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${acopioId} || ':' || ${categoriaId}, 0))`;
}
```

Y `bloquearSaldo` pasa a usarla:

```ts
    await candadoSaldo(tx, acopioId, categoriaId);
    return this.saldoDe(tx, acopioId, categoriaId);
```

- [ ] **Paso 2: prueba del código de remisión**

`apps/api/src/modulos/motor/codigo-remision.test.ts`:

```ts
import { generarCodigoRemision } from './codigo-remision';

describe('generarCodigoRemision', () => {
  it('tiene la forma R-año-5 caracteres sin ambiguos', () => {
    expect(generarCodigoRemision(2026)).toMatch(/^R-2026-[A-HJ-NP-Z2-9]{5}$/);
  });

  it('usa el azar que recibe', () => {
    expect(generarCodigoRemision(2026, () => Buffer.from([0, 1, 2, 3, 31]))).toBe('R-2026-ABCD9');
  });
});
```

Run: `cd apps/api && bunx jest src/modulos/motor/codigo-remision.test.ts`. Esperado: PASS
(el archivo existe desde la tarea 4).

- [ ] **Paso 3: pruebas de integración que fallan**

`apps/api/src/pruebas-integracion/aprobar-sugerencia.int.test.ts`. Cada escenario crea su
categoría con necesidad en una o dos zonas y saldo en el acopio A, con el umbral máximo en
0 para que el movible sea el saldo.

```ts
import {
  ACOPIO_A,
  ADMIN,
  EMERGENCIA_PRUEBA,
  ZONA_A,
  crearAppPrueba,
  iniciarSesion,
  unico,
  type AppPrueba,
} from '../../test/app-prueba';
import { SugerenciasService } from '../modulos/motor/sugerencias.service';

/** RF-MOT-007: aprobar arma la remisión en borrador; descartar exige motivo. */
describe('aprobar y descartar sugerencias', () => {
  let a: AppPrueba;
  let motor: SugerenciasService;
  let token: string;
  let adminId: string;
  const como = (t: string) => ({ authorization: `Bearer ${t}` });

  async function escenario(opciones: { saldo: number; necesidades: [string, number][] }) {
    const cat = (await a.prisma.categoria.create({ data: { nombre: unico('Aprobar '), grupo: 'ALIMENTOS', unidad_base: 'KILOGRAMO' } })).id;
    await a.prisma.movimiento.create({
      data: { acopio_id: ACOPIO_A, categoria_id: cat, tipo: 'ENTRADA', signo: 1, cantidad: opciones.saldo, usuario_id: adminId, ocurrido_en: new Date() },
    });
    await a.prisma.umbral.create({ data: { acopio_id: ACOPIO_A, categoria_id: cat, minimo: 0, maximo: 0, actualizado_por: adminId } });
    for (const [zona, cantidad] of opciones.necesidades)
      await a.prisma.necesidadManual.create({
        data: { zona_id: zona, categoria_id: cat, cantidad, motivo: 'Necesidad de la prueba de aprobar', puesta_por: adminId },
      });
    await motor.recalcular();
    const s = await a.prisma.sugerencia.findMany({ where: { categoria_id: cat, estado: 'PROPUESTA' }, orderBy: { puntaje: 'desc' } });
    return { cat, sugerencias: s };
  }

  const aprobar = (id: string, cantidad?: number) =>
    a.http().post(`/api/sugerencias/${id}/aprobar`).set(como(token)).send(cantidad === undefined ? {} : { cantidad });

  beforeAll(async () => {
    a = await crearAppPrueba();
    motor = a.app.get(SugerenciasService);
    token = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
    adminId = (await a.prisma.usuario.findFirstOrThrow({ where: { username: ADMIN.username } })).id;
  });
  afterAll(() => a.cerrar());

  it('aprobar crea la remisión en borrador, con la cantidad editada, y la bitácora', async () => {
    const { cat, sugerencias } = await escenario({ saldo: 500, necesidades: [[ZONA_A, 400]] });
    const r = await aprobar(sugerencias[0]!.id, 300).expect(200);
    expect(r.body.remision).toMatchObject({ codigo: expect.stringMatching(/^R-\d{4}-/) });
    const remision = await a.prisma.remision.findUniqueOrThrow({
      where: { codigo: r.body.remision.codigo },
      include: { lineas: true },
    });
    expect(remision).toMatchObject({ estado: 'BORRADOR', acopio_origen_id: ACOPIO_A, zona_destino_id: ZONA_A });
    expect(remision.lineas.find((l) => l.categoria_id === cat)?.cantidad_planeada.toNumber()).toBe(300);
    const s = await a.prisma.sugerencia.findUniqueOrThrow({ where: { id: sugerencias[0]!.id } });
    expect(s).toMatchObject({ estado: 'APROBADA', remision_id: remision.id, decidida_por: adminId });
    expect(Number(s.cantidad_aprobada)).toBe(300);
    expect(
      await a.prisma.bitacora.findFirst({ where: { accion: 'sugerencia.aprobada', entidad_id: s.id } }),
    ).not.toBeNull();
  });

  it('dos aprobaciones del mismo acopio a la misma zona van en una remisión', async () => {
    const uno = await escenario({ saldo: 100, necesidades: [[ZONA_A, 100]] });
    const dos = await escenario({ saldo: 100, necesidades: [[ZONA_A, 100]] });
    const r1 = await aprobar(uno.sugerencias[0]!.id).expect(200);
    const r2 = await aprobar(dos.sugerencias[0]!.id).expect(200);
    expect(r2.body.remision.codigo).toBe(r1.body.remision.codigo);
    expect(r2.body.remision.creada).toBe(false);
    const lineas = await a.prisma.lineaRemision.count({ where: { remision: { codigo: r1.body.remision.codigo } } });
    expect(lineas).toBeGreaterThanOrEqual(2);
  });

  it('si el saldo bajó desde el cálculo, responde SUGERENCIA_DESACTUALIZADA', async () => {
    const { cat, sugerencias } = await escenario({ saldo: 200, necesidades: [[ZONA_A, 200]] });
    await a.prisma.movimiento.create({
      data: { acopio_id: ACOPIO_A, categoria_id: cat, tipo: 'SALIDA', signo: -1, cantidad: 150, motivo_salida: 'ENTREGA_FAMILIAS', usuario_id: adminId, ocurrido_en: new Date() },
    });
    const r = await aprobar(sugerencias[0]!.id).expect(409);
    expect(r.body).toMatchObject({ codigo: 'SUGERENCIA_DESACTUALIZADA', detalles: { maximo: 50 } });
  });

  it('dos aprobaciones simultáneas que juntas superan el movible: una pasa y la otra no', async () => {
    const zonaB = await a.prisma.zona.create({
      data: { emergencia_id: EMERGENCIA_PRUEBA, nombre: unico('Zona concurrencia '), municipio: 'Bogotá', lat: 4.55, lng: -74.1, poblacion_estimada: 100, poblacion_fuente: 'Prueba', poblacion_fecha: new Date() },
    });
    const { cat, sugerencias } = await escenario({ saldo: 500, necesidades: [[ZONA_A, 400], [zonaB.id, 400]] });
    const haciaA = sugerencias.find((s) => s.zona_id === ZONA_A)!;
    const haciaB = sugerencias.find((s) => s.zona_id === zonaB.id)!;
    const respuestas = await Promise.all([aprobar(haciaA.id, 400), aprobar(haciaB.id, 300)]);
    expect(respuestas.map((r) => r.status).sort()).toEqual([200, 409]);
    const planeado = await a.prisma.lineaRemision.aggregate({
      where: { categoria_id: cat },
      _sum: { cantidad_planeada: true },
    });
    expect(Number(planeado._sum.cantidad_planeada)).toBeLessThanOrEqual(500);
  });

  it('una sugerencia decidida no se aprueba otra vez; una inexistente da 404', async () => {
    const { sugerencias } = await escenario({ saldo: 50, necesidades: [[ZONA_A, 50]] });
    await aprobar(sugerencias[0]!.id).expect(200);
    expect((await aprobar(sugerencias[0]!.id).expect(409)).body.codigo).toBe('SUGERENCIA_DECIDIDA');
    expect((await aprobar('00000000-0000-4000-8000-000000000000').expect(404)).body.codigo).toBe(
      'SUGERENCIA_NO_ENCONTRADA',
    );
  });

  it('descartar exige motivo, deja bitácora y no se repite', async () => {
    const { sugerencias } = await escenario({ saldo: 60, necesidades: [[ZONA_A, 60]] });
    const id = sugerencias[0]!.id;
    const ruta = `/api/sugerencias/${id}/descartar`;
    await a.http().post(ruta).set(como(token)).send({ motivo: 'corto' }).expect(400);
    await a.http().post(ruta).set(como(token)).send({ motivo: 'La vía a la zona está cerrada' }).expect(200);
    expect(await a.prisma.sugerencia.findUniqueOrThrow({ where: { id } })).toMatchObject({
      estado: 'DESCARTADA',
      motivo_descarte: 'La vía a la zona está cerrada',
    });
    expect(await a.prisma.bitacora.findFirst({ where: { accion: 'sugerencia.descartada', entidad_id: id } })).not.toBeNull();
    const r = await a.http().post(ruta).set(como(token)).send({ motivo: 'Otro motivo cualquiera' }).expect(409);
    expect(r.body.codigo).toBe('SUGERENCIA_DECIDIDA');
  });

  it('el informe agrega los motivos de descarte', async () => {
    const r = await a.http().get('/api/sugerencias/descartes').set(como(token)).expect(200);
    expect(r.body.total).toBeGreaterThanOrEqual(1);
    expect(r.body.porMotivo).toEqual(
      expect.arrayContaining([{ nombre: 'la vía a la zona está cerrada', veces: expect.any(Number) }]),
    );
  });
});
```

En la prueba de concurrencia el movible es 500. El motor propone 400 a una zona y 100 a
la otra; aprobar la segunda con 300 cabe sola (300 ≤ 500 y ≤ 400 de déficit) y deja de
caber después de la primera. Las remisiones en borrador de otros escenarios hacia la
zona A suben su «en camino»: por eso cada escenario usa su propia categoría.

Run: `cd apps/api && PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439 bunx jest -c jest.int.config.cjs --runInBand src/pruebas-integracion/aprobar-sugerencia.int.test.ts`.
Esperado: FAIL con 404 en `/aprobar`.

- [ ] **Paso 4: `RemisionesBorradorService`**

`apps/api/src/modulos/motor/remisiones-borrador.service.ts`:

```ts
import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import type { ClienteBd } from '../../comun/prisma/cliente-bd';
import { BitacoraService } from '../auditoria/bitacora.service';
import { hoyEnBogota } from '../catalogo/emergencias.service';
import { generarCodigoRemision } from './codigo-remision';

/**
 * M-07: una sugerencia aprobada va a la remisión en BORRADOR del mismo acopio a la misma
 * zona, o crea una. Si la categoría ya tiene línea, suma a esa línea.
 */
@Injectable()
export class RemisionesBorradorService {
  constructor(private readonly bitacora: BitacoraService) {}

  async agregarLinea(
    tx: ClienteBd,
    usuario: UsuarioAutenticado,
    d: { acopioId: string; zonaId: string | null; categoriaId: string; cantidad: number },
  ): Promise<{ id: string; codigo: string; creada: boolean }> {
    let remision = await tx.remision.findFirst({
      where: { estado: 'BORRADOR', acopio_origen_id: d.acopioId, zona_destino_id: d.zonaId },
      orderBy: { creada_en: 'asc' },
      select: { id: true, codigo: true },
    });
    let creada = false;
    if (!remision) {
      const anio = hoyEnBogota().getUTCFullYear();
      let codigo = generarCodigoRemision(anio);
      // Un choque aborta la transacción: se busca antes de insertar
      while (await tx.remision.findUnique({ where: { codigo }, select: { id: true } }))
        codigo = generarCodigoRemision(anio);
      remision = await tx.remision.create({
        data: {
          codigo,
          acopio_origen_id: d.acopioId,
          zona_destino_id: d.zonaId,
          qr_token: randomBytes(18).toString('base64url'),
          creada_por: usuario.id,
        },
        select: { id: true, codigo: true },
      });
      creada = true;
      await this.bitacora.registrar(tx, {
        usuarioId: usuario.id,
        accion: 'remision.creada',
        entidad: 'remision',
        entidadId: remision.id,
        ubicacionId: d.acopioId,
        despues: { codigo, zonaId: d.zonaId },
      });
    }
    const linea = await tx.lineaRemision.findUnique({
      where: { remision_id_categoria_id: { remision_id: remision.id, categoria_id: d.categoriaId } },
    });
    if (linea) {
      await tx.lineaRemision.update({
        where: { id: linea.id },
        data: { cantidad_planeada: { increment: d.cantidad } },
      });
    } else {
      await tx.lineaRemision.create({
        data: { remision_id: remision.id, categoria_id: d.categoriaId, cantidad_planeada: d.cantidad },
      });
    }
    return { ...remision, creada };
  }
}
```

- [ ] **Paso 5: aprobar, descartar e informe**

En `sugerencias.service.ts`, agregar al constructor `RemisionesBorradorService`
(`borradores`), `BitacoraService` (`bitacora`) y `AcopiosService` (`acopios`), e importar:

```ts
import { estadoZona } from '@acopio/shared';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { AcopiosService } from '../acopios/acopios.service';
import { BitacoraService } from '../auditoria/bitacora.service';
import { exigirCantidad } from '../inventario/cantidades';
import { candadoSaldo } from '../inventario/movimientos.service';
import { RemisionesBorradorService } from './remisiones-borrador.service';
```

Funciones de error al final del archivo:

```ts
const noEncontrada = () =>
  new ErrorDominio(
    'SUGERENCIA_NO_ENCONTRADA',
    'La sugerencia ya no existe: el motor recalculó. Revisa la lista nueva',
    404,
  );
const decidida = () => new ErrorDominio('SUGERENCIA_DECIDIDA', 'Esta sugerencia ya se decidió', 409);
```

Métodos:

```ts
  /**
   * RF-MOT-007. Con el candado del motor y el de saldo, valida contra el cálculo del
   * momento (M-04) y agrega la línea a la remisión en borrador (M-07).
   */
  async aprobar(admin: UsuarioAutenticado, id: string, cantidadPedida?: number) {
    return this.prisma.$transaction(
      async (tx) => {
        await bloquearMotor(tx);
        const s = await tx.sugerencia.findUnique({
          where: { id },
          include: { categoria: { select: { nombre: true, unidad_base: true } } },
        });
        if (!s) throw noEncontrada();
        if (s.estado !== 'PROPUESTA') throw decidida();
        await this.acopios.exigirAbierto(s.acopio_id);
        const cantidad = cantidadPedida ?? Number(s.cantidad);
        exigirCantidad(cantidad, s.categoria.unidad_base);
        await candadoSaldo(tx, s.acopio_id, s.categoria_id);

        const ahora = new Date();
        const zonas = await this.estado.zonas(tx, { zonaIds: [s.zona_id] });
        const [demanda] = await this.estado.demandas(tx, ahora, zonas, [s.categoria_id]);
        const acopios = await this.estado.acopios(tx, { acopioIds: [s.acopio_id] });
        const [oferta] = await this.estado.ofertas(tx, ahora, acopios, [s.categoria_id]);
        const deficit = demanda
          ? (estadoZona(demanda.necesidad, demanda.recibido, demanda.enCamino)?.deficit ?? 0)
          : 0;
        const maximo = Math.min(oferta?.movible ?? 0, deficit);
        if (cantidad > maximo + 1e-9) {
          throw new ErrorDominio(
            'SUGERENCIA_DESACTUALIZADA',
            `La situación cambió: hoy se pueden mandar hasta ${maximo}. Recalcula el motor`,
            409,
            { maximo },
          );
        }

        const remision = await this.borradores.agregarLinea(tx, admin, {
          acopioId: s.acopio_id,
          zonaId: s.zona_id,
          categoriaId: s.categoria_id,
          cantidad,
        });
        await tx.sugerencia.update({
          where: { id },
          data: {
            estado: 'APROBADA',
            cantidad_aprobada: cantidad,
            remision_id: remision.id,
            decidida_por: admin.id,
            decidida_en: ahora,
          },
        });
        await this.bitacora.registrar(tx, {
          usuarioId: admin.id,
          accion: 'sugerencia.aprobada',
          entidad: 'sugerencia',
          entidadId: id,
          ubicacionId: s.acopio_id,
          antes: { estado: 'PROPUESTA', cantidad: Number(s.cantidad) },
          despues: {
            estado: 'APROBADA',
            categoria: s.categoria.nombre,
            cantidad,
            zonaId: s.zona_id,
            remision: remision.codigo,
          },
        });
        return { sugerenciaId: id, cantidad, remision };
      },
      { timeout: 15_000, maxWait: 10_000 },
    );
  }

  async descartar(admin: UsuarioAutenticado, id: string, motivo: string) {
    return this.prisma.$transaction(async (tx) => {
      const texto = motivo.trim();
      // Condicionado al estado: un recálculo o una aprobación a la vez no lo pisan
      const { count } = await tx.sugerencia.updateMany({
        where: { id, estado: 'PROPUESTA' },
        data: { estado: 'DESCARTADA', motivo_descarte: texto, decidida_por: admin.id, decidida_en: new Date() },
      });
      if (count === 0) {
        const existe = await tx.sugerencia.findUnique({ where: { id }, select: { id: true } });
        throw existe ? decidida() : noEncontrada();
      }
      const s = await tx.sugerencia.findUniqueOrThrow({
        where: { id },
        include: { categoria: { select: { nombre: true } } },
      });
      await this.bitacora.registrar(tx, {
        usuarioId: admin.id,
        accion: 'sugerencia.descartada',
        entidad: 'sugerencia',
        entidadId: id,
        ubicacionId: s.acopio_id,
        antes: { estado: 'PROPUESTA' },
        despues: {
          estado: 'DESCARTADA',
          categoria: s.categoria.nombre,
          cantidad: Number(s.cantidad),
          zonaId: s.zona_id,
          motivo: texto,
        },
      });
      return { id, estado: 'DESCARTADA' as const };
    });
  }

  /** RF-MOT-007: los motivos de descarte agregados, para afinar los pesos. */
  async descartes(desde?: Date, hasta?: Date) {
    const filas = await this.prisma.sugerencia.findMany({
      where: { estado: 'DESCARTADA', decidida_en: { gte: desde, lte: hasta } },
      include: INCLUIR_SUGERENCIA,
      orderBy: { decidida_en: 'desc' },
    });
    const contar = (claves: string[]) =>
      [...claves.reduce((m, k) => m.set(k, (m.get(k) ?? 0) + 1), new Map<string, number>())]
        .map(([nombre, veces]) => ({ nombre, veces }))
        .sort((x, y) => y.veces - x.veces || x.nombre.localeCompare(y.nombre, 'es'));
    return {
      total: filas.length,
      porMotivo: contar(filas.map((f) => (f.motivo_descarte ?? '').trim().toLowerCase())),
      porCategoria: contar(filas.map((f) => f.categoria.nombre)),
      porAcopio: contar(filas.map((f) => f.acopio.nombre)),
      recientes: filas.slice(0, 50).map(aSugerenciaVista),
    };
  }
```

Rutas, en `sugerencias.controller.ts`. `descartes` va antes que las rutas con `:id`:

```ts
class AprobarDto extends createZodDto(z.object({ cantidad: cantidadPositiva.optional() })) {}
class DescartarDto extends createZodDto(z.object({ motivo: z.string().trim().min(10).max(280) })) {}
const dia = z.iso.date().transform((d) => new Date(`${d}T00:00:00Z`));
const finDelDia = z.iso.date().transform((d) => new Date(`${d}T23:59:59.999Z`));
class RangoDto extends createZodDto(
  z.object({ desde: dia.optional(), hasta: finDelDia.optional() }),
) {}

  @Get('descartes')
  @ApiOkResponse({ type: InformeDescartesDto })
  descartes(@Query() r: RangoDto) {
    return this.sugerencias.descartes(r.desde, r.hasta);
  }

  @Post(':id/aprobar')
  @HttpCode(200)
  @ApiOkResponse({ type: AprobacionDto })
  @ApiResponse(errores)
  aprobar(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: AprobarDto,
  ) {
    return this.sugerencias.aprobar(admin, id, d.cantidad);
  }

  @Post(':id/descartar')
  @HttpCode(200)
  @ApiOkResponse({ type: DescarteDto })
  @ApiResponse(errores)
  descartar(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: DescartarDto,
  ) {
    return this.sugerencias.descartar(admin, id, d.motivo);
  }
```

Importes nuevos en el controlador: `Body`, `Param`, `ParseUUIDPipe`, `ApiResponse`,
`UsuarioActual`, `UsuarioAutenticado`, `cantidadPositiva` (de
`comun/validacion/cantidades`), `ErrorDto`, `AprobacionDto`, `DescarteDto`,
`InformeDescartesDto`, y
`const errores = { status: 'default' as const, type: ErrorDto, description: 'Error' };`.

En `respuestas.ts`:

```ts
export class AprobacionDto extends createZodDto(
  z.object({
    sugerenciaId: z.uuid(),
    cantidad: z.number(),
    remision: z.object({ id: z.uuid(), codigo: z.string(), creada: z.boolean() }),
  }),
) {}

export class DescarteDto extends createZodDto(
  z.object({ id: z.uuid(), estado: z.literal('DESCARTADA') }),
) {}

const conteo = z.array(z.object({ nombre: z.string(), veces: z.number().int() }));
export class InformeDescartesDto extends createZodDto(
  z.object({
    total: z.number().int(),
    porMotivo: conteo,
    porCategoria: conteo,
    porAcopio: conteo,
    recientes: z.array(SugerenciaDto.schema),
  }),
) {}
```

En `motor.module.ts`, sumar `RemisionesBorradorService` a `providers`. `AcopiosService`
llega porque `AcopiosModule` es global.

- [ ] **Paso 6: correr las pruebas, verificar y commit**

```bash
cd apps/api && bun run typecheck && bun run depcruise && bun run test && PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439 bun run test:int && cd ../.. && bun run lint && git add apps/api/src && git commit -m "API: aprobar una sugerencia arma la remisión en borrador; descartar exige motivo (RF-MOT-007)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 9: datos de ejemplo del motor

**Archivos:**
- Modificar: `apps/api/src/seed/demo.ts`

**Interfaces:**
- Consume: `ACOPIOS`, `EMERGENCIA_DEMO` del propio `demo.ts`.
- Produce: en `seed:demo`, una segunda zona y excedentes de agua y arroz en Kennedy y Suba,
  con umbrales, para que el primer recálculo proponga traslados.

- [ ] **Paso 1: los datos**

En `demo.ts`, una función nueva junto a `sembrarCasosInventario`, y su llamada al final de
`sembrarEscenariosDemo`, antes del `return`:

```ts
  await sembrarMotorDemo(prisma, ids.operador1!);
```

```ts
const ZONA_DEMO_2 = 'd0000000-0000-4000-8000-000000000032';

/**
 * Excedentes de agua y arroz en Kennedy y Suba, con umbrales, y una segunda zona más
 * pequeña: el primer recálculo propone traslados a las dos. Solo la primera vez.
 */
async function sembrarMotorDemo(prisma: PrismaService, operador: string) {
  if (await prisma.zona.findUnique({ where: { id: ZONA_DEMO_2 } })) return;
  await prisma.zona.create({
    data: {
      id: ZONA_DEMO_2,
      emergencia_id: EMERGENCIA_DEMO,
      nombre: 'Vereda El Pepino (prueba)',
      municipio: 'Mocoa',
      lat: 1.1301,
      lng: -76.6603,
      poblacion_estimada: 400,
      poblacion_fuente: 'Dato ficticio de la demo',
      poblacion_fecha: new Date('2026-09-25T00:00:00Z'),
    },
  });
  const categorias = await prisma.categoria.findMany({
    where: { nombre: { in: ['Agua potable', 'Arroz'] } },
  });
  for (const [i, acopio] of [ACOPIOS[1]!, ACOPIOS[2]!].entries()) {
    for (const c of categorias) {
      const esAgua = c.nombre === 'Agua potable';
      await prisma.movimiento.create({
        data: {
          acopio_id: acopio.id,
          categoria_id: c.id,
          tipo: 'ENTRADA',
          signo: 1,
          cantidad: esAgua ? 3000 + i * 1000 : 800 + i * 200,
          usuario_id: operador,
          ocurrido_en: new Date(),
        },
      });
      await prisma.umbral.upsert({
        where: { acopio_id_categoria_id: { acopio_id: acopio.id, categoria_id: c.id } },
        update: {},
        create: {
          acopio_id: acopio.id,
          categoria_id: c.id,
          minimo: esAgua ? 200 : 50,
          maximo: esAgua ? 1000 : 300,
          actualizado_por: operador,
        },
      });
    }
  }
}
```

Antes de fijar `ZONA_DEMO_2`, revisar las constantes `ZONA_DEMO` y `EMERGENCIA_DEMO` del
archivo y elegir un identificador libre del mismo patrón.

- [ ] **Paso 2: probarlo contra el Compose**

```bash
bun run servicios && bun run --filter @acopio/api db:migrar && bun run --filter @acopio/api seed && bun run --filter @acopio/api seed:demo && bun run --filter @acopio/api seed:demo
```

Esperado: las dos corridas de `seed:demo` terminan sin error (es idempotente). Después,
con la API levantada (`bun run --filter @acopio/api start:dev`), iniciar sesión como
administrador y llamar `POST /api/sugerencias/recalcular`: `generadas` mayor que 0, y
`GET /api/sugerencias` trae traslados de Kennedy y Suba a las dos zonas de Mocoa.

- [ ] **Paso 3: verificar y commit**

```bash
cd apps/api && bun run typecheck && PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439 bun run test:int && cd ../.. && bun run lint && git add apps/api/src/seed && git commit -m "API: la demo trae excedentes y una segunda zona para ver el motor

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 10: contrato, documentación y cierre de la etapa

**Archivos:**
- Modificar: `docs/03-diseno/api/openapi.json`, `apps/web/src/api/esquema.d.ts`,
  `docs/02-arquitectura/modelo-datos.md`, `docs/02-arquitectura/vista-general.md`,
  `docs/01-requerimientos/funcionales/motor.md`,
  `docs/01-requerimientos/funcionales/catalogo.md`,
  `docs/01-requerimientos/pendientes.md`,
  `docs/superpowers/specs/2026-08-20-acopio-design.md`,
  `docs/superpowers/specs/2026-10-06-bloque-4-motor-design.md`,
  `docs/05-planes/README.md`, `docs/02-arquitectura/adr/README.md`, este plan
- Crear: `docs/02-arquitectura/adr/ADR-0018-movimientos-de-zona.md`

**Interfaces:**
- Consume: todo lo anterior.
- Produce: el contrato y los tipos de la web al día para el ciclo 1 de interfaz (C10 y
  C11), y la documentación alineada con lo construido.

Antes de escribir cada texto de la bóveda, invocar `humanizer:humanizer` y aplicarlo a ese
texto (CLAUDE.md, «Redacción»).

- [ ] **Paso 1: contrato y tipos**

```bash
bun run --filter @acopio/api openapi && bun run --filter @acopio/web api:tipos && bun run --filter @acopio/web typecheck
```

Esperado: `openapi.json` gana las rutas de `motor`, y `esquema.d.ts` sus tipos.

- [ ] **Paso 2: ADR-0018**

`docs/02-arquitectura/adr/ADR-0018-movimientos-de-zona.md`, con el frontmatter de los
demás ADR. Contexto: RF-MOT-003 define `recibido` como suma de movimientos `RECEPCION` en
la zona, y `movimiento` exigía `acopio_id`. Decisión: M-01 de la especificación, con los
tres `CHECK`, el disparador condicionado y la razón de comparar `tipo::text`.
Alternativas: las dos de M-01. Consecuencias: `acopio_id` opcional en el código de
inventario y comprobantes (los sitios del paso 3 de la tarea 1), y las zonas sin saldo.
Sumarlo al índice de ADR.

- [ ] **Paso 3: modelo de datos y vista general**

- `modelo-datos.md`: en «Existencias», `movimiento` con `acopio_id?`, `zona_id?`,
  `remision_id?`, `RECEPCION` y los tres `CHECK`, con una nota fechada 2026-10-06 que
  enlaza ADR-0018. En «Custodia», `remision` sin `sugerencia_id`, con `codigo`,
  `responsable?`, quién y cuándo de cada paso, y sus `CHECK`; `linea_remision` sin
  `motivo_diferencia` y con su disparador. En «Motor», `sugerencia` con `ronda`,
  `cantidad_aprobada` y `remision_id`, y el disparador de borrado; `necesidad_manual`
  nueva; `configuracion_motor` con `actualizado_por` opcional. Permisos de `acopio_app`.
- `vista-general.md`: `motor` pasa de pendiente a existente en el diagrama y en la tabla de
  módulos, con `EstadoMotorService`, `NecesidadService`, `SugerenciasService`,
  `ConfiguracionService` y `RemisionesBorradorService`.

- [ ] **Paso 4: requerimientos y especificación general**

- RF-MOT-002: la necesidad manual vive en `necesidad_manual`, append-only.
- RF-MOT-003: la ventana del recibido (M-02), la columna en camino (M-03) y la cobertura
  global como promedio con la categoría más baja (M-11).
- RF-MOT-004: sin umbral no hay excedente (M-12) y lo vencido no se mueve.
- RF-MOT-005: voraz por puntaje (M-06), urgencia 0 en no perecederos (M-05) y la
  estimación de vencimientos de V-02.
- RF-MOT-007: el bloqueo de 24 horas tras un descarte.
- RF-MOT-012: la fecha nueva obligatoria al cambiar la población.
- RF-CAT-006: tolerancia de 0,001.
- Marcar `[x]` solo los criterios que esta etapa cumple sin pantalla. Lo que depende de
  una pantalla queda sin marcar.
- Especificación general §7: urgencia, emparejamiento por puntaje y ventana del recibido,
  con enlace a la especificación del bloque.
- `pendientes.md`: dos entradas con los siguientes números `P-0NN`: la pantalla del
  simulador y el estado automático de la zona (los dos están en «No entra» de la
  especificación).

- [ ] **Paso 5: estado del plan, índice de planes, especificación**

- La tabla «Estado» de este plan, con los commits de cada tarea, y `estado: aprobado` en
  el frontmatter.
- `docs/05-planes/README.md`: la fila del Bloque 4 con este plan y «etapa 1 hecha».
- El §13 de la especificación: lo que cambió al construir, con su razón, además de las
  dos filas de la tarea 2.

- [ ] **Paso 6: verificación completa, commit, push y CI**

```bash
set -o pipefail && bun run lint && bun run typecheck && bun run --filter @acopio/api depcruise && bash scripts/revisar-colores.sh && bun run test && PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439 bun run test:int && git add -A docs apps/web/src/api && git commit -m "Bloque 4: contrato, ADR-0018 y documentación de la etapa 1 de la API

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git push && gh run watch $(gh run list --branch main --limit 1 --json databaseId -q '.[0].databaseId') --exit-status
```

- [ ] **Paso 7: el issue**

Comentar en #35 lo que quedó hecho (la etapa 1 de la API, con el enlace a este plan), lo
que se probó y lo que falta: la etapa 2, el simulador y los tres ciclos de interfaz. El
texto pasa por `humanizer:humanizer` antes de publicarse.
