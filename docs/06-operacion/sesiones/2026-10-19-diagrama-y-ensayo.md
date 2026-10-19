---
title: "Sesión 2026-10-19 · Diagrama de paquetes y revisión de la demo"
type: informe
tags: [operacion, sesion]
estado: vigente
actualizado: 2026-10-19
---

# Sesión 2026-10-19 · Diagrama de paquetes y revisión de la demo

Fila 4 del [plan de acción](../../05-planes/plan-de-accion.md), antes de la sustentación del 23.
El diagrama de paquetes de la API ya tiene `importacion`, y en el servidor la demo responde en
los recorridos públicos y con las cuentas de rol. Falta que Joseph ensaye la presentación.

## Qué cambió

| PR o commit | Qué trae |
|---|---|
| Rama `diagrama-paquetes-importacion` | `importacion` arriba de todo en la lámina 2 de [paquetes.html](../../02-arquitectura/diagramas/paquetes.html), con flechas a turnos, inventario, acopios y catálogo. La lámina 1 dice 12 módulos. PNG exportados de nuevo con `exportar-paquetes.mjs`. [vista-general.md](../../02-arquitectura/vista-general.md) fecha la medición el 2026-10-19 y quita una frase que ya no era cierta (`motor` sí importa `almacenamiento`) |

Fuera del repositorio: la página publicada [Paquetes de Acopio](https://claude.ai/artifact/BSJbNw246Jiryztzjydreo)
quedó igual a `paquetes.html`. Seguía en la versión del 8 de octubre, sin `turnos` ni
`importacion`.

## Pruebas

- Dependencias medidas con dependency-cruiser sobre `apps/api/src`. `importacion` importa
  acopios, almacenamiento, auditoria, catalogo, inventario y turnos, y ningún módulo la importa.
  El resto del grafo coincide con lo dibujado, salvo `comprobantes → catalogo`, que el pie de la
  lámina menciona sin flecha.
- Contra `https://acopio.josephqaz.dev`, con `CAPTURAS=no`: `referenciados.mjs` 6 de 6,
  `portal-causas.mjs` 4 de 4 y `portal-turnos.mjs` 6 de 6, sin errores de página.
- Inicio de sesión en el servidor con `DEMO_CONTRASENA`: entran `operador1`, `operador2`,
  `auditor1` y `receptor1`. El login del Donador por correo no se probó.
- No se corrieron los recorridos de la consola contra el servidor: gastan la demo (aprueban
  sugerencias, despachan) y piden la contraseña del administrador del servidor.

## Decisiones

Ninguna nueva.

## Errores y correcciones

- La primera prueba de inicio de sesión mandó el correo en `usuario` y dio 401 en las cinco
  cuentas. El endpoint pide el nombre de usuario; con él entraron las cuatro.
- Una parte del registro del plan y de `recorridos.md` se escribió por Bash antes de invocar
  humanizer para esos archivos. Después se revisó el texto con humanizer.

## Pendiente

- Capturas del mapa y de Causas, y el Word del Avance 5 regenerado, que ahora lleva el diagrama
  nuevo (fila 2 del [plan de acción](../../05-planes/plan-de-accion.md),
  [#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47)).
- Ronda de pruebas por rol en el servidor (fila 5,
  [#58](https://github.com/Proyecto-IngSoftware/acopio/issues/58)).

## Depende de Joseph

- Ensayar la presentación sobre la demo del servidor (fila 4 del
  [plan de acción](../../05-planes/plan-de-accion.md),
  [#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47)).
