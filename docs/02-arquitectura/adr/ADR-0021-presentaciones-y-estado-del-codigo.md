---
title: "ADR-0021 · Presentaciones como entidad y estado en el código de barras"
type: adr
tags: [arquitectura, adr, catalogo, codigos-de-barras]
estado: vigente
adr: 21
decision: aceptada
actualizado: 2026-10-20
---

# ADR-0021 · Presentaciones como entidad y estado en el código de barras

**Fecha:** 2026-10-20 · **Estado:** aceptada · **Deriva de:**
P-081 en [pendientes](../../01-requerimientos/pendientes.md) y de la
[especificación](../../superpowers/specs/2026-10-20-presentaciones-codigos-design.md)

## Contexto

Hasta ahora `codigo_barras` guardaba su propio `contenido` (cuánto trae una unidad, en la unidad
base de la categoría). Con cientos de códigos eso se repite: cada marca de agua de 600 ml
escribe «0,6» por su cuenta, y una bolsa de 500 g se escribe «0,5» en kg. Tampoco había forma de
distinguir un código que un Donador propuso de uno que un Operador tuvo en la mano.

## Decisión

1. La presentación es una tabla propia, `presentacion`, ligada a una categoría. Un código solo
   la apunta (`codigo_barras.presentacion_id`) y muchas marcas pueden compartir una.
2. Hay dos clases, forzadas por el `CHECK` `presentacion_clase`. Suelta: `tamano` mayor que cero
   en la unidad base. Paquete: `contiene_id` y `unidades` entre 2 y 1000, sin `tamano`.
3. El tamaño de un paquete no se guarda. Se calcula como `unidades` por el tamaño de la suelta
   de adentro. Si el Administrador corrige la suelta, los paquetes cambian solos; las líneas de
   comprobante ya hechas conservan su `contenido_unitario`.
4. El estado (`PROPUESTO` o `VALIDADO`) vive en el código y en la presentación. Un código de un
   Donador queda propuesto y solo vale para su donación hasta que alguien lo valide.
5. `por_revisar` marca códigos que necesitan la mano del Administrador: los migrados sin
   contenido y los que un Operador corrigió en una línea sin cambiar el código para la red.
6. La migración crea una suelta validada por cada par (categoría, contenido) existente y deja
   sin presentación los códigos sin contenido, con `por_revisar = true`.

## Alternativas descartadas

- Guardar el tamaño del paquete: se desincroniza cuando se corrige la suelta.
- Un campo `estado` solo en la presentación: no distingue un código nuevo sobre una presentación
  ya validada.
- Paquetes de paquetes: la especificación los deja fuera; con un solo nivel el cálculo es una
  multiplicación y no hay recursión que vigilar.

## Consecuencias

- `codigo_barras` pierde `contenido`, `descripcion` y `revisado`. El API, el seed y las
  donaciones que los leían cambian en las tareas siguientes del plan.
- El tamaño de un código se obtiene con una unión a `presentacion` (y a la suelta, si es
  paquete), no con una columna.
- Cada presentación nueva pide revisión, así que el Administrador tiene más para validar, aunque
  la lista queda corta porque las marcas comparten presentación.
- Las unidades g y ml solo existen en los campos de entrada; la base sigue en kg, L y unidad.
