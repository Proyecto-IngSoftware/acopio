---
title: "ADR-0019 · El acceso a datos pasa por DAO sobre Prisma"
type: adr
tags: [arquitectura, adr, patrones, persistencia]
estado: vigente
adr: 19
decision: aceptada
actualizado: 2026-10-09
---

# ADR-0019 · El acceso a datos pasa por DAO sobre Prisma

**Fecha:** 2026-10-09 · **Estado:** aceptada · **Revierte:** «Repository sobre Prisma» en
[patrones y prácticas](../patrones-y-practicas.md#patrones-descartados-por-ahora) ·
**Deriva de:** [P-050](../../01-requerimientos/pendientes.md) e issue
[#59](https://github.com/Proyecto-IngSoftware/acopio/issues/59)

## Contexto

Hasta el Sprint 1, cada servicio llamaba a `PrismaService` directamente: 28 servicios lo
hacían, y ningún controlador consultaba la base salvo `salud`. La nota de patrones había
descartado envolver Prisma porque el cliente generado ya es tipado y maneja
transacciones.

La guía del [Avance 5](../../talleres/Avance%20de%20Proyecto%205%20–%20IS1.pdf) pide DAO
de forma obligatoria: el acceso a datos debe quedar separado de los controladores, la
interfaz y las reglas de negocio, y aclara que usar un ORM no basta. Hay que mostrarlo
en el código.

Dos reglas del proyecto limitan cómo se hace. La bitácora se escribe en la misma
transacción que el cambio, y el correo se encola dentro de ella. Además, las salidas y
los ajustes toman `pg_advisory_xact_lock` por acopio y categoría dentro de la
transacción (ADR-0015). Un DAO que abriera su propia transacción rompería las dos.

## Decisión

- Cada módulo tiene sus DAO en `modulos/<módulo>/dao/<entidad>.dao.ts`, uno por tabla o
  agregado: `MovimientoDao`, `SaldoDao`, `UmbralDao` y `NoRecibirDao` en `inventario`,
  `CategoriaDao` en `catalogo`. Son los únicos que inyectan `PrismaService` en un módulo
  migrado.
- Cada método recibe un `ClienteBd` opcional, que por defecto es la conexión. El servicio
  le pasa la `tx` cuando trabaja dentro de una transacción. Los métodos que escriben lo
  piden siempre.
- La transacción la abre el servicio con `Transacciones.ejecutar` (`comun/prisma`), una
  unidad de trabajo que envuelve `$transaction`. El servicio decide qué va junto; los DAO
  solo leen y escriben.
- Las reglas de negocio quedan en el servicio: validar la categoría, comparar el saldo,
  armar el antes y el después de la bitácora. El DAO no lanza `ErrorDominio`.
- `SaldoDao` solo lee y toma el candado: el saldo lo mantiene el disparador.
  `MovimientoDao` solo inserta y lee, igual que los permisos de `acopio_app`.
- Un módulo que necesita datos de otro usa el DAO que ese módulo exporta, dentro de la
  tabla de dependencias permitidas. `inventario` lee categorías con el `CategoriaDao`
  de `catalogo`; `comprobantes` usa además `CodigoBarrasDao`, los DAO de movimientos y
  de «no recibir» de `inventario`, `AcopioDao` de `acopios` y `UsuarioDao` de
  `identidad`. Para eso `catalogo` admite ahora que lo importe `comprobantes`.

Dependency-cruiser lo hace cumplir con dos reglas en `apps/api/.dependency-cruiser.cjs`:

- `controladores-sin-acceso-a-datos`: ningún controlador importa `PrismaService` ni un
  DAO. `salud` queda fuera porque solo pregunta si la base responde, y su controlador
  usa `SaludDao` sin servicio de por medio.
- `acceso-a-datos-por-dao`: en los módulos de `MIGRADOS_A_DAO` solo los archivos
  `*.dao.ts` importan `PrismaService`.

## Alcance

El 2026-10-09 se migraron `inventario`, `salud` y `comprobantes`, y con la etapa 2 del
motor, `motor`: `SugerenciaDao`, `RemisionDao`, `NecesidadDao` y `ConfiguracionDao`, más
`ZonaDao` en `acopios`. `ComprobanteDao`
cubre el agregado entero: el comprobante, sus líneas y sus vínculos con movimientos.
`acopios`, `identidad` y `catalogo` ya exportan DAO para otros módulos, pero sus
servicios todavía usan Prisma. Los módulos que faltan se migran cuando se toquen, y al
migrar uno se agrega a `MIGRADOS_A_DAO`.

## Alternativas

1. Dejar Prisma en los servicios y llamar DAO al cliente generado. Es lo que había, y la
   guía dice expresamente que no basta.
2. Un repositorio genérico (`Repositorio<T>` con `buscar`, `crear`, `actualizar`). Las
   consultas del proyecto no son CRUD: el historial usa una ventana SQL, los saldos se
   leen pero no se escriben y los movimientos no se actualizan. Un genérico ofrecería
   operaciones que la base rechaza.
3. Que cada DAO abra su transacción. Rompe la bitácora en la misma transacción y el
   candado del saldo.

## Consecuencias

- Los servicios de `inventario` ya no saben de Prisma: se pueden leer como reglas de
  negocio y se podrían probar con DAO falsos.
- Hay una capa más. Una consulta nueva exige un método en el DAO aunque se use una vez.
- La `tx` sigue viajando como parámetro. Un servicio todavía podría escribir con
  `tx.tabla` en vez de usar el DAO, y eso dependency-cruiser no lo detecta; se revisa en
  el PR.
- Las pruebas de integración no cambiaron y pasan igual: el comportamiento es el mismo.
