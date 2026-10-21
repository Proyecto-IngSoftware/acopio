---
title: "Línea visual: fechas, botones, estados y movimiento · diseño"
type: especificacion
tags: [web, diseno, portal, consola, ux]
estado: vigente
actualizado: 2026-10-21
---

# Línea visual: fechas, botones, estados y movimiento

## Por qué

Joseph siente la web pesada y vacía desde la primera pantalla: un fondo claro, texto, cajas grises cuando no hay datos y ningún movimiento. En la Portada, las jornadas de voluntariado usan la tarjeta grande de P7 y no muestran la fecha, aunque el diseño original de Stitch ya proponía filas compactas con un cuadro de día.

Se probaron variantes en Stitch con fotos y ninguna convenció. Después se armó un lienzo con cuatro ideas: la franja con datos vivos, las jornadas con la fecha primero, los estados vacíos ilustrados y el movimiento al tocar. Joseph las aprobó todas el 2026-10-21 y pidió llevarlas a toda la web, portal y consola, con paridad en fechas, botones y secciones desactivadas.

Lienzo aprobado: <https://claude.ai/artifact/6E2tVtacyqTcuifM1VNFyR>. Hace las veces de maqueta para las piezas de este documento.

## Metas

- Que todas las pantallas compartan las mismas piezas para fechas, botones, estados desactivados, estados vacíos y movimiento.
- Que la Portada abra con la necesidad real en lugar de un texto fijo.
- Que cada acción de la persona tenga una respuesta visible: tocar, abrir, cambiar de página, confirmar.
- Que una pantalla sin datos invite a hacer algo y no se vea rota.

## No metas

- Cambiar la estructura de las pantallas, el orden de sus bloques o sus textos, salvo lo que se nombra aquí.
- Cambiar la paleta. Los colores siguen saliendo de `packages/ui-tokens`.
- Quitar transparencias. El velo de las hojas, la barra inferior translúcida con desenfoque y los fondos con opacidad quedan como están. Lo nuevo los complementa con rellenos sólidos.
- Agregar fotos. La imagen de la web son ilustraciones propias.
- Agregar librerías de animación. Todo se hace con CSS y Tailwind.

## Lo que haría fallar esto aunque funcione

- Animaciones que se repiten solas por toda la pantalla. Distraen en una operación de emergencia y gastan batería (sistema de diseño §1).
- Movimiento que ignora «reducir movimiento» o que deja la pantalla en un estado intermedio cuando se apaga.
- Un bloque de fecha que muestra un día distinto al de Colombia por la zona del navegador.
- Un estado desactivado que solo se distingue por el color.
- Pruebas que pasan porque se volvieron más laxas con los tiempos de animación.

## Restricciones

- En `apps/web` no se escriben colores hexadecimales (`scripts/revisar-colores.sh`). Las ilustraciones SVG pintan con clases de tokens (`fill-primary-fixed`, `stroke-surface-tint`) o con `var(--…)`. Los hexadecimales del lienzo se traducen a sus tokens:

  | Lienzo | Token |
  |---|---|
  | `#003730` | `primary` |
  | `#085046` | `primary-container` |
  | `#b0efe1` | `primary-fixed` |
  | `#95d2c5` | `primary-fixed-dim` |
  | `#00201b` | `on-primary-fixed` |
  | `#2a685d` | `surface-tint` |
  | `#ffdcc3` | `tertiary-fixed` |
  | `#6e3900` | `tertiary-container` |
  | `#f5f5f4` | `surface-container` |
  | `#e7e5e4` | `surface-container-high` |
  | `#d6d3d1` | `outline-variant` |
  | `#3f4946` | `on-surface-variant` |
  | `#707976` | `outline` |
  | `#ffdad3` | `secondary-fixed` |
  | `#8f1100` | `on-secondary-fixed-variant` |
  | `#b51d04` | `secondary` |

