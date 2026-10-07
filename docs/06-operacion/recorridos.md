---
title: "Recorridos de punta a punta"
type: operacion
tags: [operacion, pruebas, web]
estado: vigente
actualizado: 2026-10-07
---

# Recorridos de punta a punta

Los recorridos son scripts de Playwright en `apps/web/recorridos/`. Abren el build de la web
en Chromium a 360 × 640, contra la API del Compose, y hacen lo mismo que haría una persona.
Comprueban lo que las pruebas unitarias y de integración no ven juntas: la web, la API, la
base, Garage y el correo. Se corren al cerrar cada bloque y cada vez que cambie una pantalla
o un flujo.

En cada pantalla revisan cuatro cosas:

- que axe no marque violaciones graves (`critical` o `serious`);
- que no haya scroll horizontal (ancho de la página ≤ 360 px);
- que la página no lance errores de JavaScript;
- en `validacion-general.mjs`, además, que la API no responda 5xx.

Cada script imprime `ok` o `FALLA` por paso, el total y los errores de la página, y sale con
código 1 si algo falla.

## Cómo se corren

```bash
bun run servicios:todo                       # reconstruye la API con el código actual
bun run --filter @acopio/api seed
bun run --filter @acopio/api seed:demo
bun run --filter @acopio/web build
(cd apps/web && bunx vite preview)           # en otra terminal; sirve en el puerto 5173

node apps/web/recorridos/validacion-general.mjs
node apps/web/recorridos/donador.mjs
node apps/web/recorridos/consola-comprobantes.mjs
node apps/web/recorridos/sin-conexion.mjs
```

- La web se sirve en el puerto 5173 porque la API rechaza escrituras con la cookie desde un
  origen distinto de `APP_URL`. `vite preview` reenvía `/api` a la API del Compose.
- Si la API cambió, hay que reconstruirla con `servicios:todo`. Si no, el recorrido prueba la
  versión vieja que sigue en el contenedor.
- `CAPTURAS=no` evita reescribir las capturas `construida*.png` de las notas de diseño.
  `WEB`, `MAILPIT` y `ADMIN_CONTRASENA` cambian la dirección de la web, la de Mailpit y la
  contraseña del administrador del seed.
- Para detener el servidor de `vite preview` sin el PID: `ss -ltnp | grep 5173` y matar ese
  proceso.

## Qué cubre cada uno

| Script | Cubre | Pasos | Captura en |
|---|---|--:|---|
| `validacion-general.mjs` | Cada pantalla con cada rol, accesos negados, invitar y activar, salida, conteo y bitácora | 59 | No guarda capturas |
| `donador.mjs` | El Donador de punta a punta (Bloque 3, ciclo 1) | 8 | P09, P10, P12 y P13 |
| `consola-comprobantes.mjs` | Recibir, conciliar, rechazar y vincular (Bloque 3, ciclo 2) | 10 | C04-recibir-folio, C08-comprobantes y C08-conciliacion |
| `sin-conexion.mjs` | La captura sin conexión de C4 (Bloque 2, ciclo 3) | 12 | C04-sin-conexion y C04-pendientes |

### `validacion-general.mjs`

- **Sin sesión:** Portada, mapa, ficha de Acopio Chapinero, seguimiento de `ACO-2026-DEMA4`,
  privacidad, «Más», cuenta del Donador y «Próximamente». También comprueba tres cosas: una
  ruta que no existe lo dice, la consola manda a `/entrar` y el formulario de la Portada lleva
  al seguimiento.
- **Administrador** (`admin`): usuarios, invitar, catálogo, acopios (lista, nuevo y edición),
  entidades, zonas, bitácora, comprobantes, inventario, «Mi acopio» y «no recibir». Comprueba
  que no entra a C4, que solo es del Operador.
- **Invitar y activar:**
  1. El Administrador invita a un Administrador nuevo con correo.
  2. El enlace llega a Mailpit.
  3. La persona elige su contraseña, entra y abre Usuarios.
- **Operador** (`operador1`):
  - abre C3, C4, C5, C6, recibir por folio, «Mi acopio», «no recibir» y «Sin sincronizar»;
  - abre el historial de una categoría desde C3;
  - registra una salida de 1 kg de arroz y un ajuste por conteo;
  - no entra a Usuarios, Comprobantes ni Catálogo.
- **Auditor** (`auditor1`): bitácora, matriz de acceso, comprobantes e inventario. No entra a
  Catálogo, Usuarios ni Salida.
