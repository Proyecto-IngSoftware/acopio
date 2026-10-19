---
title: "Sesión 2026-10-18 · Grises piedra, auditoría de las pantallas e íconos"
type: informe
tags: [operacion, sesion, diseno]
estado: vigente
actualizado: 2026-10-18
---

# Sesión 2026-10-18 · Grises piedra, auditoría de las pantallas e íconos

La ficha del punto de RedAcopio que salió de Stitch le pareció a Joseph más cálida que el
resto de la app. Los fondos y bordes de toda la app pasaron a grises piedra, se auditaron las 25
pantallas, se corrigió lo que apareció y se agregaron íconos tomados de lo que Stitch propone.

## Qué cambió

| PR o commit | Qué trae |
|---|---|
| Rama `estetica-piedra` | Tokens piedra y ADR-0020; «Lo que urge» de la ficha con `GET /api/publico/acopios/{id}/urgente`; jornadas reales en la portada; frase para cada acción de la bitácora y prueba que lee las acciones de la API; íconos por grupo de categoría, en la bitácora y en Acopios, Entidades, Comprobantes y Seguimiento; teléfono e indicaciones en los acopios de la demo; capturas del Avance 5 y Word regenerados |

Fuera del repositorio: la página de revisión de la estética
(<https://claude.ai/artifact/CPGSjN53hvHT8d8n5SrQCn>) y la de maquetas de la pieza E
(<https://claude.ai/artifact/EVBVTXBgUPXa2Nv4gm73g9>), las dos con la paleta nueva.

## Pruebas

- Pasan `lint`, `typecheck`, `depcruise`, `revisar-colores.sh`, la prueba de contraste de los
  tokens, las unitarias (104 de shared, 71 de la API y 1000 de la web) y las de integración (450).
- Las 25 pantallas se capturaron dos veces a 390 px en local con la demo: antes y después de los
  arreglos.
- Los siete recorridos que guardan capturas para el Word pasan en local con `CAPTURAS_WORD`.
  `portal-turnos` falló al principio porque la jornada sembrada como llena ya está a menos de 12
  horas y marca «Reservas cerradas»; el paso acepta ahora cualquiera de las dos marcas.
- El Word del Avance 5 se regeneró con 22 figuras y se revisó renderizado en el contenedor de
  LibreOffice.

## Decisiones

- Joseph: grises piedra en fondos y bordes; se quedan el verde bosque, el texto secundario, los
  radios de 8 px, la cabecera y la barra inferior ([ADR-0020](../../02-arquitectura/adr/ADR-0020-grises-piedra.md)).
- Joseph: aprobó los tres ajustes de la auditoría (bordes `#d6d3d1`, aviso sin dinero en blanco,
  «Entrar» en menta) y corregir los errores encontrados.
- Claude: los íconos de grupo van en el título de cada grupo en Catálogo y No recibir, y en cada
  fila del Inventario, donde no hay títulos de grupo.
- Claude: el campo de fecha en inglés de las capturas no era un error; la app declara `es-CO`
  y el navegador de las capturas estaba en inglés.

## Errores y correcciones

- La ficha perdió «Cómo entrar» en las capturas. No era el código: los acopios de la demo no
  tenían teléfono ni indicaciones. La demo los trae ahora y los completa también en una base ya
  sembrada.
- La primera auditoría de íconos no vio los de los grupos en `index.html`, porque
  `scripts/iconos.mjs` no leía mapas; ahora lee los mapas `ICONO_*`.

## Pendiente

- Dos pruebas de la web que se cortan por tiempo con toda la suite en paralelo
  ([P-075](../../01-requerimientos/pendientes.md)).
- Subir el Word unificado a OneDrive, con las capturas del tablero y del seguimiento
  ([#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47), fila 2 del
  [plan de acción](../../05-planes/plan-de-accion.md)).
- La pieza E sigue con su plan de implementación y el backend
  ([#49](https://github.com/Proyecto-IngSoftware/acopio/issues/49), filas 8c a 8e).

## Depende de Joseph

Subir el Word del Avance 5 a OneDrive ([#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47)).
