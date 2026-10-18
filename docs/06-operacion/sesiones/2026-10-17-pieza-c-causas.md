---
title: "Sesión 2026-10-17 · Pieza C: verificación de entidades y causas"
type: informe
tags: [operacion, sesion]
estado: vigente
actualizado: 2026-10-17
---

# Sesión 2026-10-17 · Pieza C: verificación de entidades y causas

Después de aprobar las maquetas de P3 y P4, Joseph eligió seguir con la pieza C
([#48](https://github.com/Proyecto-IngSoftware/acopio/issues/48)). En la sesión salieron la
especificación, el plan, las maquetas de consola y la construcción completa. Todo quedó en la
rama `pieza-c-especificacion`, en un solo PR.

## Qué cambió

| PR o commit | Qué trae |
|---|---|
| [#117](https://github.com/Proyecto-IngSoftware/acopio/pull/117), rama `pieza-c-especificacion` | Especificación y plan; `acopios` migrado a DAO; reglas puras de causas en `packages/shared`; tabla `causa` y columnas de verificación en `entidad`; API de verificación, logotipo, causas, rutas públicas y archivado diario; P3, causas atendidas y P4; C15 con verificación y logotipo; C22 Causas; causas de la demo; dos recorridos |

Fuera del repositorio:

- En Stitch (ACOPIO DISEÑO) quedaron tres pantallas nuevas: C22 lista
  `768328f56a6c41afbb94ffcbe0ba2a0c`, C22 formulario `00d0b836ec314adca5392dc3cba85e8f` y C15
  con el aviso `ec9bd4ce58b247b198b27f25acf5531c`.
- Maqueta de consola: <https://claude.ai/artifact/9ATaVZKYFvQQgVQPUjKYHe>. La de P3 y P4 se
  republicó con la nota «Verificada por el equipo de Acopio».
- En el Compose local se aplicó la migración y se corrió `seed:demo`.

## Pruebas

- Verificación completa en local con código de salida 0: `lint`, `typecheck`, `depcruise`,
  `test` (shared 94, API 70, web 853), `test:int` (402/402) y `revisar-colores.sh`.
- Recorridos contra el Compose: `portal-causas.mjs` 4/4 y `consola-causas.mjs` 6/6.
- Contra el servidor de pruebas, después de desplegar #117: `portal-causas.mjs` 4/4. El
  servidor sembró las causas «(demo)» al arrancar. `consola-causas.mjs` no se corrió allá
  porque necesita la contraseña del administrador
  ([P-066](../../01-requerimientos/pendientes.md)).

## Decisiones

Joseph tomó en la conversación de la especificación las decisiones C-01 a C-07: verificación
sin documento, solo organizaciones reconocidas con aviso de seguridad, el plazo en la causa con
tope de 6 meses y renovación, lo más reciente primero, atendidas en pantalla aparte y personas
desaparecidas fija. Aprobó C-08 a C-10 al revisar la lógica. Quedaron en
[P-065](../../01-requerimientos/pendientes.md) y en la
[especificación](../../superpowers/specs/2026-10-17-pieza-c-causas-design.md). Aprobó la
especificación y las dos maquetas de consola.

Las decisiones que Claude tomó al construir están en §11 de la especificación («Cambios al
construir»). La que más pesa: editar el enlace o la entidad de una causa también pide
confirmar.

## Errores y correcciones

- El revisor aparte de la rama no pudo correr: se agotó el límite semanal del modelo. La
  revisión final fue una autorrevisión, y lo dice el plan. Encontró que editar una causa sin
  cambiar el destino pedía confirmar, porque la web manda todos los campos; se corrigió con su
  prueba.
- El primer `consola-causas.mjs` encontró el formulario de C22 a 420 px de ancho: el `fieldset`
  de los pasos tiene `min-width: min-content` por defecto. Se corrigió con `min-w-0`.
- En el mismo recorrido, `getByLabel('Paso 1')` encontraba también «Subir paso 1» y los demás
  botones; se pasó a coincidencia exacta.
- `rutas.test.tsx` esperaba «Próximamente» en `/causas`; se cambió por una prueba de que abre el
  directorio.

## Pendiente

- El recorrido de consola contra el servidor, los criterios de HU-02 y HU-15 con Joseph y tres
  menores de la revisión ([P-066](../../01-requerimientos/pendientes.md),
  [#48](https://github.com/Proyecto-IngSoftware/acopio/issues/48)).
- La especificación del Bloque 5
  ([#36](https://github.com/Proyecto-IngSoftware/acopio/issues/36)), que es lo siguiente según
  el [índice de planes](../../05-planes/README.md).

## Depende de Joseph

- Correr `consola-causas.mjs` contra el servidor con `ADMIN_CONTRASENA`, o pasarme la
  contraseña en la sesión ([P-066](../../01-requerimientos/pendientes.md)).
- Revisar los criterios de HU-02 y HU-15 (§9 de la especificación).
