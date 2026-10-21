---
title: "Recorridos de punta a punta"
type: operacion
tags: [operacion, pruebas, web]
estado: vigente
actualizado: 2026-10-20
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
node apps/web/recorridos/presentaciones.mjs
node apps/web/recorridos/consola-motor.mjs
node apps/web/recorridos/consola-remisiones.mjs
node apps/web/recorridos/consola-recepciones.mjs
node apps/web/recorridos/sin-conexion.mjs
node apps/web/recorridos/portal-causas.mjs
node apps/web/recorridos/consola-causas.mjs
node apps/web/recorridos/portal-turnos.mjs
node apps/web/recorridos/consola-turnos.mjs
node apps/web/recorridos/referenciados.mjs
```

- La web se sirve en el puerto 5173 porque la API rechaza escrituras con la cookie desde un
  origen distinto de `APP_URL`. `vite preview` reenvía `/api` a la API del Compose.
- Si la API cambió, hay que reconstruirla con `servicios:todo`. Si no, el recorrido prueba la
  versión vieja que sigue en el contenedor.
- `CAPTURAS=no` evita reescribir las capturas `construida*.png` de las notas de diseño.
  `WEB`, `MAILPIT` y `ADMIN_CONTRASENA` cambian la dirección de la web, la de Mailpit y la
  contraseña del administrador del seed.
- Las cuentas de la demo entran con `DEMO_CONTRASENA`, y si falta, con `demo-acopio-2026`.
  Desde el 2026-10-17 el `.env` local trae en `DEMO_CONTRASENA` la del servidor de pruebas
  (P-062), y las cuentas de la demo local siguen con `demo-acopio-2026`. Si se carga el `.env`
  antes de un recorrido local, hay que pasar `DEMO_CONTRASENA=demo-acopio-2026` en el comando.
  Contra el servidor de pruebas hay que exportarla con el valor que tiene Dokploy.
- Contra el servidor de pruebas va `SIN_CORREO=1`, porque allá no hay Mailpit y el correo
  está apagado (P-055). `validacion-general.mjs` omite invitar y activar un Administrador, que
  además quedaría en el servidor con una contraseña escrita en el script.
  `consola-comprobantes.mjs` dona con `donador1@demo.acopio.local` y omite el correo del
  rechazo. `donador.mjs` no crea cuenta: entra como `donador1@demo.acopio.local` y sigue con
  la donación. `ADMIN_CONTRASENA` lleva la del administrador del servidor.
- Para detener el servidor de `vite preview` sin el PID: `ss -ltnp | grep 5173` y matar ese
  proceso.

### La demo se gasta

Algunos recorridos cambian la demo, y repetirlos el mismo día puede dejarla sin datos:

- `consola-motor.mjs` aprueba una sugerencia y descarta otra en cada corrida. El par
  descartado no se vuelve a proponer en 24 horas, y la sugerencia aprobada deja un borrador
  que compromete el excedente del acopio. Tras unas tres corridas en el mismo día quedan
  menos de dos propuestas, y el paso «C11 recalcula» falla con «hay menos de dos
  sugerencias». La causa está en los datos.
- `consola-remisiones.mjs` despacha y después cancela lo despachado: el inventario de
  Kennedy vuelve con un ajuste y se puede repetir. Si una corrida se corta a la mitad, la
  remisión queda en tránsito y el excedente de Kennedy no vuelve hasta cancelarla.
- `consola-recepciones.mjs` despacha 1 L de agua de Kennedy a la zona de la demo en cada
  corrida y la Receptora la recibe, así que el agua de Kennedy baja 1 L por corrida. Las
  remisiones `R-2026-DEMA2` y `R-2026-DEMA3` de la demo no se tocan: quedan para la ronda de
  pruebas. El Operador entra por la API y no por la pantalla, para gastar dos inicios de
  sesión por corrida.
- Entre el 2026-10-16 y el 2026-10-17, `consola-remisiones.mjs` falló en local en «cambia la
  cantidad de una línea» con «la primera línea tiene 0». La causa no eran los borradores
  viejos de Kennedy. El editor de C12 lista todas las categorías con excedente en orden
  alfabético, con 0 las que no van en la remisión, y el script tomaba el primer campo. En
  local el primero era «Aceite», con 0, y el arroz del borrador venía después. Desde el 2026-10-17 el script lee las
  líneas de la remisión en la API y busca el campo por su categoría.
- La API acepta 5 inicios de sesión por minuto desde la misma IP, y cada recorrido entra
  al menos una vez (`validacion-general.mjs`, con varios roles). Correr varios seguidos hace
  fallar el paso de entrar; entre uno y otro hay que dejar un minuto.

Para volver a la demo del seed se borra solo el volumen de la base. Garage y las llaves no se
tocan, así que no hace falta `almacenamiento:iniciar`:

```bash
docker stop acopio-api-1 acopio-db-1 && docker rm acopio-db-1
docker volume rm acopio_pgdata                 # solo la base: se pierde lo que tenga
bun run servicios:todo                         # crea la base vacía con sus roles
bun run --filter @acopio/api db:migrar
bun run --filter @acopio/api seed
bun run --filter @acopio/api seed:demo
docker restart acopio-api-1                    # arrancó antes de las migraciones
```

Con la demo recién sembrada, conviene correr `consola-motor.mjs` antes que
`consola-remisiones.mjs`.

## Qué cubre cada uno

| Script | Cubre | Pasos | Captura en |
|---|---|--:|---|
| `validacion-general.mjs` | Cada pantalla con cada rol, accesos negados, invitar y activar, salida, conteo y bitácora | 60 | No guarda capturas |
| `donador.mjs` | El Donador de punta a punta (Bloque 3, ciclo 1) | 8 | P09, P10, P12 y P13 |
| `consola-comprobantes.mjs` | Recibir, conciliar, rechazar y vincular (Bloque 3, ciclo 2) | 10 | C04-recibir-folio, C08-comprobantes y C08-conciliacion |
| `presentaciones.mjs` | Presentaciones y códigos de barras (fase de presentaciones): el Donador escanea con la cámara falsa un EAN que Acopio no conoce, propone una presentación nueva y prepara una donación para Acopio Chapinero; `operador1` recibe el folio y confirma el código con «Es correcto»; el Administrador lo ve «Validado» en C18 y, al escanearlo ahí, se abre su presentación. Comprueba en la API el estado del código (`PROPUESTO` y luego `VALIDADO`) y que la línea recibida conserva el EAN con cantidad confirmada. Inventa un EAN y una presentación por corrida, así que se puede repetir. Entra como `donador1@demo.acopio.local` y `operador1` con `DEMO_CONTRASENA`, y como `admin` con `ADMIN_CONTRASENA` | 10 | No guarda capturas |
| `consola-motor.mjs` | El motor para el Administrador: ficha de zona, recálculo, aprobar con la cantidad editada, descartar con motivo, pesos con vista previa e informe de descartes (Bloque 4, interfaz ciclo 1) | 9 | C10-ficha-zona y C11-motor |
| `consola-remisiones.mjs` | Remisiones para el Operador de Kennedy: la fila de «Más», editar una línea, despachar con responsable y folio comprobando que el saldo baja lo despachado, el documento con QR, cancelar lo despachado comprobando que el saldo vuelve, y un despacho general creado a mano y cancelado (Bloque 4, interfaz ciclo 2). Entra como `operador2` con `DEMO_CONTRASENA`. Al cancelar lo despachado deja la demo como estaba, así se puede repetir | 7 | C12-remisiones |
| `consola-recepciones.mjs` | El Receptor (Bloque 4, interfaz ciclo 3): la fila «Mi zona» de «Más», la pantalla «Mi zona» y su «Ver todas» hacia «Por recibir», confirmar deshabilitado sin foto, subir una foto y ver su miniatura, confirmar y comprobar en la API que la remisión quedó recibida con la nota y la foto, reportar una categoría en C20, comprobar que un visitante sin sesión la ve en el mapa público y en la lista (HU-13.1) y marcarla resuelta. Entra como `receptor1` con `DEMO_CONTRASENA`. El 2026-10-17 pasó 7/7 en local | 7 | mi-zona, C13-recepcion, C20-reportar y P05-mapa |
| `sin-conexion.mjs` | La captura sin conexión de C4 (Bloque 2, ciclo 3) | 12 | C04-sin-conexion y C04-pendientes |
| `portal-causas.mjs` | Lo público de la pieza C sin iniciar sesión: P3 con las causas «(demo)» y su sello, el chip de personas desaparecidas con sus tres enlaces, la ficha con la hoja de salida y su `rel`, y las causas atendidas | 4 | P03-causas y P04-ficha-causa |
| `consola-causas.mjs` | La consola de la pieza C: crea una entidad nueva por corrida, la verifica con el aviso (el botón empieza inactivo), publica una causa con la confirmación de destino, la renueva, archiva otra y le quita la verificación a la entidad; en P4 el enlace desaparece. Entra como `admin` con `ADMIN_CONTRASENA` y no toca las causas «(demo)» | 6 | C15-entidades, C22-causas y P04-ficha-causa |
| `portal-turnos.mjs` | Lo público de turnos sin iniciar sesión (HU-03): P7 con «Clasificar ropa donada (demo)» marcada «Llena», la pestaña «Mapa» con la etiqueta de cupos sobre Acopio Chapinero («FALTAN N PERSONAS», «QUEDAN N CUPOS» o «LLENA», con «+N» si tiene más jornadas) y sus jornadas al tocarlo, el chip que tenga jornadas filtrando el mapa y «Todas» quitándolo, reservar en «Armar mercados (demo)» con un correo nuevo, P8 con el código y el secreto después del `#`, el `.ics`, cancelar y comprobar en la API que `ocupados` volvió a su valor, y P8 sin `#`. Deja la demo como estaba | 8 | P07-voluntariado (construida, construida-mapa y construida-reservar) y P08-mi-reserva |
| `consola-turnos.mjs` | C14 con `operador1` y `DEMO_CONTRASENA`: llega desde «Más», crea una serie de dos fechas y comprueba en la API que comparten serie, mueve una (cambia la hora de fin) y revisa `fin` en la API, ve los inscritos de «Armar mercados (demo)», suma un cupo de ajuste, cierra y reabre las reservas (con el portal sin aceptar reservas mientras está cerrada). Al final devuelve el ajuste y borra la serie desde la pantalla | 7 | C14-turnos |
| `referenciados.mjs` | La pieza E sin iniciar sesión: P5 con la leyenda de RedAcopio y la casilla «Mostrar puntos de RedAcopio» (apagarla quita la leyenda), la sección «Puntos de RedAcopio Bogotá» de la lista con «según RedAcopio» y el enlace a la fuente, la ficha de Sugoi Taller Creativo con su antigüedad, «Ver en RedAcopio» y «Lo que piden», sin «Preparar donación», «Lo que urge» ni «Voluntariado»; P5 con el chip «Falta», la etiqueta «FALTA: Aceite» sobre Acopio Chapinero y su tarjeta con «Qué falta hoy»; y las 9 plataformas al final de Causas, con al menos una foto; `/plataformas` lleva a esa sección | 7 | P05-mapa (construida-referenciados, construida-necesidades y construida-leyenda), P06-ficha-referenciado y P03-causas (construida-plataformas) |

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
contraseña. Con `SIN_CORREO=1` se salta esos dos pasos y entra por la pestaña «Entrar» como
`donador1@demo.acopio.local`; como esa cuenta ya tiene donaciones, el paso de cancelar busca la
fila de su folio y no guarda la captura de «Mis donaciones». Prepara una donación buscando una categoría, elige el primer acopio y adjunta una
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