- Contraste: AA como piso y AAA en datos operativos (sistema de diseño §9). El ámbar de «quedan pocos cupos» usa `tertiary-container` sobre blanco.
- Área táctil de 48 px salvo los botones compactos de fila, que miden 40 px de alto dentro de una fila de al menos 72 px que también es tocable.
- Íconos nuevos de Material Symbols: correr `node scripts/iconos.mjs` en `apps/web`.
- La regla global de `estilos.css` apaga animaciones y transiciones con `prefers-reduced-motion`. Por eso el estilo base de cada elemento animado es su estado final, y los `@keyframes` solo describen el punto de partida.
- Las fechas se calculan en hora de Bogotá con los ayudantes de `formato.ts`.
- La API no cambia. Lo que necesita la Portada se arma con `/api/publico/balance` y `/api/publico/necesidades` (ver «Franja de la Portada»). Si al construir falta un dato, se anota en «Cambios al construir» antes de tocar la API.

## Piezas comunes

### Bloque de fecha

Un recuadro con fondo sólido `primary-fixed` y texto `on-primary-fixed`: arriba el día de la semana abreviado en minúscula («jue») y abajo el número del día en grande. El lector de pantalla lee la fecha completa con `diaSemana` («Jueves 22 de octubre»).

- Tamaño de fila: 52 × 56 px. Tamaño de detalle: 64 × 68 px, junto al título.
- Si la fecha no cae en los próximos siete días, la línea de arriba muestra el mes («nov») en lugar del día de la semana. *Decisión de diseño de Claude.*
- Si el evento no admite acción (llena, cerrada, cancelada, pasada), el fondo pasa a `surface-container` y el texto a `on-surface-variant`.
- Ayudante nuevo en `formato.ts`: `partesFecha(fecha)` devuelve `{ semana, dia, mes }` en hora de Bogotá, con su prueba.

**Dónde va:** solo en fechas de agenda, es decir, un día al que alguien tiene que ir o en el que tiene que actuar. Jornadas (P1, P7, reservar, P8 y C14 en lista y detalle).

**Dónde no va:** fechas de registro («recibida el 7 de octubre», bitácora, historial, conciliación, «verificada el…»), que siguen en texto. Tampoco en la antigüedad de un dato («hace 12 min»), que sigue igual, ni en el horario semanal de un acopio.

### Tira de días

Una fila deslizable de botones de día: «Todos», «Hoy 21», «jue 22»… Cada botón lleva un punto debajo si ese día tiene jornadas, y el elegido tiene fondo sólido `primary-container`. Al elegir un día, la lista se filtra con una entrada escalonada.

**Dónde va:** P7, donde reemplaza el filtro desplegable «Día» y los encabezados de grupo por día. «Lugar» y «Perfil» se quedan. Joseph lo confirmó el 2026-10-21. En la Portada, el bloque de jornadas muestra las tres próximas sin tira, como en el lienzo.

### Fila de jornada

Reemplaza a `TarjetaJornada` en P1 y P7. Lleva el bloque de fecha y, en una columna, la actividad, el lugar (con `verified` relleno si lo organiza una entidad y `warehouse` si es un acopio) y el horario. Debajo van una barrita de cupos con su texto y, a la derecha, el botón compacto «Reservar». Toda la fila abre la jornada.

- Cupos: «Quedan 4 de 12», «Queda 1 cupo» o «Sin cupos». Con dos libres o menos, la barra y el texto pasan a `tertiary-container`. La regla de `textoCupos` (reservas y no personas, RF-TUR-006) se conserva en el detalle.
- Perfil requerido: la etiqueta de perfil de hoy queda en la fila, sobre el título.
- Desactivada: ver «Estado desactivado».

En C14 la tarjeta de turno toma el mismo bloque de fecha en lugar de la línea con ícono de calendario, y conserva su chevron y su etiqueta de estado.

### Botones

`Boton` y `EnlaceBoton` conservan sus tres variantes y suman:

- Al tocar, se hunden (`scale` a .97, 150 ms). El primario oscurece al `primary`, como hoy.
- Inhabilitado: relleno sólido `surface-container-high` con texto `on-surface-variant`, en lugar de `opacity-60`. El cursor no cambia.
- Ocupado: una prop `ocupado` muestra el ícono `progress_activity` girando junto al texto e inhabilita el botón. Reemplaza los `disabled={x.isPending}` sueltos.
- Si el texto termina en `chevron_right`, el chevron avanza 3 px al pasar el cursor.
- Botón compacto (variante de tamaño `compacto`): 40 px de alto, para filas.

Los botones escritos a mano fuera de `Boton` pasan a usarlo cuando hacen lo mismo. Por ejemplo, el rechazo de `HojaRechazo`, el «Reservar cupo» dibujado como `span` en `TarjetaJornada` y las pestañas de `BalanceRecepcion`. El constructor busca los demás con `grep` sobre `<button` y `min-h-[48px]`. `Pildora` y `Segmentado` siguen siendo piezas aparte, con la píldora deslizante.

### Estado desactivado

Para lo que existe pero no se puede usar ahora: jornada llena, cerrada o cancelada, día sin jornadas en el calendario de turnos, categoría archivada, emergencia cerrada.

- Conserva la opacidad atenuada que ya tiene (`opacity-70` u `opacity-80`).
- Sus piezas de color pasan a gris sólido: el bloque de fecha a `surface-container` y la etiqueta a fondo `surface-container-high` con texto `on-surface-variant`.
- Lleva siempre una etiqueta de texto corta («Llena», «Cerrada», «Archivada», «Sin cupos»), así que el color nunca es lo único que lo indica.
- No muestra el botón de acción principal.

### Estado vacío con ilustración

`EstadoVacio` gana una prop opcional `ilustracion`. Con ella, la ilustración va a la izquierda (o arriba en una sección ancha), seguida del título y el texto de hoy. Sin ella se ve como ahora. `SeccionVacia` de la Portada usa la misma pieza.

Ilustraciones aprobadas en el lienzo, un componente cada una en `apps/web/src/componentes/ilustraciones/`, con `role="img"` y `aria-label`:

| Ilustración | Usos |
|---|---|
| Cajas ordenadas con un sello | Portada sin emergencias; inventario sin existencias; historial sin movimientos; catálogo vacío |
| Calendario con una planta | Jornadas (P1, P7), turnos (C14), mi reserva sin reservas |
| Mapa con curvas de nivel y un pin | Reporte en terreno; zonas (C09, mi zona); mapa sin resultados en la lista |
| Caja con etiqueta de folio | Rastrear folio; mis donaciones; comprobantes; conciliación; recepciones; remisiones |

Una ilustración nueva sigue el mismo trazo plano en verdes y un acento durazno (`tertiary-fixed`), y se muestra a Joseph en el lienzo antes de entrar al código. Las causas sin foto (P3 y P4), que hoy muestran un ícono suelto sobre fondo gris, usan el mapa o las cajas según la categoría. *Decisión de diseño de Claude.*

### Movimiento

Todas las curvas son `cubic-bezier(.2,.8,.2,1)` salvo que se diga otra cosa. Los valores salen del lienzo.

