---
title: "ADR-0022 · Línea visual con movimiento e ilustraciones propias"
type: adr
tags: [arquitectura, adr, diseno, ux]
estado: vigente
adr: 22
decision: aceptada
actualizado: 2026-10-21
---

# ADR-0022 · Línea visual con movimiento e ilustraciones propias

**Fecha:** 2026-10-21 · **Estado:** aceptada · **Ajusta:**
[ADR-0013](ADR-0013-estetica-desde-stitch.md) (la estética sale de Stitch) · **Deriva de:** la
[especificación de la línea visual](../../superpowers/specs/2026-10-21-linea-visual-design.md)

## Contexto

Joseph sentía la web pesada y vacía desde la primera pantalla: fondo claro, texto, cajas grises
cuando no hay datos y nada que se mueva. Se pidieron a Stitch variantes de la Portada con fotos y
ninguna convenció, porque además cambiaban la estructura que se les pidió conservar. Luego se armó
un lienzo con cuatro ideas: la franja con datos vivos, las jornadas con la fecha primero, los
estados vacíos con ilustraciones y el movimiento al tocar
(<https://claude.ai/artifact/6E2tVtacyqTcuifM1VNFyR>). Joseph aprobó las cuatro el 2026-10-21 y
pidió llevarlas a toda la web, portal y consola.

Dos reglas del [sistema de diseño](../../03-diseno/sistema-diseno.md) chocaban con eso: §8 decía
«cero ilustración» y §1 pedía no tener animación decorativa por la batería en terreno.

## Decisión

1. El lienzo es la maqueta aprobada de las piezas comunes: bloque de fecha, tira de días, barra
   que se llena, ilustraciones, sello de confirmación, botones con toque, inhabilitado en gris
   sólido y estado ocupado. También fija el movimiento: entrada de página según la dirección, hoja,
   desplegables y píldora deslizante. Stitch sigue fijando la estructura de cada pantalla.
2. La web usa ilustraciones planas propias en los verdes de la marca y un acento durazno, en
   lugar de fotos. Reemplazan la regla «cero ilustración». Siguen prohibidas las fotos de archivo.
   Una ilustración nueva se muestra a Joseph en el lienzo antes de entrar al código.
3. El movimiento responde a lo que hace la persona: tocar, abrir, cambiar de página, confirmar.
   Lo único que se repite solo es el punto en vivo de la franja de la Portada; las curvas de nivel
   de la franja quedan quietas. El brillo del esqueleto se repite solo mientras algo carga.
4. Todo se hace con CSS y Tailwind, sin librerías nuevas. Con «reducir movimiento» la regla global
   de `apps/web/src/estilos.css` apaga animaciones y transiciones; por eso el estilo base de cada
   elemento animado es su estado final.
5. Las transparencias que había se conservan (velo de las hojas, barra inferior translúcida). Lo
   nuevo las complementa con rellenos sólidos.

## Consecuencias

- Las piezas viven en `apps/web/src/componentes/` y las clases de movimiento en `estilos.css`.
  Están en el catálogo de [patrones y prácticas](../patrones-y-practicas.md).
- Las pantallas las adoptan en dos fases más, portal y consola, cada una con su plan en
  `docs/05-planes/`. Hasta entonces conviven las piezas nuevas con las tarjetas de antes.
- Las capturas `construida.png` de cada pantalla cambian cuando esa pantalla adopta las piezas.
- En las pruebas no existe `matchMedia`, así que todo se comporta como con «reducir movimiento»:
  las hojas cierran de inmediato y las barras aparecen llenas. Las pruebas que miden una animación
  simulan `matchMedia` y usan temporizadores falsos.