### `presentaciones.mjs`

1. El script dibuja un EAN-13 nuevo con `sharp`, lo guarda como video MJPEG y lo da a Chromium con
   `--use-file-for-fake-video-capture`. La cámara falsa lo muestra y `@zxing/browser` lo lee
   como lo haría con un envase.
2. El Donador toca «Escanear» en «Preparar donación». La API no conoce el número, así que sale
   «Código nuevo». Elige Arroz, crea una presentación suelta y la asocia: la línea queda
   «Sin confirmar».
3. Prepara la donación para Acopio Chapinero. Por la API, el código está `PROPUESTO` con la
   presentación nueva.
4. `operador1` busca el folio en «Recibir por folio», ve «Código propuesto», toca «Es correcto»
   y registra la recepción.
5. Por la API, el código está `VALIDADO` y la línea conserva el EAN con cantidad confirmada. El
   Administrador abre Catálogo, «Códigos de barras», busca el número, abre la presentación y ve
   la ficha «Validado».
6. El Administrador toca «Escanear» en C18. La cámara falsa lee el mismo número, que ya existe:
   sale el aviso «Ese código ya está en Arroz · …» y se abre el detalle de su presentación.

La API de entrada limita a 5 intentos por minuto, así que el script entra una sola vez como
administrador por la API y reutiliza esa cookie en la pantalla de C18.