| Movimiento | Dónde | Detalle |
|---|---|---|
| Toque | Botones, filas enlazadas, `FilaMenu`, filas de «¿Cómo apoyar?» | Escala .97 a .985 en 150 ms |
| Entrada de página | `MarcoPortal`, en todas las rutas | Desliza 24 px y aparece en 300 ms. Hacia la izquierda al ir a una pestaña que está a la derecha en la barra, al entrar a un detalle o al avanzar un paso; hacia la derecha al volver (`useNavigationType() === 'POP'` o «Volver») |
| Hoja | `Hoja` | Sube en 380 ms con `cubic-bezier(.2,.9,.25,1)` y el velo aparece en 250 ms. Al cerrar, baja antes de desmontarse |
| Desplegable | `SelectorEmergencia`, menú de la cuenta, conmutador de ubicación | Se abre por alto (`grid-template-rows` de 0fr a 1fr) en 300 ms y el chevron gira 180° |
| Píldora deslizante | `Segmentado`, pestañas del balance, barra inferior | La píldora se mueve en 320 ms. En la barra inferior, el ícono activo se rellena con transición |
| Barras que se llenan | Cupos, balance de la Portada | Crecen desde 0 en 1 s al aparecer |
| Lista al filtrar | Tira de días, píldoras de filtro (remisiones, mis donaciones, causas, bitácora) | Cada fila entra con 60 ms de retraso; solo las seis primeras |
| Sello de confirmación | P8 al reservar, paso 3 de P9 (folio), confirmar correo, conciliar, despachar remisión, recibir remisión o folio | El círculo crece con rebote en 500 ms, el aro se dibuja y el check se traza |
| Contenido tras cargar | `Esqueleto` y lo que lo reemplaza | El esqueleto tiene un brillo que barre en lugar del pulso y el contenido aparece en 200 ms |
| Punto en vivo | Solo la franja de la Portada | Late cada 2 s. Es la única animación que se repite sola |

La franja y los vacíos no tienen movimiento continuo. En el lienzo las curvas de nivel se desplazaban despacio; en el código quedan quietas por la regla de batería del sistema de diseño §1. Joseph lo confirmó el 2026-10-21.

## Franja de la Portada

- Fondo `primary` con curvas de nivel en SVG, trazo `primary-fixed-dim` al 16 % de opacidad, quietas y sin capturar toques.
- Selector de emergencia con el desplegable animado.
- Línea con el punto en vivo y el texto «Datos de los acopios». El balance no trae fecha de actualización, así que no se escribe «hace N min». Si al construir aparece ese dato, se agrega.
- Título con la cifra: «Hoy faltan N categorías en M acopios.» N es el largo de `faltan` en el balance y M es el número de acopios de `necesidades` con al menos una categoría que falta. La cifra N cuenta desde 0 en unos 700 ms.
  - Con N igual a 0, el título dice «Hoy ningún acopio reporta faltantes.»
  - Mientras carga, se ve el título de hoy («Revisa qué hace falta antes de donar.»).
- El párrafo de abajo queda como está.
- Balance: cada fila de «Qué hace falta» lleva una barra. Su largo es los acopios de esa fila sobre el total de acopios abiertos, y el texto dice «Falta en 4 de 5». El total sale de `necesidades`, si lista todos los acopios abiertos; si no, la barra se calcula sobre el mayor valor de la lista y el texto queda «Falta en 4 acopios». El constructor lo verifica en el servicio y deja escrito cuál aplicó.
- «¿Cómo apoyar?»: cada fila lleva su ícono en un recuadro `primary-fixed` y una línea de detalle debajo del título, como en el lienzo. Los detalles se escriben fijos: «Busca el acopio más cercano», «Directo en el sitio de la entidad» y «Reserva un cupo en una jornada».

## Pantalla por pantalla

Revisión hecha sobre las capturas `construida*.png` de cada carpeta de `docs/03-diseno/stitch/` y sobre el código de `apps/web/src`. Fecha = bloque de fecha; Botones = `Boton` con toque, inhabilitado sólido y ocupado; Desact. = estado desactivado; Vacío = ilustración; Mov. = movimientos propios además de la entrada de página.

