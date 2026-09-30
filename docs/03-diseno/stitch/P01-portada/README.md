---
title: "P01 · Portada · diseño en Stitch"
type: diseno
tags: [diseno, stitch, portada]
estado: vigente
actualizado: 2026-09-30
---

# P01 · Portada · diseño en Stitch

| | |
|---|---|
| Proyecto | ACOPIO DISEÑO (`10306891818878200068`) |
| Pantalla | `1ca5f216464a455bba243f9cdc2aff1f`, con el tema «Acopio · sistema de diseño» (`assets/3694704229522762996`) |
| Exportada | 2026-09-30 |
| Archivos | [captura.png](captura.png) · [pantalla.html](pantalla.html) |
| Maqueta | [maqueta.html](maqueta.html), publicada en <https://claude.ai/artifact/ApPwoi6unvrLvo3DKsene2> |
| Versión anterior | [antes/](antes/): pantalla `3c2359b7032a4987a0858b3f73ce65d4`, con el tema «Acopio Field Command», que usaba rojo como color secundario |

`pantalla.html` y `maqueta.html` son referencia. `apps/web` no los importa: la Portada
se escribe con los componentes base y los tokens.

## Qué manda

La maqueta. Es la Portada tal como se construye en el ciclo 1, con los tokens de
[sistema-diseno.md](../../sistema-diseno.md) y los estados vacíos. Se aprueba sobre ella
antes de escribir código.

## Qué quedó hecho en Stitch y qué no

El tema nuevo se creó en el proyecto y se aplicó a la Portada, que salió como pantalla
nueva. La anterior y su tema siguen en el proyecto, sin tocar.

Aplicar el tema cambió colores y formas. El fondo que genera Stitch es `#fff8f5`, algo
más rosado que el lienzo `#FAFAF9` del sistema de diseño.

La edición del contenido no se completó: la llamada a Stitch agotó el tiempo de espera.
Por eso la captura todavía muestra etiquetas en mayúsculas («CRÍTICO», «URGENTE»,
«MODERADO», «PRIORIDAD MÁXIMA»), los estados con sus nombres anteriores y la flecha de
«Ver mapa de acopios». La maqueta ya corrige todo eso.

## Diferencias aceptadas entre el diseño y lo construido

- Los bloques que dependen de `inventario`, `motor`, `turnos` y causas se construyen
  como estado vacío. El diseño los muestra con datos de ejemplo.
- «Qué hace falta» y «No traigan» son dos pestañas de una tarjeta en el diseño. Mientras
  estén vacíos van como dos bloques seguidos; las pestañas vuelven cuando haya datos.
- El buscador de folio del diseño es por ahora un enlace, porque `comprobantes` no
  existe.
- La franja oscura muestra el nombre de la emergencia, su tipo y su fecha de inicio. La
  frase «9 de 14 zonas siguen sin cobertura» sale del motor y llega con él.
- La foto de «Reporte en terreno» no se usa: el sistema de diseño pide fotografía real
  de la operación o nada.
- Los íconos del diseño son Material Symbols; en el código se usan los de
  `lucide-react`.
