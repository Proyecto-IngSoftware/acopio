---
title: "ADR-0010 · Varias emergencias activas; el acopio no pertenece a ninguna"
type: adr
tags: [arquitectura, adr]
estado: vigente
adr: 10
decision: aceptada
actualizado: 2026-10-06
---

# ADR-0010 · Varias emergencias activas; el acopio no pertenece a ninguna

**Fecha:** 2026-09-14 · **Estado:** aceptada

> **Modifica una restricción de [ADR-0008](ADR-0008-arquitectura-stack-inicial.md)**
> —«una emergencia activa a la vez»— sin reemplazar el resto de esa decisión. El
> Word del Avance 3 se entregó con la restricción anterior; este ADR es el registro
> del cambio que pide la guía del curso para toda decisión que evolucione durante los
> Sprints.

## Contexto

[RF-CAT-005](../../01-requerimientos/funcionales/catalogo.md) limitaba la interfaz a
una emergencia activa a la vez, y ADR-0008 lo recogió como restricción. El modelo ya
tenía a `emergencia` como raíz, pero colgaba de ella casi todo: `entidad`, `acopio`,
`zona`, `movimiento` y `sugerencia`.

Dos hechos cambiaron el cuadro el 2026-09-14:

1. **El diseño de la portada ya asumía varias emergencias**, con pestañas en
   escritorio y un selector en móvil (canvas de diseño base, tarea
   [#7](https://github.com/Proyecto-IngSoftware/acopio/issues/7)).
2. **Un mismo centro de acopio atiende varias emergencias al mismo tiempo.** Es el
   caso que el equipo planteó con la Cruz Roja: quien entrega en un acopio no decide
   a qué emergencia va su donación; el acopio la lleva a donde hace falta. Atar un
   acopio a una sola emergencia modela algo que no pasa. *La parte
   multiemergencia es una afirmación del equipo, sin fuente todavía. La otra mitad
   —el acopio destina las donaciones a donde se necesitan, y el destino lo fija quien
   coordina a partir de la evaluación de necesidades— sí la respalda el protocolo de
   la ANDI de 2019
   ([I-005](../../00-contexto/investigaciones.md#i-005--un-centro-de-acopio-atiende-varias-emergencias-a-la-vez)).*

   *2026-10-06: el equipo adopta el protocolo de la ANDI como la fuente de esta
   decisión y no buscará otra. La parte multiemergencia queda como deducción del
   equipo a partir de lo que el protocolo sí dice.*

Además, una emergencia vieja puede seguir teniendo zonas con déficit real mientras la
atención pública se va a la nueva. El sistema no debe amplificar ese sesgo: es el
cuarto problema del [Avance 1](../../entregas/avance-01-sprint0.md#problema), el
reparto que responde a la visibilidad y no a la necesidad.

## Decisión

**Pueden estar activas varias emergencias a la vez. La emergencia pertenece a la
zona afectada, no al acopio. Su prioridad gobierna lo que muestra el portal, nunca lo
que calcula el motor.**

### Qué cuelga de una emergencia

| Tabla | Antes | Ahora |
|---|---|---|
| `zona` | `emergencia_id` | `emergencia_id` — una zona afectada pertenece a una emergencia |
| `sugerencia` | `emergencia_id` | `emergencia_id` — la de su zona destino |
| `causa` | — | `emergencia_id` **opcional** — una campaña puede ser de una emergencia o general |
| `acopio` | `emergencia_id` | **Sin emergencia** — un acopio atiende a todas |
| `entidad` | `emergencia_id` | **Sin emergencia** — la Cruz Roja no es de un solo desastre |
| `movimiento` | `emergencia_id` | **Sin emergencia** — la de una `RECEPCION` se conoce por su zona |

Umbrales, jornadas, comprobantes y remisiones ya dependían de un acopio o una zona,
no de la emergencia: no cambian.

### Ciclo de vida de una emergencia

```
ACTIVA ──pasa destacada_hasta──→ EN_SEGUIMIENTO ──cierre manual──→ CERRADA
   ↑                                   │
   └────── el Administrador la ────────┘
           extiende o reactiva
```

- **`destacada_hasta` se fija al crearla**, obligatoria. Al pasarla, una tarea diaria
  la mueve sola a `EN_SEGUIMIENTO`.
- **Cerrar es siempre manual**, con motivo. Si alguna de sus zonas tiene déficit o
  remisiones en tránsito, se advierte antes de confirmar. Una emergencia cerrada deja
  sus zonas en solo lectura, sin borrar nada.
- **No se archiva sola.** Archivar por fecha ocultaría necesidad viva justo cuando la
  atención ya bajó.

### Qué afecta la prioridad

| Superficie | `ACTIVA` | `EN_SEGUIMIENTO` | `CERRADA` |
|---|---|---|---|
| Portal: orden de pestañas y selector | Primero, de la más reciente a la más antigua | Después de las activas | Solo en el histórico |
| Portal: portada | Se destaca | No se destaca, sigue a un toque | No aparece |
| **Motor de emparejamiento** | **Participa** | **Participa igual** | No genera sugerencias nuevas |

El motor hace **un solo cálculo** sobre las zonas de todas las emergencias activas y
en seguimiento, y las ordena por necesidad
([RF-MOT-005](../../01-requerimientos/funcionales/motor.md)). Por eso los **pesos del
motor pasan a ser globales**, en una tabla `configuracion_motor` de una sola fila: un
ranking único no puede mezclar puntajes calculados con pesos distintos. El
`horizonte_dias` sí sigue siendo de cada emergencia, y cada zona usa el de la suya.

## Alternativas consideradas

### A. Mantener una emergencia activa (ADR-0008)

**Por qué se descarta.** Un acopio que atiende dos emergencias tendría que duplicarse
—con dos inventarios del mismo bodegaje— o esperar a que la primera se cierre, aunque
sus zonas sigan con déficit.

### B. Varias activas, con el acopio ligado a cada emergencia que atiende

Una tabla `acopio_emergencia` de muchos a muchos, y el inventario separado por
emergencia.

**Por qué se descarta.** El saldo tendría que llevarse por emergencia: cada caja que
entra obligaría al operador a decidir para cuál es. Nadie lo sabe en el momento de
recibirla, y la pregunta rompe los 10 segundos de
[RNF-02](../../01-requerimientos/no-funcionales.md). Además convierte un saldo
fungible en lotes etiquetados, lo que [ADR-0002](ADR-0002-saldo-derivado.md) evitó
a propósito.

### C. Archivar la emergencia automáticamente al vencer su plazo

**Por qué se descarta.** Ocultaría zonas que siguen necesitando ayuda. La fecha baja
la prioridad visible; el cierre lo decide una persona, igual que en las causas
archivadas ([RF-RED-010](../../01-requerimientos/funcionales/red.md)).

## Consecuencias

### A favor

- El modelo describe lo que pasa: un acopio recibe y despacha sin preguntar a qué
  emergencia va cada caja.
- La entrada rápida no gana ningún campo: registrar sigue siendo categoría, cantidad
  y confirmar.
- El motor compara todas las zonas con necesidad por igual, sin importar qué
  emergencia salió en las noticias.
- La portada deja de mentir por omisión: muestra varias emergencias y dice cuál es la
  más reciente.
- **B-08 del backlog entra al semestre casi gratis.** El aislamiento de permisos por
  emergencia que pedía no hace falta: las asignaciones son a ubicaciones
  ([ADR-0003](ADR-0003-rol-global-alcance-multiple.md)); un Receptor asignado a una
  zona ya queda dentro de su emergencia, y un Operador trabaja para todas desde su
  acopio.

### En contra

- **El techo de cálculo de 50 zonas × 40 categorías ahora suma todas las emergencias
  activas y en seguimiento**, no una sola ([RNF-05](../../01-requerimientos/no-funcionales.md)).
- **Tres diagramas entidad-relación cambian** —Raíz y catálogo, Red y el primero de
  Existencias— y con ellos las figuras 8, 9 y 10 del Word del Avance 3. Hay que
  regenerarlos.
- Una tabla nueva, `configuracion_motor`. Las entidades pasan de 23 a 24.
- El reporte de transparencia tiene que agrupar por emergencia a través de la zona,
  no directo desde el movimiento.
- [P-019](../../01-requerimientos/pendientes.md) descartó el caso «acopio de otra
  emergencia» porque solo había una activa. El caso ya no existe: el acopio no es de
  ninguna.

## Relacionado

- [RF-CAT-005](../../01-requerimientos/funcionales/catalogo.md), reescrito
- [RF-CAT-006](../../01-requerimientos/funcionales/catalogo.md),
  [RF-MOT-001, 002 y 005](../../01-requerimientos/funcionales/motor.md),
  [RF-HOM-001](../../01-requerimientos/funcionales/home.md)
- [Modelo de datos](../modelo-datos.md)
- [P-024](../../01-requerimientos/pendientes.md) · [B-08](../../99-futuro/backlog.md)