### `sin-conexion.mjs`

`operador1` abre C4 con red y el service worker toma el control. Sin red, registra arroz, agua y
aceite; la cabecera dice «3 sin sincronizar» y C5 explica que necesita conexión. Al volver la
señal las tres se envían solas, y el historial muestra la entrada de arroz con la hora en que
ocurrió y la hora en que llegó.

## Capturas para el Word

Con `CAPTURAS_WORD=<carpeta>`, los recorridos que toman capturas guardan además cada una del
alto de la pantalla en esa carpeta, con la cabecera y la barra inferior en su lugar (las de
página completa las dejan superpuestas en medio). Las del Avance 5 salieron así, en local:

```bash
CAPTURAS=no SIN_CORREO=1 CAPTURAS_WORD=/tmp/capturas node apps/web/recorridos/consola-motor.mjs
```

Si se corren varios seguidos, el límite de 5 inicios de sesión por minuto hace fallar el que
entra después; hay que esperar un minuto entre uno y otro.

En local, `ADMIN_CONTRASENA` no se pasa: el administrador del Compose tiene la contraseña por
defecto del script. La de `SEED_ADMIN_CONTRASENA` en el `.env` es la del servidor.

Cada captura se copia a `docs/entregas/evidencia/avance-05/` con otro nombre:

| Recorrido | Captura | En el Word |
|---|---|---|
| `portal-causas.mjs` | `P03-causas-construida.png` | `causas-1-directorio.png` |
| `portal-causas.mjs` | `P04-ficha-causa-construida.png` | `causas-2-ficha.png` |
| `portal-causas.mjs` | `P04-ficha-causa-construida-salida.png` | `causas-3-salida.png` |
| `consola-causas.mjs` | `C15-entidades-construida-verificar.png` | `causas-4-verificar.png` |
| `consola-causas.mjs` | `C22-causas-construida-formulario.png` | `causas-5-publicar.png` |
| `consola-causas.mjs` | `P04-ficha-causa-construida-sin-verificar.png` | `causas-6-sin-verificar.png` |
| `consola-recepciones.mjs` | `P05-mapa-construida-zona.png` | `otras-mapa-zona.png` |

`causas-7-plataformas.png` y `otras-mapa-puntos.png` no salen de un recorrido. Las capturas de
`CAPTURAS_WORD` muestran el comienzo de la página, y la sección de plataformas y los pines del
mapa quedan más abajo. Esas dos se tomaron el 2026-10-19 con un script de Playwright aparte:
baja hasta la sección «Otras plataformas que ayudan» de `/causas` y, en `/mapa`, toca el grupo
de Bogotá para que se vean los dos tipos de punto.

## Últimos resultados

**2026-10-20, en local, mapa de necesidades** (rama `mapa-necesidades`, API reconstruida con
`servicios:todo`): `referenciados.mjs` 7 de 7 y `portal-turnos.mjs` 7 de 7, sin errores de
página. El 5173 lo ocupaba un `vite` de desarrollo, así que el build se sirvió con
`bunx vite preview --port 4174` y los dos corrieron con `WEB=http://localhost:4174`; ninguno
escribe con cookie. La primera corrida de cada uno falló por el script: el chip «Falta» tarda
un instante en quedar con `aria-pressed`, y la etiqueta del punto de P7 lleva el nombre del
ícono delante, así que una expresión con `^` no la encontraba. «Armar mercados (demo)» estaba
fuera de plazo y no salía en el mapa; terminó a las 18:00 y `seed:demo` la volvió a crear tres
días después. Con eso, esa tarde Chapinero mostraba «FALTAN 18 PERSONAS +1»; la cifra cambia con las reservas y con el plazo de cada jornada.