| Pantalla | Fecha | Desact. | Vacío | Mov. y notas |
|---|---|---|---|---|
| P1 Portada | Sí, filas de jornada | Jornadas llenas | Sin emergencias, jornadas, reporte, folio | Franja nueva, barras, píldora, desplegable |
| P3 Causas y atendidas | No (registro) | No | Causas sin foto | Lista al filtrar con píldoras |
| P4 Ficha de causa | No | No | Hueco sin foto | Toque en los pasos |
| P5 Mapa | No | Acopio cerrado ya tiene su estilo y no cambia | Lista sin resultados (mapa) | Píldora en `Segmentado`, hoja de zona |
| P6 Ficha de acopio y referenciado | No (horario semanal) | No | No | Toque |
| P7 Voluntariado | Sí, filas y tira de días | Llena, cerrada, cancelada | Calendario | Tira, lista al filtrar, barras |
| P7 Reservar | Sí, bloque de detalle junto al título | Aviso de reservas cerradas sin botón | No | Botón ocupado al enviar |
| P8 Mi reserva | Sí, bloque de detalle | Reserva cancelada | Calendario si no hay reserva | Sello en lugar del cuadro con check |
| Más y Más con sesión | No | No | No | Toque en `FilaMenu` |
| P9 Preparar donación | No | Botones inhabilitados sólidos | No | Sello en el paso 3 |
| P10 Seguir donación | No (registro) | Pasos pendientes ya grises | Caja con folio antes de buscar | Los checks de los pasos cumplidos se trazan al aparecer |
| P12 Privacidad, P14 Plataformas | No | No | No | Solo entrada de página |
| P13 Mi cuenta y mis donaciones | No | Donación cancelada | Caja con folio | Píldoras de filtro, lista al filtrar |
| P13 Confirmar correo | No | No | No | Sello |
| C01 Acceso y activar | No | Botón sin red sólido | No | Botón ocupado |
| C03 Inventario e historial | No (registro) | No | Cajas | «Cargar más» ocupado |
| C04 Entrada rápida, escáner, sin conexión, pendientes | No | Botones inhabilitados sólidos | Cajas en pendientes vacíos | Botón ocupado |
| Recibir por folio | No | Sin red | No | Sello al registrar |
| C05 Salida, C06 Conteo | No | Botones inhabilitados sólidos | No | Botón ocupado |
| C07 No recibir y umbrales | No | No | No | Hoja animada; los interruptores ya se animan |
| C08 Comprobantes y conciliación | No (registro) | No | Caja con folio | Sello al conciliar |
| C09 Zonas, C10 Ficha de zona, mi zona | No | Zona cerrada | Mapa | Hoja animada |
| C11 Motor | No | Botones inhabilitados sólidos | Cajas en descartes vacíos | Botón ocupado al recalcular |
| C12 Remisiones | No (registro) | Emergencia cerrada en el destino | Caja con folio | Píldoras, lista al filtrar, sello al despachar |
| C13 Recepción | No | No | Caja con folio | Sello al recibir |
| C14 Turnos | Sí, lista y detalle | Llena, cerrada; días llenos de `CalendarioFechas` | Calendario | Píldora en `Segmentado` |
| C15 Entidades, C16 Usuarios, C21 Acopios, mi acopio | No | Usuario suspendido, acopio cerrado | Cajas | Botón ocupado |
| C17 Bitácora | No (registro, encabezados de día igual) | No | Cajas | Lista al filtrar |
| C18 Catálogo y códigos | No | Categoría archivada | Cajas | Botón ocupado |
| C20 Reportar, C22 Causas | No | No | Mapa (reportar), cajas (causas) | Botón ocupado |

Todas reciben los botones nuevos, el toque y la entrada de página.

## Quién decidió qué

Decidido por Joseph:

- Las cuatro ideas del lienzo, completas.
- La paridad en toda la web, consola incluida.
- Las transparencias de hoy se mantienen.
- En P7, la tira de días reemplaza el filtro «Día» y los encabezados por día para no repetir el dato (2026-10-21).
- Las curvas de la franja quedan quietas. Por ahora, lo único que se repite solo es el punto en vivo (2026-10-21).

Decisiones de diseño de Claude, aprobadas con el documento el 2026-10-21:

