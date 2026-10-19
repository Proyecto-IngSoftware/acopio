---
title: "Sesión 2026-10-19 · Ronda de pruebas por rol en el servidor"
type: informe
tags: [operacion, sesion, pruebas]
estado: vigente
actualizado: 2026-10-19
---

# Sesión 2026-10-19 · Ronda de pruebas por rol en el servidor

Fila 5 del [plan de acción](../../05-planes/plan-de-accion.md),
[#58](https://github.com/Proyecto-IngSoftware/acopio/issues/58). La ronda corrió en el servidor
con los escenarios de [escenarios-por-rol.md](../escenarios-por-rol.md) que no gastan la demo.
Salieron cinco hallazgos; tres se arreglan en el PR de la ronda y dos quedan abiertos.

## Qué cambió

| PR o commit | Qué trae |
|---|---|
| Rama `ronda-por-rol` | `PasoEntrega.tsx` muestra el nombre de la categoría que un acopio no recibe (#150). `frases.ts` dice «Marcó Sal como resuelta» en la bitácora (#153). La guía de escenarios corregida, con los resultados de la ronda (#154) |

En GitHub se abrieron los hallazgos #150 a #154. En el servidor, la ronda dejó estos cambios en
la demo:

- Una entrada y una salida de 1 kg de arroz en Chapinero; el saldo quedó igual (69 kg).
- Agua potable marcada y desmarcada como «no recibir» en Chapinero.
- Sal en «no recibir» en Chapinero hasta el 20 de octubre (escenario 15).
- Un reporte de Sal en Barrio San Agustín, ya marcado como resuelto.

Todo eso queda en la bitácora.

## Pruebas

La ronda la hizo Joseph solo, con scripts de Playwright a 360 × 640 contra
`https://acopio.josephqaz.dev` y las cuentas de la demo.

| Escenario | Resultado |
|---|---|
| 1 a 4, portal | Pasan. El 1 con la decisión del Bloque 1: el mapa oculta el acopio y lo cuenta |
| 5 y 6, Donador | El 5 pasa. El 6 marca bien el acopio, pero mostraba el id de la categoría (#150) |
| 9 a 12, Operador | Pasan. El 11 sin guardar la entrada |
| 13 | Falla: el inventario no atenúa ni advierte los datos de más de 6 horas (#151) |
| 14 | Pasa |
| 15 | Marcado; se revisa el 20 de octubre |
| 16 | La API rechaza el cambio con 403, pero la pantalla abre (#152) |
| 17 | Pasa: «Pasa de lo que se puede mandar» y el borrador no se puede crear |
| 21, 24, 25, Receptor | Pasan. La bitácora no distinguía el reporte resuelto (#153) |
| 26 y 27, Administrador | Pasan |

Con los arreglos, las pruebas de `src/donador` y de `frases.test.ts` dan 165 de 165. Las
pruebas nuevas fallaron antes del cambio.

## Decisiones

- Joseph decidió hacer hoy solo los escenarios que no gastan la demo y dejar los demás para el
  sábado 24, después de la sustentación del 23. Quedó escrito en la guía y en la fila 5 del plan.

## Errores y correcciones

- El escenario 14 tocó un interruptor de «no recibir» que solo cambia cuando vuelve la respuesta
  de la API. El script lo tomó como falla y cortó antes de desmarcar, así que Agua y Sal
  quedaron marcadas en Chapinero. Se desmarcaron con el mismo script y se comprobó con la API
  antes de repetir el escenario.
- Una captura del script quedó en la raíz del repositorio por una ruta relativa; se borró antes
  del commit.

## Pendiente

- Revisar el 20 de octubre que Sal vuelva a recibirse sola en Chapinero (escenario 15, fila 5
  del [plan de acción](../../05-planes/plan-de-accion.md)).
- El sábado 24, los escenarios que gastan la demo: 7, 8, 18 a 20, 22, 23 y 28 a 31
  ([#58](https://github.com/Proyecto-IngSoftware/acopio/issues/58)).
- [#151](https://github.com/Proyecto-IngSoftware/acopio/issues/151): atenuar y advertir los
  datos de inventario de más de 6 horas.
- [#152](https://github.com/Proyecto-IngSoftware/acopio/issues/152): negar el acceso al «no
  recibir» de un acopio ajeno al abrir la pantalla.
- [#153](https://github.com/Proyecto-IngSoftware/acopio/issues/153), segunda parte: la frase de
  la bitácora para un cambio de fecha en «no recibir».
- Escenarios para HU-01.2, HU-02, HU-15 y HU-03 en la guía; hoy se cubren con sus recorridos
  ([#154](https://github.com/Proyecto-IngSoftware/acopio/issues/154)).

## Depende de Joseph

- El escáner con un teléfono real ([#40](https://github.com/Proyecto-IngSoftware/acopio/issues/40)).