**2026-10-20, en local, P-086 y P-087** (rama `pendientes-086-087`, build servido con
`vite preview --port 4173` y `WEB=http://localhost:4173`): `referenciados.mjs` 7 de 7 y
`portal-turnos.mjs` 8 de 8, sin errores de página, con capturas nuevas porque los íconos cambiaron
de tamaño. `portal-turnos.mjs` falló dos veces antes. La primera, porque «Clasificar ropa donada
(demo)» empezaba en menos de 12 horas, ya no aceptaba reservas y no salía en el mapa; el paso ahora
acepta cualquiera de las dos jornadas de Chapinero. La segunda, porque el paso nuevo de los chips
dejaba la vista de mapa y el siguiente reserva desde la lista.

**2026-10-20, en local, escanear en C18** (rama `escanear-codigos-catalogo`, build servido con
`vite preview` contra la API del Compose): `presentaciones.mjs` 10 de 10, sin errores de página.
La primera corrida falló al entrar el Donador: la demo local se sembró con la contraseña por
defecto y el `.env` trae otra `DEMO_CONTRASENA`. Se repitió sin esa variable.

**2026-10-20, en local, fase de presentaciones** (rama `presentaciones`, API reconstruida con
`servicios:todo`): `presentaciones.mjs` 9 de 9, sin errores de página. Antes fallaron tres
corridas: una por el límite de 5 inicios de sesión por minuto, otra porque C18 agrupa los
códigos por presentación y hay que abrir la del recorrido antes de ver la ficha, y otra por el
selector de la casilla «Todos». Se repitió tras los arreglos de la revisión final (recepción sin
corrección, validar sin pisar, tope por línea), con la API reconstruida y la demo sembrada dos
veces: 9 de 9 a la primera, sin errores de página.

**2026-10-19, en local, con la entrada única** (rama `entrada-unica`, API reconstruida con
`servicios:todo`, `CAPTURAS=no`): `donador.mjs` 8 de 8, `validacion-general.mjs` 60 de 60,
`consola-comprobantes.mjs` 10 de 10, `consola-motor.mjs` 9 de 9, `consola-remisiones.mjs` 7 de
7, `consola-recepciones.mjs` 7 de 7, `sin-conexion.mjs` 12 de 12, `portal-causas.mjs` 4 de 4,
`consola-causas.mjs` 6 de 6, `portal-turnos.mjs` 6 de 6, `consola-turnos.mjs` 7 de 7 y
`referenciados.mjs` 6 de 6. Todos entran por `/entrar` con «Correo o nombre de usuario»; el
Donador, con su correo. La primera corrida de `validacion-general.mjs` dio 56 de 60 porque el
recorrido buscaba la etiqueta nueva también en el formulario de invitar, que sigue diciendo
«Nombre de usuario».

**2026-10-19, en local, capturas del Avance 5** (`CAPTURAS=no`, `CAPTURAS_WORD` activo, web
reconstruida): `portal-causas.mjs` 4 de 4, `referenciados.mjs` 6 de 6, `consola-causas.mjs` 6
de 6 y `consola-recepciones.mjs` 7 de 7. Hubo tres fallas antes:

- `consola-causas.mjs` no entró con la contraseña del servidor en `ADMIN_CONTRASENA`; sin
  ella, entró.
- `consola-recepciones.mjs` no encontraba el pin de la zona. Desde #144 el texto de la píldora
  («3 faltantes») tapaba el `title` del marcador como nombre accesible, y lo mismo pasaba con
  el nombre de los acopios. La píldora va ahora con `aria-hidden`, y `marcador.test.ts` lo
  prueba.
- `consola-causas.mjs` abría la ficha antes de que la API terminara de quitar la verificación,
  y la ficha mostraba la entidad todavía verificada. Ahora espera a que se cierre la hoja de
  confirmación.

