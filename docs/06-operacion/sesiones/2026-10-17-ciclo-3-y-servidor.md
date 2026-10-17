---
title: "Sesión 2026-10-17 (madrugada) · Ciclo 3 del Receptor y servidor de pruebas"
type: informe
tags: [operacion, sesion]
estado: vigente
actualizado: 2026-10-17
---

# Sesión 2026-10-17 (madrugada) · Ciclo 3 del Receptor y servidor de pruebas

Informe recuperado el 2026-10-17 de los mensajes de cierre de esa sesión (de 01:12 a 08:34
UTC), que solo estaban en el chat. Se construyó el ciclo 3 del motor para el Receptor, y el
servidor de pruebas quedó comprobado con la demo sembrada.

## Qué cambió

| PR | Qué trae |
|---|---|
| #97 | Ciclo 3 del Receptor: recibir remisiones con foto (C13), reportar necesidades (C20) y «Mi zona» como sección de «Más» |
| #98 | El hook para que Claude fusione los PR que abre |
| #99 | nginx llega a la API por `acopio-api`; en Dokploy llegaba a otro servicio con el mismo nombre |
| #100 | La API prepara Garage sola al arrancar: llave, bucket y permisos |
| #101, #103 | Plan del servidor al día y los recorridos con el modo `SIN_CORREO` |
| #102 | P-060 en pendientes: el usuario recordado en localStorage |
| #104 | Margen lateral en 16 pantallas de la consola |
| #105 | Zonas con necesidad en el mapa público (HU-13.1) |
| #106 | El mapa ya no se reencuadra solo y baja a la tarjeta elegida |
| #107 | Avisos para la ronda del equipo |

Fuera del repositorio, la demo quedó sembrada en el servidor, con las 6 cuentas en Supabase, y
el servidor se despliega solo al fusionar en `main`. Se cerró #53.

## Pruebas

- Al cerrar el #97, unitarias de la web 779/779 e integración 369/369.
- Contra el servidor, con `SIN_CORREO=1`, pasaron los recorridos que pueden correr allá, y
  `pruebas-manuales.sh` dio 11 de 11 (detalle en [recorridos](../recorridos.md)).
- `consola-remisiones.mjs` fallaba en local. Se atribuyó a datos viejos de la demo, y la sesión
  siguiente encontró que la causa era el script (ver
  [el informe siguiente](2026-10-17-recorridos-y-mi-zona.md)).

## Decisiones

- El ciclo 3 entró recortado para el domingo 18, con «Mi zona» como pantalla propia y la capa
  de P05 para después. La capa de P05 alcanzó a entrar en la misma sesión (#105).
- `useRecibir` se renombró a `useRecibirRemision`, porque el nombre ya existía en
  `comprobantes.ts`.
- La revisión final de la rama pidió tres arreglos importantes (un 409 sin salida, la falta de
  «Volver a Por recibir» y la caché del QR). Quedaron en el #97 con sus pruebas.

## Errores y correcciones

- El #97 dijo «nueve menores anotados para después» sin escribirlos en ningún lado. Se
  recuperaron de este informe y quedaron en [P-061](../../01-requerimientos/pendientes.md).

## Pendiente

- La ronda de pruebas del equipo, tocando «Actualizar» antes de reportar
  ([#58](https://github.com/Proyecto-IngSoftware/acopio/issues/58)).
- «Mi zona» como pantalla propia. Se hizo el mismo día, en el #109.
- Los nueve menores de la revisión del ciclo 3 ([P-061](../../01-requerimientos/pendientes.md)).
- El usuario recordado, para después de la presentación
  ([P-060](../../01-requerimientos/pendientes.md)).
- `consola-remisiones.mjs` en local y `donador.mjs` en el servidor. Se resolvieron el mismo día,
  en el #108.

## Depende de Joseph

- Una `DEMO_CONTRASENA` más fuerte en Dokploy, y borrar la primera descripción del PR #99
  ([P-062](../../01-requerimientos/pendientes.md)).
- `R-2026-RF4J7` se dejó en camino para practicar la recepción en la ronda
  ([escenarios por rol](../escenarios-por-rol.md)).
