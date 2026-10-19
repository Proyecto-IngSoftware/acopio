---
title: "Sesión 2026-10-19 · Capturas nuevas del Avance 5"
type: informe
tags: [operacion, sesion]
estado: vigente
actualizado: 2026-10-19
---

# Sesión 2026-10-19 · Capturas nuevas del Avance 5

Fila 2 del [plan de acción](../../05-planes/plan-de-accion.md). El Word del Avance 5 tiene las
capturas nuevas de Causas y del mapa y el diagrama de paquetes con `importacion`. Le faltan las
capturas del tablero y del seguimiento, y la subida a OneDrive, que dependen de Joseph.

## Qué cambió

| PR o commit | Qué trae |
|---|---|
| Rama `capturas-avance-5` | Las seis capturas de Causas y la de la zona en el mapa, tomadas de nuevo. Dos figuras nuevas: `causas-7-plataformas.png` y `otras-mapa-puntos.png`. [avance-05-sprint2.md](../../entregas/avance-05-sprint2.md) con sus pies y la fecha de los diagramas. Los dos Word regenerados. La píldora de los pines del mapa con `aria-hidden`, con su prueba. `consola-causas.mjs` espera a que se cierre la hoja antes de abrir la ficha. [recorridos.md](../recorridos.md) dice de dónde sale cada captura del Word |

## Pruebas

- En local, con la API reconstruida, `seed:demo` y la web servida con `vite preview`:
  `portal-causas.mjs` 4 de 4, `referenciados.mjs` 6 de 6, `consola-causas.mjs` 6 de 6 y
  `consola-recepciones.mjs` 7 de 7.
- `marcador.test.ts`: la prueba nueva falló antes del arreglo y pasa después. Las pruebas de la
  carpeta del mapa dan 31 de 31.
- El Word del Avance 5 se renderizó con `render.Dockerfile`. Tiene 18 páginas; se revisaron las
  de las capturas nuevas y la del diagrama de paquetes.

## Decisiones

- Las capturas de las plataformas y de los puntos del mapa se tomaron con un script aparte, no
  con `CAPTURAS_WORD`, que solo guarda el comienzo de la página. Quedó escrito en
  [recorridos.md](../recorridos.md#capturas-para-el-word).

## Errores y correcciones

- La primera corrida pasó a `consola-causas.mjs` la contraseña del administrador del servidor,
  y el administrador local no entró. Sin `ADMIN_CONTRASENA`, entró.
- `consola-recepciones.mjs` falló porque desde #144 el pin de la zona se anunciaba como «3
  faltantes» y no como «Zona con necesidad». A los pines de los acopios les pasaba lo mismo con
  su nombre recortado. Se arregló en la web: la píldora va con `aria-hidden` y el lector de
  pantalla vuelve a leer el `title` del marcador.
- `consola-causas.mjs` falló una vez en su último paso. La bitácora mostró que la verificación
  se había quitado, y la ficha, abierta aparte, mostraba el aviso. La causa más probable es que
  el recorrido abría la ficha antes de que la API respondiera, así que ahora espera a que se
  cierre la hoja. Con el cambio pasó una vez, y una sola corrida no prueba que la carrera
  desapareció.
- La fila del índice de esta carpeta se escribió con Bash antes de invocar humanizer para ella;
  se revisó después.

## Pendiente

- Capturas del tablero del Sprint 2 y del seguimiento, y subir «Acopio - Avances IS1.docx» a
  OneDrive (fila 2 del [plan de acción](../../05-planes/plan-de-accion.md),
  [#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47)).

## Depende de Joseph

- Las dos capturas, porque el Project es privado y solo se ve con su sesión de GitHub. Van en
  `docs/entregas/evidencia/avance-05/tablero.png` y `seguimiento.png`; después se corren
  `generar-avance-05.py` y `unificar-avances.py`
  ([#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47)).
- Subir el Word unificado a OneDrive.