**2026-10-19, contra el servidor de pruebas, antes de la sustentación** (`CAPTURAS=no`):
`referenciados.mjs` 6 de 6, `portal-causas.mjs` 4 de 4 y `portal-turnos.mjs` 6 de 6, sin
errores de página. `portal-turnos.mjs` cancela la reserva que crea, así que la demo no se gasta.

**2026-10-19, plataformas en Causas y mapa por tipo** (después de #143): en local con la API
reconstruida, `referenciados.mjs` 6 de 6, `portal-causas.mjs` 4 de 4 y `validacion-general.mjs`
60 de 60. Contra el servidor de pruebas, `referenciados.mjs` 6 de 6.

**2026-10-19, contra el servidor de pruebas** (después de #140 y #141, `CAPTURAS=no`):
`referenciados.mjs` 6 de 6.

**2026-10-19, en local, con la pieza E** (rama `pieza-e`, API reconstruida con
`servicios:todo`, `CAPTURAS=no` salvo en `referenciados.mjs`):

| Script | Resultado |
|---|---|
| `referenciados.mjs` | 6 de 6 |
| `validacion-general.mjs` | 60 de 60. La primera corrida dio 58 de 59: esperaba «Próximamente» en `/causas`, que existe desde la pieza C. Ahora espera «Causas» y suma `/plataformas` |
| `donador.mjs` | 8 de 8 |
| `consola-comprobantes.mjs` | 10 de 10 |
| `consola-motor.mjs` | 9 de 9 |
| `consola-remisiones.mjs` | 7 de 7 |
| `consola-recepciones.mjs` | 7 de 7 |
| `sin-conexion.mjs` | 12 de 12 |
| `portal-causas.mjs` | 4 de 4 |
| `consola-causas.mjs` | 6 de 6 |
| `portal-turnos.mjs` | 6 de 6 |
| `consola-turnos.mjs` | 7 de 7. La primera corrida falló al entrar, por el límite de inicios de sesión |

**2026-10-18, en local, con el balance de la portada y las imágenes de la demo** (rama
`portada-y-capturas`, API reconstruida con `servicios:todo`, `CAPTURAS_WORD` activo):

| Script | Resultado |
|---|---|
| `portal-causas.mjs` | 4 de 4 |
| `consola-causas.mjs` | 6 de 6 |
| `consola-motor.mjs` | 9 de 9 |
| `consola-remisiones.mjs` | 7 de 7 |
| `consola-recepciones.mjs` | 7 de 7. La primera corrida falló al entrar por el límite de inicios de sesión; pasó al esperar un minuto |
| `portal-turnos.mjs` | 6 de 6 |
| `consola-turnos.mjs` | 7 de 7, con la misma espera |

**2026-10-18, cierre del Bloque 5** (rama `bloque-5-cierre`). Contra el servidor, con `main`
desplegado y las contraseñas que dio Joseph:

| Script | Resultado |
|---|---|
| `portal-turnos.mjs` | 6 de 6 |
| `consola-causas.mjs` | 6 de 6. Dejó una «Fundación Recorrido …» en el servidor, como se esperaba |
| `portal-causas.mjs` | 4 de 4 |
| `consola-turnos.mjs` | La primera corrida dio 5 de 6: «cierra las reservas y las reabre» falló con `fetch failed`, una petición que no llegó al servidor. Al fallar, el script salía sin limpiar y dejó «Armar mercados (demo)» cerrada, con un ajuste de más y dos jornadas del recorrido; se restauró a mano. La segunda dio 7 de 7. Desde esta rama el script limpia la demo aunque falle un paso; se probó forzando un fallo en ese mismo paso |

En local, con la API reconstruida con `servicios:todo`: `portal-turnos.mjs` 6 de 6,
`consola-turnos.mjs` 7 de 7, `portal-causas.mjs` 4 de 4 y `consola-causas.mjs` 6 de 6. Para el
último, `ADMIN_CONTRASENA` es la del `.env.example`, porque la base local se sembró con esa y el
`.env` tiene la del servidor.

**2026-10-18, en local, arreglos de la revisión final** (rama `bloque-5-revision`):

| Script | Resultado |
|---|---|
| `portal-turnos.mjs` | 6 de 6 |
| `consola-turnos.mjs` | 7 de 7, con el paso nuevo de mover una jornada. Ese paso habría fallado antes del arreglo: el formulario mandaba solo la hora que cambió y la API respondía 400 |

**2026-10-18, en local, Bloque 5** (rama `bloque-5-interfaz`, API reconstruida con
`servicios:todo`):

| Script | Resultado |
|---|---|
| `portal-turnos.mjs` | 6 de 6. La primera corrida falló porque `getByLabel('Nombre')` también encontraba la casilla del consentimiento, que dice «mi nombre»; ahora busca la etiqueta exacta |
| `consola-turnos.mjs` | 6 de 6. Las corridas anteriores encontraron que borrar una jornada mostraba «Algo falló» aunque la API borraba: `desenvolver` tomaba el 204 sin cuerpo como error. Se corrigió en `api/cliente.ts`, y el arreglo alcanza a quitar un umbral y quitar «no recibir», que también responden 204 |
| `portal-turnos.mjs` contra el servidor, después de desplegar #123 | 6 de 6, con las jornadas «(demo)» que el servidor sembró al arrancar |

**2026-10-17, en local, pieza C** (rama `pieza-c-especificacion`, API reconstruida con
`servicios:todo`):

| Script | Resultado |
|---|---|
| `portal-causas.mjs` | 4 de 4 |
| `portal-causas.mjs` contra el servidor, tras desplegar #117 | 4 de 4, con las causas «(demo)» que el servidor sembró al arrancar |
| `consola-causas.mjs` | 6 de 6. La primera corrida encontró que el formulario de C22 medía 420 px: el `fieldset` de los pasos tiene `min-width: min-content` por defecto; se corrigió con `min-w-0` |

**2026-10-17, en local**, con los arreglos de la rama `recorridos-robustos`:

| Script | Resultado |
|---|---|
| `consola-remisiones.mjs` | 7 de 7 en tres corridas |
| `donador.mjs` | 8 de 8; con `SIN_CORREO=1`, 7 de 7 |
| `consola-recepciones.mjs` | 7 de 7, ya con «Mi zona» (rama `mi-zona`) |

**2026-10-17, contra el servidor de pruebas, después de desplegar #108 y #109** (con
`SIN_CORREO=1`):

| Script | Resultado |
|---|---|
| `consola-recepciones.mjs` | 7 de 7, entrando por «Más» → «Mi zona» |
| `donador.mjs` | 7 de 7, la primera vez allá (entra como `donador1`) |
| `consola-remisiones.mjs` | 7 de 7 |

**2026-10-17, contra el servidor de pruebas** (`https://acopio.josephqaz.dev`, con
`SIN_CORREO=1`), después de desplegar #99 y #100:

| Script | Resultado |
|---|---|
| `validacion-general.mjs` | 56 de 56 (omite los 3 pasos de la invitación), sin 5xx ni errores de página |
| `consola-comprobantes.mjs` | 9 de 9 (omite el correo del rechazo) |
| `consola-motor.mjs` | 9 de 9 |
| `consola-remisiones.mjs` | 7 de 7 |
| `consola-recepciones.mjs` | 6 de 6 |
| `sin-conexion.mjs` | 12 de 12 |
| `scripts/pruebas-manuales.sh` | 11 de 11 con el código esperado |
| `donador.mjs` | No corría allá (ver el bloque de arriba) |

`consola-remisiones.mjs` pasó en el servidor, donde la demo está recién sembrada. En local
fallaba por el campo que tomaba el script, no por los datos (ver «Cómo se corren»). El primer
intento de `consola-recepciones.mjs` dejó en camino `R-2026-RF4J7`, con 1 L de agua y una
foto, que sirve para practicar la recepción en la ronda del equipo.

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
  `DEMO_CONTRASENA`, en local `demo-acopio-2026`), Acopio Chapinero (`d0000000-0000-4000-8000-000000000011`) y el folio
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
