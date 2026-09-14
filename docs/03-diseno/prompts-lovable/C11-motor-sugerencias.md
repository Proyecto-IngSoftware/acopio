---
title: "C11 · Motor de sugerencias"
type: prompt
tags: [diseno, ui, prompt]
estado: vigente
actualizado: 2026-08-20
---

# C11 · Motor de sugerencias

**Ruta:** `/consola/sugerencias` · **Acceso:** Administrador

**Objetivo:** que un humano decida en segundos si un traslado propuesto tiene
sentido, **entendiendo por qué se propuso**.

> Ninguna sugerencia se ejecuta sola. El sistema recomienda; la persona decide y
> responde. Por eso la justificación no es decorativa: es lo que hace posible la
> decisión.

---

## Prompt

Construye la pantalla del motor de sugerencias de traslado.

### Estructura

**Encabezado**
- Título: *«Traslados sugeridos»*
- **Antigüedad del cálculo**: `Calculado hace 4 min` + botón de recalcular
- Resumen en una línea: *«18 sugerencias · 6 zonas críticas»*

**Filtros** — fila desplazable: por zona, por acopio, por categoría, por estado

**Lista de sugerencias**, ordenada por puntaje descendente.

### Tarjeta de sugerencia

Es el componente central. En móvil ocupa el ancho completo.

```
┌────────────────────────────────────────────────┐
│ ▼ CRÍTICO                          puntaje 0,92│
│                                                │
│ 💧 Agua embotellada                            │
│ 500 L                                          │
│                                                │
│ Acopio Norte  ──────────→  Zona 7 · Chinchiná │
│ 800 L sobre su máximo         41 km            │
│                                                │
│ ─────────────────────────────────────────────  │
│ Zona 7 tiene 12 % de cobertura en agua.        │
│ Acopio Norte tiene 800 L por encima de su      │
│ máximo. Es el acopio con excedente más cercano.│
│ ─────────────────────────────────────────────  │
│                                                │
│ [ Ver desglose ▾ ]                             │
│                                                │
│ [   Aprobar   ]        [ Descartar ]           │
└────────────────────────────────────────────────┘
  borde izquierdo de 4 px con el color de criticidad
```

**La justificación en lenguaje natural es obligatoria y va antes que los botones.**
Nadie aprueba un traslado por un número que no entiende.

### Desglose del puntaje

Al expandir *«Ver desglose»*, cuatro barras horizontales con su peso:

```
Criticidad   ████████████████████  0,88 × 0,45
Urgencia     ██████                0,30 × 0,25
Proximidad   █████████████         0,65 × 0,15
Magnitud     ████████████████████  1,00 × 0,15
                                   ─────────────
                                   Total  0,92
```

Cada barra en color de marca, no en color de estado: **el desglose es información,
no estado**.

### Aprobar

Abre una hoja inferior:
- Cantidad editable, con el máximo trasladable indicado
- Responsable del traslado, campo de texto
- Botón **«Crear remisión»**
- Al confirmar: mensaje breve *«Remisión ACO-R-0142 creada»* con enlace, y la
  sugerencia sale de la lista

### Descartar

Hoja inferior con **motivo obligatorio**:
- Lista de motivos frecuentes: vía cerrada, ya se envió por otro medio, la zona no
  puede recibir ahora, cantidad no disponible en realidad
- Campo de texto adicional
- Los motivos se agregan en un informe que sirve para afinar los pesos del motor

### Estados

- **Vacío:** *«No hay traslados sugeridos ahora mismo. Puede significar que las
  zonas están cubiertas o que ningún acopio tiene excedente.»* — **explica las dos
  razones**; una lista vacía es ambigua y la ambigüedad genera desconfianza
- **Carga:** tres tarjetas esqueleto
- **Recalculando:** franja superior *«Recalculando…»*, la lista sigue usable
- **Cálculo viejo:** si supera 30 min, franja ámbar *«Este cálculo tiene 47 min.
  Recalcula antes de decidir.»*

### Datos

```
GET  /api/sugerencias?zona=&acopio=&categoria=
POST /api/sugerencias/recalcular
POST /api/sugerencias/:id/aprobar     { cantidad, responsable }
POST /api/sugerencias/:id/descartar   { motivo, detalle }
```

La respuesta trae el desglose por componente y la justificación ya redactada por el
servidor. **El frontend no calcula puntajes**: la fórmula vive en un solo lugar.

### Móvil

Tarjetas de ancho completo, apiladas. Los botones de aprobar y descartar van fijos
al fondo de la tarjeta, de 48 px, uno al lado del otro con «Aprobar» a la izquierda
en color de marca.

Es una pantalla de decisión, no de captura: **se usa sentado, con calma**, a
diferencia de C04. Puede permitirse más densidad de información.

### Lo que NO debe tener

- Ninguna aprobación en lote. Cada traslado es una decisión con consecuencias
  logísticas reales
- Ningún puntaje sin su justificación en texto
- Ningún descarte sin motivo
