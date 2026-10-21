---
title: "Componentes compartidos · diseño en Stitch"
type: diseno
tags: [diseno, stitch, componentes]
estado: vigente
actualizado: 2026-10-21
---

# Componentes compartidos

Las piezas que se repiten entre pantallas, normalizadas el 2026-09-30 a pedido de Joseph.
Cada pantalla nueva las usa tal cual; si Stitch genera una variante, en el código manda
esta.

Maqueta: [maqueta.html](maqueta.html), publicada en
<https://claude.ai/artifact/5xgh6EqSamnsA8VPE5NBX6>.

| Pieza | Dónde se usa | Contenido | Origen |
|---|---|---|---|
| Cabecera pública | Portal sin sesión | Marca (recuadro con `inventory_2`, «Acopio», etiqueta «CO») y botón «Entrar» | Portada de Stitch, sin «Sincronizado» ni el ícono de persona |
| Cabecera de acceso | C01: entrar y activar cuenta | La misma marca, sin «Entrar» | Igual a la pública |
| Cabecera con sesión | Todo, con sesión iniciada | Marca, conmutador de ubicación (ícono `warehouse`, nombre y `expand_more`) y botón redondo con las iniciales, que abre el menú de la cuenta | Pantalla «Inicio con sesión - Acopio» (`03abc1a013724b4ab0957bd8f01ee818`), guardada en [cabecera-con-sesion/](cabecera-con-sesion/) |
| Barra inferior | Todas las pantallas del portal, con o sin sesión | Inicio, Mapa, Causas, Voluntariado y Más | Portada de Stitch |

## Piezas de la línea visual

Aprobadas por Joseph el 2026-10-21 en el lienzo <https://claude.ai/artifact/6E2tVtacyqTcuifM1VNFyR>
([ADR-0022](../../../02-arquitectura/adr/ADR-0022-linea-visual-con-movimiento-e-ilustracion.md)).
El lienzo hace de maqueta de estas piezas; la estructura de cada pantalla sigue saliendo de Stitch.

| Pieza | Dónde se usa | Contenido |
|---|---|---|
| Bloque de fecha | Días de agenda: jornadas, reservas, turnos | Recuadro verde claro con el día de la semana y el número; el mes si está a más de una semana; gris si ya no admite acción |
| Tira de días | Voluntariado (P7) | Fila deslizable de días, con punto en los que tienen jornadas; reemplaza el filtro «Día» |
| Barra | Cupos, balance de la Portada | Medidor delgado que se llena al aparecer; ámbar cuando quedan pocos cupos |
| Ilustraciones | Estados vacíos y piezas sin foto | Cajas, calendario, mapa y caja con folio, planos y en los verdes de la marca |
| Sello | Confirmaciones | Check que se traza dentro de un círculo |
| Movimiento | Todo el portal y la consola | Toque al presionar, entrada de página según la dirección, hoja que sube y baja, menú que se despliega, píldora que se desliza |

## Reglas

- Con sesión, el inicio sigue siendo la Portada: mismo contenido, solo cambia la
  cabecera.
- Las herramientas de cada rol (inventario, recepción, despacho, usuarios, bitácora)
  se abren desde «Más», como en las pantallas «Más - Perfil…» de Stitch.
- El conmutador de ubicación solo aparece si la persona tiene más de una ubicación
  asignada (sistema de diseño §6).
- Ninguna cabecera muestra «Sincronizado». Con la captura sin conexión (ciclo 3 del Bloque 2), la cabecera con sesión muestra una pastilla «N sin sincronizar» mientras haya entradas pendientes, y nada cuando no las hay.
- En `apps/web` las piezas usan los tokens. En la cabecera con sesión, Stitch dejó un
  fondo `#f0fdf9` y un alto de 36 px en el conmutador; en la maqueta ya van como
  `surface-container-lowest` y 44 px de alto.

La pantalla «Inicio con sesión» se generó solo para sacar la cabecera. Su cuerpo tiene
colores corridos respecto al tema y no se usa.
