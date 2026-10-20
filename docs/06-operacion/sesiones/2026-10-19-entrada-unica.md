---
title: "Sesión 2026-10-19 · Una sola pantalla para entrar"
type: informe
tags: [operacion, sesion, identidad]
estado: vigente
actualizado: 2026-10-19
---

# Sesión 2026-10-19 · Una sola pantalla para entrar

En la ronda por rol, Joseph escribió `admin` en la pantalla de entrada del Donador y el navegador
le pidió un «@». Decidió que haya una sola pantalla de inicio de sesión para todas las cuentas
([P-079](../../01-requerimientos/pendientes.md)) y que la migración de `identidad` a DAO fuera
en el mismo cambio. Quedó hecho, con los doce recorridos en verde en local.

## Qué cambió

| PR o commit | Qué trae |
|---|---|
| [#156](https://github.com/Proyecto-IngSoftware/acopio/pull/156), rama `entrada-unica` | `identidad` a DAO: cinco DAO nuevos, y el guard, los servicios y el proveedor local ya no inyectan Prisma ([ADR-0019](../../02-arquitectura/adr/ADR-0019-dao-sobre-prisma.md)). `POST /api/auth/sesion` acepta un correo o un nombre de usuario para cualquier cuenta y sale `POST /api/auth/donador/sesion`. C01 «Entrar a Acopio» para todos; P13 sin sesión solo crea la cuenta de donador. El correo «Ya tienes una cuenta» enlaza a `/entrar`. Contrato, tipos, recorridos, requisitos, guía de escenarios y los README de C01 y P13 |
| [#157](https://github.com/Proyecto-IngSoftware/acopio/pull/157), rama `revision-entrada-unica` | Arreglos de la revisión independiente: el mensaje de error de C01 según el estado y el aviso sin conexión, y `?volver=` sin caracteres de control. `/entrar` dentro del marco del portal, con la barra de secciones y el botón «Entrar». Nace P-080 |
| [#158](https://github.com/Proyecto-IngSoftware/acopio/pull/158), rama `correo-credencial` | P-080: al cambiar el correo de una cuenta activa, también cambia el de su credencial (`cambiarCorreo` en los dos proveedores) |

Fuera del repositorio: las maquetas de C01 y P13 se publicaron en sus páginas de siempre, y
Joseph las aprobó el mismo día.

La especificación es
[2026-10-19-entrada-unica-design.md](../../superpowers/specs/2026-10-19-entrada-unica-design.md)
y el plan,
[2026-10-19-entrada-unica.md](../../superpowers/plans/2026-10-19-entrada-unica.md).

## Pruebas

- Integración completa, contra el contenedor del puerto 5439: 503 de 503 después de la
  migración y otra vez después del cambio de la API.
- Web: 1029 de 1029.
- Recorridos en local, con la API reconstruida: los doce en verde (detalle en
  [recorridos.md](../recorridos.md#últimos-resultados)).
- Lint, tipos, depcruise y colores, antes de cada PR.
- #157: web 1033 de 1033 e integración 504 de 504. En el servidor, después del despliegue,
  `/entrar` muestra la cabecera, el botón «Entrar» y la barra de secciones (captura con
  Chromium a 360 × 640).
- #158: integración 506 de 506, con las dos pruebas nuevas de `usuarios.int.test.ts`, que antes
  del arreglo fallaban con un 401. El camino de Supabase no se probó en el servidor: habría que
  crear una cuenta y cambiarle el correo en los datos de la demo.

## Decisiones

- Joseph: una sola entrada, «Crear cuenta» solo para el Donador (las cuentas del equipo siguen
  naciendo de una invitación) y la migración de `identidad` en el mismo cambio. Están en
  [P-079](../../01-requerimientos/pendientes.md) y en la especificación.
- Claude: con `?volver=` la pantalla de entrada devuelve a quien venía de una página protegida,
  solo a rutas internas. Un Donador con sesión que abre `/entrar` va a su destino, como ya hacía
  C01. Quedó en «Cambios al construir» de la especificación.

## Errores y correcciones

- Al cambiar en los recorridos la etiqueta «Nombre de usuario» por la nueva, el reemplazo tocó
  también el formulario de invitar, que sigue llamándose así. `validacion-general.mjs` dio 56 de
  60 hasta corregirlo.
- La revisión final de la rama, que hizo Claude sin un revisor aparte, encontró dos fallas que
  se arreglaron con prueba: una cuenta del equipo que abría `/donar` quedaba en un bucle entre
  `/donar` y `/entrar`, y `?volver=` aceptaba una ruta que empieza con barra invertida.

## Revisión independiente

Después de fusionar #156, Joseph pidió pasar un revisor por la rama. No encontró nada crítico y
la migración a DAO conserva la conducta, consulta por consulta. Encontró dos fallas en la web,
que se arreglaron con prueba en el PR siguiente:

- C01 decía «Usuario o contraseña incorrectos.» también sin red o con un error 500, y no avisaba
  cuando no había conexión. Ahora ese mensaje sale solo con un 401; lo demás muestra el texto de
  la API, y sin conexión aparece el aviso y el botón queda inactivo, como ya hacía la pantalla
  del Donador.
- `?volver=` con un tabulador o un salto de línea (`/%09/x.com`) dejaba la pantalla en blanco
  después de entrar, porque el navegador lo lee como `//x.com`. Ahora se rechaza cualquier
  carácter de control.

También señaló un problema anterior a esta rama, que quedó en
[P-080](../../01-requerimientos/pendientes.md): cambiar el correo de una cuenta activa no cambia su
credencial.

En el mismo PR, a pedido de Joseph, `/entrar` pasó al marco del portal: al abrirla
desaparecían la barra de secciones y el botón «Entrar» de la cabecera. Ahora los conserva, y
una prueba de `rutas.test.tsx` lo revisa.

En el servidor, después del despliegue, entraron por `/api/auth/sesion` `admin`, `operador1`,
`donador1@demo.acopio.local` y el administrador con su correo en mayúsculas.

Joseph pidió corregirlo el mismo día y quedó resuelto en la rama `correo-credencial`. Cuando el
Administrador cambia el correo de una cuenta con credencial, la API también cambia el correo de
la credencial en el proveedor, local o Supabase. Dos pruebas de integración lo revisan, y la
integración completa dio 506 de 506.

## Pendiente

Nada de esta sesión. P-080 quedó resuelto.

## Depende de Joseph

Todo está en el [plan de acción](../../05-planes/plan-de-accion.md):

- Fila 2: subir `docs/entregas/Acopio - Avances IS1.docx` a OneDrive antes del 22.
- Fila 4: ensayar la presentación del 23 con la entrada nueva. Si el navegador todavía muestra
  «Entrar a la consola», tocar «Actualizar».
- Fila 5 ([#58](https://github.com/Proyecto-IngSoftware/acopio/issues/58)): el 20, revisar el
  escenario 15; el 24, los escenarios que gastan la demo (7, 8, 18 a 20, 22, 23 y 28 a 31).
