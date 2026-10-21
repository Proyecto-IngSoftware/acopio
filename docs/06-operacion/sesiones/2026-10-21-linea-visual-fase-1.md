---
title: "Sesión 2026-10-21 · Línea visual, fase 1"
type: informe
tags: [operacion, sesion, web, diseno]
estado: vigente
actualizado: 2026-10-21
---

# Sesión 2026-10-21 · Línea visual, fase 1

Joseph sentía la web pesada y vacía, y quería animaciones y jornadas con fecha en la Portada. Se
probaron variantes en Stitch, se armó un lienzo con cuatro ideas que Joseph aprobó y se construyó
la fase 1: las piezas comunes y el movimiento global. Queda en el PR de la rama
`linea-visual-fase-1`, sin fusionar hasta después de la sustentación del 23.

## Qué cambió

| PR o commit | Qué trae |
|---|---|
| PR de `linea-visual-fase-1` ([#177](https://github.com/Proyecto-IngSoftware/acopio/issues/177)) | `partesFecha` y `diasDeLaTira`; clases de movimiento en `estilos.css` y esqueleto con brillo; botones con toque, inhabilitado en gris sólido, `ocupado` y tamaño compacto; `BloqueFecha`, `TiraDias`, `Barra`, `Ilustracion` (cuatro dibujos), `EstadoVacio` con ilustración, `SelloConfirmacion` y `Desplegable`; la hoja entra y sale; píldora deslizante en `Segmentado` y en la barra inferior; la página entra según la dirección |
| Mismo PR, documentos | [Especificación](../../superpowers/specs/2026-10-21-linea-visual-design.md), [plan de la fase 1](../../05-planes/2026-10-21-linea-visual-fase-1.md), [ADR-0022](../../02-arquitectura/adr/ADR-0022-linea-visual-con-movimiento-e-ilustracion.md), sistema de diseño (§1, §5, §6 y §8), piezas compartidas de Stitch, catálogo de patrones y la fila 22 del [plan de acción](../../05-planes/plan-de-accion.md) |

Fuera del repositorio:

- En Stitch, tres variantes de la Portada (Inmersiva, Editorial y Comunitaria) en el proyecto ACOPIO DISEÑO. No se usan.
- El lienzo de ideas, publicado en <https://claude.ai/artifact/6E2tVtacyqTcuifM1VNFyR>.
- El issue [#177](https://github.com/Proyecto-IngSoftware/acopio/issues/177).

## Pruebas

- La verificación completa pasó con salida 0: lint, typecheck, depcruise, `revisar-colores.sh`, 116 pruebas de `shared`, 100 de la API y 1214 de la web, y 552 de integración contra un PostgreSQL aparte.
- Los 13 recorridos de `apps/web/recorridos/` pasaron en local con la web construida y `CAPTURAS=no`. Cuatro fallaron al principio por el 429 del inicio de sesión de las cuentas de la demo, al correr varios seguidos, y pasaron al repetirlos después de un minuto.
- Se tomaron capturas a 360 px con Playwright, con «reducir movimiento» encendido y apagado, de Inicio a Voluntariado, de C14 con `Segmentado` y del menú de la cuenta. No hubo scroll horizontal ni errores de página, y con menos movimiento todo aparece en su estado final. Las `construida.png` de cada pantalla no cambiaron; cambian en las fases 2 y 3.
- La revisión final de la rama la hizo Claude y no un revisor aparte. Encontró dos detalles menores, que Joseph pidió corregir y quedaron corregidos con su prueba: la entrada de página se cortaba si el marco se redibujaba, y `Segmentado` dibujaba la píldora sin opción elegida.

## Decisiones

- Joseph aprobó las cuatro ideas del lienzo y su paridad en toda la web, consola incluida, y que las transparencias de hoy se mantengan. También que la tira de días reemplace el filtro «Día» en P7 y que las curvas de la franja queden quietas, con el punto en vivo como única animación que se repite. Todo quedó en la especificación y en el ADR-0022.
- Propuesto por Claude y aprobado con la especificación: el bloque de fecha va solo en fechas de agenda, y lleva el mes cuando la fecha está a más de siete días.
- La fusión espera a después del 23, porque Dokploy despliega al fusionar en `main` y la sustentación se hace sobre la demo del servidor. Claude lo propuso y Joseph no lo objetó; está escrito en [#177](https://github.com/Proyecto-IngSoftware/acopio/issues/177) y en la fila 22 del plan de acción.
- Lo que cambió al construir está en la sección «Cambios al construir» de la especificación.

## Errores y correcciones

- El hook de humanizer frenó dos comandos que no escribían notas: un comentario CSS con una ruta de `docs/` y un `open(` de Python en el mismo comando que la ruta del plan. Se separaron los comandos.
- Un `sed -i` sobre la especificación, con la ruta en una variable, pasó sin que el hook lo viera. Quedó como observación 0032 del registro de task-observer, para ajustar el hook.

## Pendiente

- Fusionar el PR de la fase 1 después de la sustentación del 23, con el CI en verde y sin alertas de code scanning ([#177](https://github.com/Proyecto-IngSoftware/acopio/issues/177)).
- Planes y construcción de las fases 2 (portal) y 3 (consola) ([#177](https://github.com/Proyecto-IngSoftware/acopio/issues/177), fila 22 del [plan de acción](../../05-planes/plan-de-accion.md)).

## Depende de Joseph

- Confirmar que la fusión de la fase 1 va después del 23 ([#177](https://github.com/Proyecto-IngSoftware/acopio/issues/177)).