- El bloque de fecha solo en fechas de agenda y no en registros.
- El mes en el bloque cuando la fecha está a más de siete días.
- Las causas sin foto usan una ilustración.
- La asignación de cada ilustración a cada vacío (tabla de arriba).

Queda al constructor:

- Cómo detectar la dirección de la entrada de página.
- Cómo se anima la salida de `Hoja` sin romper las pruebas que esperan que desaparezca.
- Qué botones a mano pasan a `Boton`.
- Cómo se cuenta el total de acopios abiertos para las barras del balance.

## Documentación que cambia

- ADR nuevo (el siguiente número libre, hoy ADR-0022). Las piezas y el movimiento de este documento salen del lienzo aprobado. Stitch sigue fijando la estructura de cada pantalla. Reemplaza la regla «cero ilustración» del sistema de diseño §8 por ilustraciones propias sin fotos de archivo. Aclara ADR-0013.
- `docs/03-diseno/sistema-diseno.md`: §5 (componentes nuevos), §6 (movimiento), §8 (imagen), con la fecha actualizada.
- `docs/03-diseno/stitch/_compartidos/README.md`: las piezas nuevas con el enlace al lienzo.
- La nota de cada pantalla que cambia a la vista: una línea en sus diferencias y su `construida.png` nuevo.
- `docs/02-arquitectura/patrones-y-practicas.md`: catálogo con `BloqueFecha`, `TiraDias`, `FilaJornada`, las ilustraciones, `partesFecha` y las clases de movimiento.
- La nota de memoria «Stitch manda en estética» se ajusta al ADR.

## Cómo se comprueba

- Pruebas de Vitest para cada pieza nueva:
  - `partesFecha` con fechas cerca de la medianoche de Bogotá.
  - El bloque con mes y sin mes.
  - La tira filtra.
  - La fila desactivada no tiene botón y sí etiqueta.
  - El botón ocupado está inhabilitado y anuncia su estado.
  - `EstadoVacio` con y sin ilustración.
  - El título de la franja con N = 0 y con N > 0.
- Las pruebas existentes que cambian de texto («Reservar cupo», encabezados de día en P7) se ajustan al texto nuevo sin aflojar lo que comprueban.
- `iconos.test.ts`, `revisar-colores.sh`, `lint`, `typecheck`, `test`, `test:int` y `depcruise`.
- Los recorridos de `apps/web/recorridos/` al cerrar cada fase.
- Capturas nuevas a 360 px de las pantallas de la tabla, con «reducir movimiento» encendido y apagado en P1 y P8.

## Cambios al construir

