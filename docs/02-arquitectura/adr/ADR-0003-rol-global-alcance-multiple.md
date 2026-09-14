---
title: "ADR-0003 · Rol global, alcance múltiple"
type: adr
tags: [arquitectura, adr]
estado: vigente
adr: 3
decision: aceptada
actualizado: 2026-09-12
---

# ADR-0003 · Rol global, alcance múltiple

**Fecha:** 2026-08-20 · **Estado:** aceptada

**Nota, 2026-09-12:** esta decisión sigue vigente para los cuatro roles internos.
El Donador es una quinta entrada de rol con reglas propias, documentada sin
reabrir esta decisión — ver
[ADR-0007](ADR-0007-donador-excepcion-rol.md).

## Contexto

Una persona puede gestionar uno o varios acopios, o una o varias zonas. Solo el
administrador crea usuarios y asigna esas ubicaciones; nadie se auto-registra ni
modifica su propio alcance.

Queda por decidir si el rol acompaña a la persona o a cada asignación.

## Decisión

**El rol es global por usuario. El alcance es múltiple.**

```
usuario
  rol  ADMIN | OPERADOR | AUDITOR | RECEPTOR

usuario_asignacion
  usuario_id · ubicacion_tipo · ubicacion_id
  asignado_por · asignado_en
  PK (usuario_id, ubicacion_tipo, ubicacion_id)
```

Un operador es operador en todos los acopios que le asignen. No cambia de rol
según dónde esté.

`asignado_por` y `asignado_en` viven en la propia tabla: la pregunta «¿quién le dio
acceso a esta persona y cuándo?» se responde sin salir a la bitácora.

## Alternativas consideradas

**Rol por asignación.** Permitiría que alguien fuera operador en el Acopio A y
receptor en la Zona 3. Más flexible y bastante más caro:

- Los guards tendrían que resolver el rol en función de la ubicación del request
- El conmutador de contexto cambiaría los permisos al cambiar de lugar, y con
  ellos la navegación entera
- La matriz de acceso pasaría de dos dimensiones a tres

Descartada porque **ningún caso real identificado lo necesita**. Si aparece uno,
se reabre.

**Un solo alcance por usuario.** Descartada de entrada: el planteamiento pide
explícitamente que una persona pueda gestionar varias zonas.

## Consecuencias

### A favor
- Guard simple: valida el rol una vez y el alcance por request
- El conmutador de contexto solo cambia el lugar, nunca los permisos
- Matriz de acceso legible en dos dimensiones

### En contra
- Una persona con dos funciones distintas necesita dos cuentas. Es aceptable y
  además más claro para la auditoría

### Implicación de seguridad

**Las asignaciones se consultan en base de datos en cada request. Nunca se cachean
en el JWT.**

Dentro del token, revocar un acceso no surtiría efecto hasta que el token
expirara. Consultándolas, suspender a alguien le corta el acceso en el siguiente
request. El costo es una consulta indexada por
`(usuario_id, ubicacion_id)` — despreciable frente a la propiedad que compra.

El conmutador de contexto de la interfaz es una comodidad, **jamás una fuente de
autoridad**. El `ubicacion_id` viaja en el cuerpo del request y el servidor lo
valida siempre contra la tabla.
