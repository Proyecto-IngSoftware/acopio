---
title: "Componentes compartidos · diseño en Stitch"
type: diseno
tags: [diseno, stitch, componentes]
estado: vigente
actualizado: 2026-09-30
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

## Reglas

- Con sesión, el inicio sigue siendo la Portada: mismo contenido, solo cambia la
  cabecera.
- Las herramientas de cada rol (inventario, recepción, despacho, usuarios, bitácora)
  se abren desde «Más», como en las pantallas «Más - Perfil…» de Stitch.
- El conmutador de ubicación solo aparece si la persona tiene más de una ubicación
  asignada (sistema de diseño §6).
- Ninguna cabecera muestra «Sincronizado» mientras no exista el modo sin conexión.
- En `apps/web` las piezas usan los tokens. En la cabecera con sesión, Stitch dejó un
  fondo `#f0fdf9` y un alto de 36 px en el conmutador; en la maqueta ya van como
  `surface-container-lowest` y 44 px de alto.

La pantalla «Inicio con sesión» se generó solo para sacar la cabecera. Su cuerpo tiene
colores corridos respecto al tema y no se usa.
