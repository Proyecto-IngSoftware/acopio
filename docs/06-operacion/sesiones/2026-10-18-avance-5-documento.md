---
title: "Sesión 2026-10-18 · Word del Avance 5"
type: informe
tags: [operacion, sesion, entrega, sprint-2]
estado: vigente
actualizado: 2026-10-18
---

# Sesión 2026-10-18 · Word del Avance 5

Se armó el documento del Avance 5 (Sprint 2) para la sustentación del 23 de octubre. Quedó
generado y unido al documento de avances; para subirlo a OneDrive faltan dos capturas y la
retrospectiva, que dependen de Joseph.

## Qué cambió

| PR o commit | Qué trae |
|---|---|
| Rama `avance-5-documento` | `avance-05-sprint2.md` reescrita como fuente del Word; `generar-avance-05.py`; ocho capturas y la salida de `docker ps` en `evidencia/avance-05/`; «Avance 5 - Sprint 2 - Acopio.docx» y el unificado con el Avance 5; P-072 resuelto; plan de acción e índice de entregas al día |

En GitHub, #47 corrige la fecha de la Review (era el 30, es el 23) y tiene un comentario con
lo que falta.

## Pruebas

- El Word se generó sin errores: 8 figuras y 15 tablas. Se revisó su texto con python-docx:
  los cuatro títulos de primer nivel en orden, los seis recuadros de pendiente y ningún resto
  de Markdown (`**`, enlaces sin convertir, acentos graves). No se pudo ver el diseño
  renderizado porque el equipo no tiene LibreOffice; hay que abrirlo en Word antes de subirlo.
- Las capturas son de la demo del servidor, tomadas del alto de la pantalla para que la
  cabecera y la barra inferior no queden superpuestas. Se descartó una de validación porque el
  navegador de prueba mostraba el aviso nativo en inglés.
- Los resultados de los recorridos que cita la §3c salen de `recorridos.md` (17 y 18 de
  octubre).
- `node scripts/revisar-plan.mjs` coincide con GitHub, y la verificación completa corrió antes
  del commit.

Después, a pedido de Joseph, el Word sumó los diagramas y más pantallas (rama
`avance-5-diagramas`). El diagrama de paquetes de la API no tenía `turnos`; se agregó con sus
dependencias reales y se regeneraron los PNG de todos los diagramas, que eran del 9 de
octubre. El Word quedó con 17 figuras y los diagramas en una sección horizontal.

Por último, con un contenedor de LibreOffice (`docs/entregas/render.Dockerfile`) se vio el
Word renderizado por primera vez. Cada captura de teléfono ocupaba una página casi en blanco y
el documento de remisión quedaba diminuto por su alto. Ahora las capturas van en galerías de
tres por fila, el documento está recortado hasta el QR, y salieron el diagrama de contenedores
y el ER del motor, que no se leían en la página. El Word pasó de 26 a 17 páginas. Joseph dictó
la retrospectiva; la acción quedó atada a la pieza E (#49) para que se pueda verificar.

## Decisiones

Las tomó Joseph en la sesión:

- Daily Scrum con su trabajo real del sprint; las filas de los demás dicen «Sin registro en
  este seguimiento».
- Las pantallas documentadas son el flujo del motor (HU-10a, 10b, 11 y 12) y el de las causas
  (HU-02 y HU-15). Turnos (HU-03) se menciona como trabajo fuera del Planning.
- El Planning es el borrador del 9 de octubre sin cambios de contenido. La retrospectiva la
  escribe él.

## Errores y correcciones

- La primera versión del generador empezaba a copiar desde una cita de «## 1. Incremento
  funcional» en la introducción, y metía el tablero de trabajo en el Word. Ahora busca el
  título al inicio de una línea.
- La tabla de recorridos de la §3c tenía resultados escritos sin comprobar para el motor, las
  remisiones y las recepciones. Se reemplazaron por los registrados en `recorridos.md`, con su
  fecha.
- En el flujo del motor decía que el saldo de la zona se actualiza al recibir, sin haberlo
  comprobado; quedó lo que muestra la pantalla, que lleva a la ficha de la zona.

## Pendiente

- El balance de la portada no está conectado a la API
  ([P-073](../../01-requerimientos/pendientes.md), [#50](https://github.com/Proyecto-IngSoftware/acopio/issues/50)).

Todo está en la fila 2 del [plan de acción](../../05-planes/plan-de-accion.md) y en
[#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47).

## Depende de Joseph

- La captura del tablero del Project con las historias del Sprint 2, en
  `docs/entregas/evidencia/avance-05/tablero.png`.
- La captura del seguimiento, en `docs/entregas/evidencia/avance-05/seguimiento.png`.
- Después: `python generar-avance-05.py` y `python unificar-avances.py` desde
  `docs/entregas`, revisar el Word y subirlo a OneDrive.
