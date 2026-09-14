---
title: "P05 · Mapa de centros de acopio"
type: prompt
tags: [diseno, ui, prompt]
estado: vigente
actualizado: 2026-08-20
---

# P05 · Mapa de centros de acopio

**Ruta:** `/mapa` · **Acceso:** público

**Objetivo:** que alguien con una caja en el carro sepa **a dónde llevarla y qué
llevar**, antes de salir de casa.

El filtro *qué no recibe* es el que evita el viaje inútil. Es la razón de ser de
esta pantalla.

---

## Prompt

Construye el mapa público de centros de acopio con Leaflet y OpenStreetMap. Sin
API key.

### Disposición

**Móvil** — el mapa ocupa la pantalla; la lista sube desde abajo:

```
┌──────────────────────────────────┐
│ [buscar dirección]      [⌖]      │  ← barra flotante sobre el mapa
│ [Recibe ▾][No recibe ▾][Abierto] │  ← filtros desplazables
│                                  │
│            MAPA                  │
│                                  │
├──────────────────────────────────┤
│ ═══                              │  ← hoja inferior arrastrable
│ 8 acopios cerca de ti            │
│ ┌──────────────────────────────┐ │
│ │ Acopio Norte      a 2,3 km   │ │
│ │ ✓ Abierto hasta las 6:00 p.m.│ │
│ │ Necesita: agua, pañales      │ │
│ │ No recibe: ropa              │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

La hoja tiene tres posiciones: asomada (~120 px), media (50 %) y completa.

**Escritorio** — lista fija de 400 px a la izquierda, mapa a la derecha. Pasar el
cursor por una tarjeta resalta su marcador.

### Marcadores

Color por disponibilidad de cupo de voluntariado, **con forma distinta además del
color**:

| Estado | Color | Forma |
|---|---|---|
| Con cupo | `--estado-ok` | círculo lleno |
| Casi lleno | `--estado-atencion` | círculo con anillo |
| Sin cupo | `--neutro-400` | círculo hueco |
| Cerrado ahora | `--neutro-200` | círculo hueco atenuado |

Agrupación en racimos cuando hay muchos marcadores juntos.

### Filtros

Fila desplazable horizontal, siempre visible sobre el mapa:

1. **Recibe** — multiselección de categorías. Muestra solo acopios que necesiten
   alguna de las elegidas
2. **No recibe** — muestra qué acopios rechazan qué. **Es el filtro más
   importante**; dale peso visual
3. **Abierto ahora** — interruptor
4. **Con cupo** — interruptor de voluntariado

Los filtros activos aparecen como etiquetas removibles bajo la fila.

### Tarjeta de acopio en la lista

```
Acopio Norte                        a 2,3 km
✓ Abierto hasta las 6:00 p.m.
Calle 127 # 15-30

Necesita   💧 Agua   👶 Pañales   🧴 Aseo
No recibe  👕 Ropa
                              actualizado hace 14 min
```

- **«Necesita» en positivo**, con las categorías bajo el mínimo
- **«No recibe» en morado**, con las marcadas
- **Antigüedad abajo a la derecha, siempre**
- Toda la tarjeta es tocable

### Estados

- **Carga:** mapa gris con esqueletos de tarjeta en la hoja inferior
- **Sin resultados:** *«Ningún acopio coincide con estos filtros»* y un botón
  **«Quitar filtros»**
- **Ubicación denegada:** centra en Bogotá y muestra la barra de búsqueda por
  dirección. **No insistas con el permiso**
- **Sin conexión:** *«No pudimos cargar los acopios. Revisa tu conexión.»* con un
  botón de reintentar

### Accesibilidad

- **Vista de lista equivalente**, alcanzable por teclado, con toda la información
  del mapa. Un mapa nunca es la única forma de llegar al dato
- Los marcadores tienen etiquetas ARIA con nombre, distancia y estado
- Los filtros son casillas y interruptores nativos, no elementos personalizados

### Datos

```
GET /api/publico/acopios?lat=&lng=&recibe=&noRecibe=&abierto=&conCupo=
```

Devuelve por acopio: nombre, dirección, coordenadas, horario, estado de apertura,
categorías bajo el mínimo, categorías en *no recibir*, cupos libres y antigüedad
del último movimiento.

### Rendimiento

- Menos de 3 s hasta el mapa utilizable en 3G
- Carga solo los acopios del área visible
- Retrasa la petición 300 ms mientras se mueve el mapa

### Lo que NO debe tener

- Ningún modal al abrir la página
- Ninguna solicitud de ubicación antes de que el usuario toque `⌖`
- Ningún acopio cerrado permanentemente
