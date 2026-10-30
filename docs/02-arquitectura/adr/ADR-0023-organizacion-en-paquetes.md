---
title: "ADR-0023 · Organización del código en paquetes"
type: adr
tags: [arquitectura, adr]
estado: vigente
adr: 23
decision: aceptada
actualizado: 2026-10-30
---

# ADR-0023 · Organización del código en paquetes

**Fecha:** 2026-10-30 · **Estado:** aceptada · **Es el «ADR-002» del curso**, que pide un registro
acorde al diagrama de paquetes actualizado ([complemento del segundo corte](../../talleres/Complemento%20Proyecto%20–%20IS1.pdf)).
**Deriva de:** [ADR-0008](ADR-0008-arquitectura-stack-inicial.md) (monolito modular) y
[ADR-0019](ADR-0019-dao-sobre-prisma.md) (DAO). **Diagrama:**
[paquetes.html](../diagramas/paquetes.html), con los PNG
`arquitectura-03-paquetes-del-monorepo.png` y `arquitectura-04-paquetes-de-la-api.png` en
[assets/diagramas](../../assets/diagramas).

ADR-0008 eligió el monolito modular cuando aún no había código. Este registro describe cómo quedó
repartido el código después de los Sprints 1 y 2, con doce módulos construidos, y por qué esa
organización se mantiene.

## Contexto

Cuatro necesidades pesaron en la organización del código:

- Para implementar en paralelo: somos cuatro personas, cada una con módulos y pantallas propios
  ([reparto](../../superpowers/specs/2026-08-20-acopio-design.md)). Con carpetas compartidas por
  tipo técnico, el cambio de una persona tocaría archivos de otra.
- Para integrar la web con la API: las dos cambian juntas, porque un endpoint nuevo trae una
  pantalla nueva. Usan las mismas fórmulas del motor y el mismo formato de cantidades, y la web
  necesita saber qué responde cada endpoint sin copiar tipos a mano.
- Para mantener la consistencia de los datos: cada cambio escribe la bitácora en la misma
  transacción ([vista general](../vista-general.md#módulos-del-backend)) y el saldo sale de los
  movimientos (ADR-0002). Una base por servicio rompería las dos cosas.
- Para el mantenimiento: sin reglas, el motor terminaría leyendo directo las tablas de inventario
  y comprobantes, y un cambio de esquema rompería el cálculo sin que nadie lo notara. RNF-13 exige
  módulos sin dependencias circulares.

## Decisión

Un monorepo con workspaces de Bun y seis paquetes de primer nivel:

| Paquete | Responsabilidad | Depende de |
|---|---|---|
| `apps/web` | SPA con React: portal público, Donador y consola por rol | `packages/shared`, `packages/ui-tokens`, los tipos generados del contrato |
| `apps/api` | API NestJS: todas las reglas de negocio y el acceso a datos | `packages/shared`, `prisma/` |
| `packages/shared` | Funciones puras que usan las dos apps: fórmulas del motor, unidades, formato | nada |
| `packages/ui-tokens` | El único lugar con colores y tipografía (ADR-0013) | nada |
| `prisma/` | Esquema y migraciones de PostgreSQL | nada |
| `infra/` | Compose de producción y de desarrollo | construye `apps/api` y `apps/web` |

La web no importa código de la API. Le habla por HTTP en `/api` y toma los tipos del contrato
`openapi.json`, que exporta la API.

Dentro de la API hay un módulo por dominio en `apps/api/src/modulos/`, apilados en capas. Un
módulo importa módulos de capas inferiores y, en dos casos, de su misma capa (`comprobantes` usa
`inventario`, e `identidad` usa `auditoria` y `notificaciones`). Ninguno importa a uno de una capa
superior:

1. `importacion`, que nadie importa. Escribe en `acopios`, `catalogo`, `inventario` y `turnos`.
2. `motor` y `turnos`.
3. `comprobantes` e `inventario`.
4. `acopios` y `catalogo`.
5. Los transversales y hojas: `identidad`, `auditoria`, `notificaciones`, `almacenamiento` y
   `salud`, que no dependen de ningún módulo de dominio.

`comun/`, `config/` y `generado/` no son módulos y los usa cualquiera. Dentro de cada módulo se
conservan las capas del MVC: controlador, servicio y DAO. La lista exacta de quién importa a quién
está en [Dependencias permitidas](../vista-general.md#dependencias-permitidas), y
`apps/api/.dependency-cruiser.cjs` la hace cumplir en CI.

Cuando un módulo de abajo necesita algo de uno de arriba, declara un puerto en `comun/` y el de
arriba lo implementa. Así funcionan `VerificadorUbicaciones` (lo usa `identidad` y lo implementa
`acopios`) y `ProveedorIdentidad` (con un adaptador `local` y otro `supabase`).

## Alternativa considerada

Organizar por capas técnicas, con carpetas globales `controllers/`, `services/` y
`repositories/` donde cualquier servicio puede llamar a cualquier otro. Es la alternativa B de
ADR-0008 y la estructura más fácil de entender el primer día. La descartamos porque las cuatro
personas tocarían las mismas carpetas y porque nada impediría que el motor leyera las tablas de
inventario o que dos módulos se importaran entre sí.

También consideramos separar la web y la API en dos repositorios. Un cambio de endpoint tendría
que coordinarse entre dos PR, y `packages/shared` tendría que publicarse como paquete para que las
dos apps usaran la misma versión de las fórmulas.

## Justificación

- Cada módulo corresponde a un límite de dominio del glosario, y casi siempre a lo que una persona
  tiene asignado, así que el reparto de trabajo se ve en las carpetas.
- La regla de dependencias la revisa una herramienta: si un PR agrega una dependencia no
  permitida, `depcruise` falla en CI y el PR no se fusiona.
- Las fórmulas del motor se escriben una vez, en `packages/shared`, y la web muestra el mismo
  número que calcula la API.
- La bitácora, el saldo y las transacciones siguen en una sola base y un solo proceso, como pide
  ADR-0002. `notificaciones` e `importacion` hablan con el exterior por adaptadores; si algún día
  hiciera falta separarlos, el dominio no cambiaría.

## Consecuencias

### Qué facilita

- Ubicar un cambio: una regla de comprobantes vive en `modulos/comprobantes/` y su prueba al lado.
- Medir el impacto: el diagrama de paquetes dice qué módulos puede afectar un cambio en otro.
- Cambiar la web y la API en el mismo PR, con el contrato y los tipos regenerados juntos.

### Qué limita

- Un módulo de abajo no puede llamar a uno de arriba. Cada caso así necesita un puerto en `comun/`
  y su implementación, que es más código que un import directo.
- Todo corre en un proceso, así que el motor no se puede escalar aparte de la API.
- El diagrama de paquetes se dibuja a mano y no se entera solo de una dependencia nueva: el 30 de
  octubre le faltaban tres flechas hacia `almacenamiento`.

### Qué podría requerir ajustes

- `motor` ya depende de siete módulos (`acopios`, `almacenamiento`, `auditoria`, `catalogo`,
  `comprobantes`, `identidad` e `inventario`). Si sigue creciendo, convendría partirlo, por
  ejemplo en cálculo y remisiones.
- La cola de correo se consumía con una bandera en memoria, que solo protegía una instancia de la
  API. Se resolvió el mismo 30 de octubre: el lote se reclama con `FOR UPDATE SKIP LOCKED`
  ([P-089](../../01-requerimientos/pendientes.md)).