- Fase 1, 2026-10-21. El desplegable animado va solo en el menú de la cuenta. El conmutador de ubicación de la cabecera abre una hoja, que ya entra y sale con animación, así que no hay menú que desplegar ahí. La clase `gira` queda lista para el selector de emergencia de la Portada (fase 2).
- Fase 1, 2026-10-21. Con «reducir movimiento», `Hoja` llama a `alCerrar` de inmediato y sin guarda. Con animación, la guarda contra un doble cierre se libera al terminar la salida, para que una hoja que el padre deja montada se pueda volver a cerrar.
- Fase 1, 2026-10-21. `Boton` con `ocupado` suma el ícono que gira y conserva el texto que le pase la pantalla. El sistema de diseño pide que el texto diga qué pasa («Guardando…»), y eso lo sigue haciendo cada pantalla.
- Fase 2, 2026-10-21. `/api/publico/necesidades` no lista todos los acopios abiertos: omite los que no tienen umbrales ni marcas de «no recibir». Por eso cada barra del balance se mide contra la categoría que falta en más acopios, y el texto sigue diciendo «Falta en 4 acopios», sin «de 5».
- Fase 2, 2026-10-21. La fila de jornada sigue al lienzo: sin borde y con sombra, «Reservar» y la etiqueta de estado a la derecha, y una barra corta de 64 px junto al texto de cupos. La fila desactivada no lleva barra, porque la especificación la quiere en gris y sin acción. El título es el enlace que cubre la fila y «Reservar» es otro enlace encima, para no anidar uno dentro de otro.
- Fase 2, 2026-10-21. En la lista de P7 ya no se ve el texto «N de M cupos reservados · K sin reserva» ni cuándo se ajustó; queda en el detalle de la jornada, como pide RF-TUR-006. Las pruebas de esa regla pasaron a `Reservar.test.tsx`.
- Fase 2, 2026-10-21. La tira de días de P7 va en las dos vistas, mapa y lista, porque el filtro `dia` aplica a ambas. Muestra desde hoy hasta la última jornada, entre 7 y 30 días. Un `?dia=` que no cae en la tira sigue filtrando y no deja ningún día marcado.
- Fase 2, 2026-10-21. El sello de la confirmación de correo dice «Correo confirmado», porque la pantalla ya dice «Confirmaste el correo». El del paso 3 de P9 dice «Donación preparada» y el de P8, «Reserva confirmada».
- Fase 2, 2026-10-21. Los vacíos que la especificación nombra sin texto lo tienen ahora: la Portada sin emergencias dice «Mientras tanto, puedes conocer los acopios del mapa o las causas verificadas.» y P10 sin folio se titula «Escribe tu folio».
- Fase 2, 2026-10-21. `scripts/iconos.mjs` tomaba el `nombre` de `<Ilustracion>` como un ícono de Material Symbols y metía `cajas`, `calendario` y `mapa` en `index.html`. Ahora quita esas etiquetas antes de buscar, y `iconos.test.ts` lo comprueba.
- Fase 2, 2026-10-21. N, las categorías del título de la franja, sale de `necesidades` (categorías distintas en `faltan`) y no del largo de `faltan` del balance. El balance cuenta también una categoría baja que el acopio marcó «no recibir», y `necesidades` la pasa a `noRecibe`, así que el título podía decir «Hoy falta 1 categoría en 0 acopios.». Con las dos cifras de la misma fuente no se contradicen. La lista «Qué hace falta» del balance no cambia.
- Fase 3, 2026-10-21. En `CalendarioFechas` (C14) los días que no se pueden elegir siguen en texto tenue y no en gris sólido: «lleno» ahí quiere decir que ya se eligió el máximo de fechas, no que el día esté lleno, y pintar de gris todo el mes pesaba más que ayudaba.
- Fase 3, 2026-10-21. El sello de conciliar y el de despachar salen solo justo después de la acción. Abrir una donación ya conciliada o una remisión que ya va en camino muestra la línea de siempre, sin sello.
- Fase 3, 2026-10-21. Los botones principales escritos a mano con otro color (rechazar comprobante, cerrar emergencia, suspender) pasan a `Boton` con `enabled:` para conservar su color. Así, inhabilitados, van en gris sólido como los demás. Descartar sugerencia y cancelar remisión usan la variante secundaria con borde rojo. Los botones de ícono, las filas del menú de acciones de C14 y los interruptores de asistencia se quedan como estaban.
- Fase 3, 2026-10-21. «Suspendido» (C16) pasa del rojo al gris sólido de los desactivados, y «Cerrado» de los acopios de `surface-container` a `surface-container-high`.
- Fase 3, 2026-10-21. Además de los de la tabla, cuatro avisos sueltos pasan a `EstadoVacio` con ilustración: mi zona sin zona asignada y sin remisiones en camino, reportar sin necesidades y sin sincronizar sin entradas.
- Fase 3, 2026-10-21. En la revisión con la skill `frontend-design` se quitó la entrada escalonada que la fase 2 había puesto en las filas de «Qué hace falta». Corría al cargar la Portada, sin que nadie filtrara, y se sumaba a la entrada de página, la cifra que cuenta, las barras y el punto en vivo. Al cargar, solo crecen las barras, como dice la tabla de movimiento.