- **Bitácora:** el Administrador ve la invitación, la activación y la salida en lenguaje
  llano, y ninguna fila muestra el código interno de la acción.
- **Donador** (`donador1@demo.acopio.local`): entra con su correo, abre `/donar` y no entra a
  la consola.

### `donador.mjs`

Crea una cuenta con un correo nuevo y confirma el correo con el enlace de Mailpit, eligiendo la
contraseña. Prepara una donación buscando una categoría, elige el primer acopio y adjunta una
foto válida. Ve el folio, abre su seguimiento y la privacidad, y cancela la donación desde «Mis
donaciones».

### `consola-comprobantes.mjs`

1. Un Donador nuevo, creado por la API, prepara dos donaciones para Acopio Chapinero.
2. `operador1` abre «Recibir por folio» desde C4 y recibe la primera con una línea de menos y
   su motivo. Después recibe la segunda completa.
3. `auditor1` ve la primera en C8 con «Con diferencia», abre la conciliación y la concilia.
4. Rechaza la segunda con «Otro» y una nota. El correo del rechazo llega a Mailpit y luego
   revierte el rechazo.
5. Abre la hoja de «Vincular entradas».

### `sin-conexion.mjs`

`operador1` abre C4 con red y el service worker toma el control. Sin red, registra arroz, agua y
aceite; la cabecera dice «3 sin sincronizar» y C5 explica que necesita conexión. Al volver la
señal las tres se envían solas, y el historial muestra la entrada de arroz con la hora en que
ocurrió y la hora en que llegó.

## Últimos resultados

**2026-10-07**, sobre `2af3b47`, con la API reconstruida y los dos seeds recién corridos:

| Script | Resultado |
|---|---|
| `validacion-general.mjs` | 59 de 59, sin 5xx ni errores de página |
| `donador.mjs` | 8 de 8 |
| `consola-comprobantes.mjs` | 10 de 10 |
| `sin-conexion.mjs` | 12 de 12 |

La validación general encontró un error: la bitácora mostraba 30 acciones de los Bloques 1 a 3
con su código interno («movimiento.salida», «comprobante.recibido»). Se arregló en `2af3b47`
con una prueba que falla si alguna vuelve a salir cruda. Dos detalles menores quedaron en
[#43](https://github.com/Proyecto-IngSoftware/acopio/issues/43): la bitácora nombra con
`@usuario` a quien se invita, y sus filtros no cubren inventario, red ni comprobantes.

## Cuando algo cambia

- **Una pantalla cambia su título, una etiqueta o el texto de un botón.** Los scripts buscan
  por rol y nombre accesible (`getByRole`, `getByLabel`), igual que las pruebas de Vitest. Se
  actualiza el texto en el script y en la tabla de esta nota.
- **Una pantalla nueva.** Se agrega a la lista de su rol en `validacion-general.mjs`, con el
  título que se espera. Si tiene un flujo propio, se le hace un paso de acción.
- **Un rol nuevo o un permiso que cambia.** Se ajustan las listas de rutas permitidas y
  negadas de ese rol.
- **Datos de prueba.** Los scripts usan las cuentas de `seed:demo` (contraseña
  `demo-acopio-2026`), Acopio Chapinero (`d0000000-0000-4000-8000-000000000011`) y el folio
  `ACO-2026-DEMA4`. Si `seed:demo` cambia, se revisan esos valores.
- **Al cerrar un bloque.** Se corren los cuatro scripts y se actualiza «Últimos resultados».

## Problemas conocidos

- El inicio de sesión admite 5 intentos por minuto por IP. Si se corren varios scripts
  seguidos y uno falla en «entra», hay que esperar un minuto.
- La cola de correo sale cada minuto: los pasos que esperan un correo en Mailpit pueden tardar
  hasta 60 s.
- La contraseña de una cuenta nueva no puede contener el nombre ni el usuario de la persona;
  la API responde 422 `CONTRASENA_DEBIL`.
- El seed no reescribe las cuentas que ya existen. Para ver nombres o correos nuevos de
  `seed:demo` hay que recrear la base.
- `sin-conexion.mjs` necesita los seeds recién corridos, porque registra contra los saldos de
  la demo.
- Las capturas de página completa muestran la barra inferior a media pantalla porque es fija.
  En el teléfono se ve abajo.

## Relacionado

- [Planes](../05-planes/README.md): cada plan de bloque pide su recorrido de cierre.
- [Diseños de Stitch](../03-diseno/stitch/README.md): las capturas `construida*.png`.
- [Runbook](runbook.md)
