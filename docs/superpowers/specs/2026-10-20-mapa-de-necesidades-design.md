---
title: "Mapa de necesidades · diseño"
type: especificacion
tags: [red, inventario, turnos, portal, diseno]
estado: vigente
actualizado: 2026-10-20
---

# Mapa de necesidades

## Por qué

Hoy el mapa público (P5) dibuja los acopios con su nombre y, aparte, el círculo de cada zona
con necesidad que reporta el Receptor (HU-13.1). Quien mira el mapa no sabe a qué acopio le
falta algo ni a cuál le sobra: para eso tiene que abrir la ficha de cada uno. Joseph lo dijo así
el 2026-10-20: «no sirve de nada tener un aviso de falta algo, porque el mapa solo marca las
zonas».

La idea original, la de las pantallas de Stitch «Mapa de Acopios y Necesidades» y
«Voluntariado - Mapa de Jornadas y Reserva de Cupos», es que cada punto lleve encima una
etiqueta con su estado: dónde falta un producto concreto y dónde ya hay mucho. En voluntariado,
dónde falta gente y dónde quedan cupos.

La maqueta [maqueta-necesidades.html](../../03-diseno/stitch/P05-mapa/maqueta-necesidades.html)
(<https://claude.ai/artifact/EekofY8Z5Ky2VprW6FXLe4>) la aprobó Joseph el 2026-10-20, con los
tres teléfonos y las reglas de sus notas.

## Objetivos

- Cada acopio operado lleva encima de su punto una etiqueta con su estado de inventario:
  «FALTA», «DE SOBRA», «AL DÍA» o «NO RECIBE», con la categoría.
- Chips de estado sobre el mapa para ver solo los acopios a los que les falta algo, los que
  tienen algo de sobra o los que no reciben algo, con cuántos hay de cada uno.
- Al elegir una categoría en «¿Qué vas a llevar?», las etiquetas hablan solo de esa categoría
  («FALTA ARROZ», «ARROZ AL DÍA», «ARROZ DE SOBRA») y una frase arriba resume cuántos acopios
  hay en cada estado.
- La tarjeta del acopio elegido dice «Qué falta hoy» y «Ya tienen de sobra».
- Voluntariado (P7) gana una vista de mapa junto a la lista, con «FALTAN N PERSONAS»,
  «QUEDAN N CUPOS» o «LLENA» encima de cada lugar.

## No objetivos

- No se publican cantidades. Ni la etiqueta ni la tarjeta dicen cuánto tiene un acopio, igual
  que «Lo que urge» de la ficha (RF-RED-003).
- No cambian los umbrales, el semáforo de la consola ni la forma de marcar «no recibir».
- No se toca la capa de zonas con necesidad. El círculo, su píldora «N faltantes» y su tarjeta
  quedan como están.
- No hay estado «Poco». Stitch tiene uno naranja entre la falta y el óptimo; Joseph aprobó la
  maqueta sin él. El semáforo `CERCA` de `@acopio/shared` cuenta como «al día» en el mapa.
- No hay etiquetas por presentación («Agua 5 L»). Los umbrales son por categoría, así que las
  etiquetas también.

## Lo que sería un fracaso

Aunque funcione, sale mal si:

- El mapa deja ver cuánto tiene un acopio, aunque sea de forma indirecta.
- Las etiquetas distinguen los estados solo por el color. Cada estado lleva su ícono y su texto
  (RNF-11), como ya hacen las píldoras.
- Un punto de RedAcopio aparece con una etiqueta de inventario que Acopio no tiene.

## Reglas de las etiquetas de acopios

El estado sale del saldo de cada categoría con umbral, comparado con el mínimo y el máximo del
acopio, con `semaforo` de `@acopio/shared`:

| Estado del mapa | De dónde sale |
|---|---|
| Falta | `semaforo` da `BAJO` |
| De sobra | `semaforo` da `SOBRE` |
| Al día | `EN_RANGO` o `CERCA` |
| No recibe | la categoría tiene una marca de «no recibir» vigente |

Una categoría sin umbral no cuenta para falta, de sobra ni al día. Si tiene marca de «no
recibir», cuenta para «no recibe».

**Sin categoría elegida**, la etiqueta muestra lo más urgente del acopio, en este orden: falta,
no recibe, de sobra, al día. Con varias categorías en el mismo estado, nombra la primera en
orden alfabético y suma «+N» por las demás («FALTA: Agua potable +2»). «AL DÍA» va sola, sin
categoría: quiere decir que todas las categorías con umbral están en rango. Un acopio sin
ninguna categoría con umbral ni marca no lleva etiqueta.

**Con una categoría elegida**, la etiqueta dice el estado de esa categoría en ese acopio. Si la
categoría no tiene umbral ahí y tampoco marca, el acopio no lleva etiqueta. Si el acopio no la
recibe, su píldora se ve apagada y sin etiqueta, y un aviso dice cuántos acopios no la reciben.
Hoy esos acopios se ocultan; la maqueta aprobada los deja apagados para que se vea dónde están.
Esto cambia el criterio de RF-RED-002 y se anota en él.

**Acopios pausados** no llevan etiqueta: no reciben nada mientras están pausados. Los chips no
los cuentan.

**Puntos de RedAcopio** no llevan etiqueta ni entran en los chips. Su fuente trae `necesidades`
en texto libre, que ya se muestra en su tarjeta.

## El punto del acopio

Como en la maqueta: el punto de un acopio operado deja de ser la píldora verde con el nombre y
pasa a ser un círculo con el ícono `warehouse`, del color del estado que muestra su etiqueta.
Rojo (`secondary-container`) si falta, ámbar oscuro (`tertiary-container`) si sobra, gris
(`on-surface-variant`) si no recibe y verde (`primary-container`) si está al día o no tiene
etiqueta. El elegido es más grande y con anillo. Un pausado queda con su píldora gris y `pause`,
y los puntos de RedAcopio con la suya blanca y `link`. El nombre sigue en el `title` del
marcador, que lee el lector de pantalla, y en la tarjeta. Joseph eligió los colores de la
maqueta el 2026-10-20; esto deja atrás el nombre en el pin que aprobó el 2026-10-19 para los
acopios operados.

La etiqueta va en el color del estado: rojo con texto blanco para falta, ámbar oscuro con texto
blanco para de sobra, verde claro (`primary-fixed`) con texto verde oscuro para al día y gris
claro con texto gris oscuro para no recibe.

## Chips de estado

Debajo de «¿Qué vas a llevar?»: «Todos N», «Falta N», «De sobra N» y «No recibe N». «Todos»
cuenta los acopios operados y activos que quedan con los demás filtros («abierto ahora»,
«cerca»); los números de la maqueta son ilustrativos. Cada chip cuenta los acopios que tienen
al menos una categoría en ese estado, así que un acopio con falta y con sobra entra en los dos y
los números no tienen por qué sumar «Todos». Uno elegido deja en el mapa y en la lista solo esos
acopios, y su etiqueta pasa a hablar del estado del chip («DE SOBRA: Ropa» aunque también le
falte algo). Los de RedAcopio se ocultan mientras haya un chip distinto de «Todos». Un chip con 0 no se
muestra. Con una categoría elegida, los chips cuentan el estado de esa categoría y «No recibe»
desaparece (esos acopios ya se ven apagados). El chip elegido va en la URL, como los demás
filtros del mapa (`estado=falta|sobra|norecibe`).

## Frase con categoría elegida

Encima del mapa: «Arroz: falta en 2 acopios, está al día en 2 y sobra en 1.» Va sin artículo,
porque «el» o «la» dependen de la categoría («la ropa usada»). Se omite cada
parte con 0. Si todas son 0: «Ningún acopio tiene umbral para arroz.»

## Tarjeta del acopio elegido

Debajo del nombre y la dirección, dos bloques: «Qué falta hoy», con las categorías en falta, y
«Ya tienen de sobra», con las de sobra y la línea «Mejor llévalo a otro acopio». «No traigan»
sigue como está. Un bloque vacío no se muestra. Con una categoría elegida, el primer bloque se
titula «Falta arroz» (o el estado que tenga) y debajo «También les falta: …» con las demás.

## Lista

En la vista de lista, cada acopio lleva la misma etiqueta que en el mapa, al lado del nombre.
Con una categoría elegida, los acopios que no la reciben salen al final de la lista, apagados y
con «No recibe arroz», igual que en el mapa.

## API

Un endpoint público nuevo en `inventario`, junto a `/publico/balance`:
`GET /publico/necesidades`. Devuelve, por cada acopio activo con umbrales o marcas:

```ts
{
  acopioId: string;
  faltan: { categoriaId: string; categoria: string }[];
  sobran: { categoriaId: string; categoria: string }[];
  alDia: { categoriaId: string; categoria: string }[];
  noRecibe: { categoriaId: string; categoria: string }[];
}[]
```

Solo nombres de categoría, sin cantidades. La web lo cruza con `GET /acopios` por `acopioId`.
Va en `inventario` y no dentro de `AcopioPublicoDto` para que `acopios` no dependa de
`inventario`. `BalanceService` ya junta umbrales, saldos y marcas de los acopios abiertos, así
que el cálculo sale de ahí con los DAO que ya existen.

## Voluntariado en mapa

P7 (`/voluntariado`) gana las pestañas «Mapa» y «Lista», como P5. Abre en el mapa, igual que
P5, y la lista queda en `?vista=lista`. Los filtros que ya tiene (lugar, día, perfil) aplican a
las dos.

- Un punto por lugar (`lugar.id`) con coordenadas. Las jornadas cuyo lugar no tiene `lat` y
  `lng` solo salen en la lista, y un aviso bajo el mapa dice cuántas son.
- Solo entran las jornadas que aceptan reservas o están llenas (`motivoSinReserva` `LLENA`).
  Las canceladas, cerradas o fuera de plazo no salen en el mapa.
- Etiqueta de cada jornada:
  - «LLENA» si `libres` es 0.
  - «FALTAN N PERSONAS» si menos de la mitad del cupo está ocupado (`ocupados + ajuste <
    cupoMaximo / 2`), con N = `libres`.
  - «QUEDAN N CUPOS» en los demás casos, con N = `libres`.
- Si un lugar tiene varias jornadas, el punto muestra la más urgente (faltan, quedan, llena) y
  «+N jornadas». Al tocarlo, la tarjeta lista las jornadas de ese lugar con su etiqueta y su
  botón «Reservar cupo».
- Chips: «Todas N», «Falta gente N», «Con cupos N». Cuentan jornadas, no lugares, y son
  excluyentes según la etiqueta: «Falta gente» son las de «FALTAN N PERSONAS» y «Con cupos» las
  de «QUEDAN N CUPOS». Aplican al mapa y a la lista; con un chip elegido, la lista deja fuera
  las cerradas, canceladas y fuera de plazo, y la tarjeta de un lugar muestra solo sus jornadas
  que coinciden. El chip va en la URL (`estado=faltan|cupos`).

La API no cambia: `GET /turnos/jornadas` ya trae `lugar` con coordenadas, cupos, ocupados,
ajuste y libres.

## Lo que decidió Joseph

- Que la etiqueta salga del inventario del acopio comparado con sus umbrales, y que el círculo
  de la zona siga aparte (2026-10-20).
- La maqueta con los tres teléfonos y sus notas, voluntariado incluido (2026-10-20).
- Los colores del punto como en la maqueta (2026-10-20). Leí «colores como en la maqueta» como
  el punto completo de la maqueta, un círculo sin nombre; si quería la píldora con nombre en el
  color del estado, se cambia en el plan.
- Que voluntariado abra en el mapa, como el mapa de acopios (2026-10-20).

## Lo que decidí yo al cerrar el diseño

Salieron de la revisión del documento y Joseph puede cambiarlas:

- Los chips de P5 se solapan y, con uno elegido, la etiqueta habla de ese estado.
- «AL DÍA» va sin categoría ni «+N».
- La frase de la categoría va sin artículo («Arroz: falta en…»).
- En la lista, los acopios que no reciben la categoría elegida salen al final y apagados.
- Los chips de voluntariado cuentan jornadas, son excluyentes y filtran mapa y lista.

## Lo que queda al constructor

- Los íconos de cada estado. La maqueta usa `priority_high`, `inventory_2`, `check` y `block`;
  se pueden cambiar mientras cada estado tenga uno distinto. Los nuevos se agregan con
  `node scripts/iconos.mjs`.
- Cómo se apila la etiqueta sobre el círculo en `htmlMarcador` y el ancla del marcador.
- Los grupos (círculos con número) quedan como están.

## Documentos que cambian

- [RF-RED-002](../../01-requerimientos/funcionales/red.md): etiquetas, chips y acopios apagados
  en vez de ocultos.
- [Nota de P5](../../03-diseno/stitch/P05-mapa/README.md) y
  [nota de P7](../../03-diseno/stitch/P07-voluntariado/README.md): la maqueta aprobada y las
  diferencias con Stitch.
- El contrato OpenAPI y los tipos de la web, por el endpoint nuevo.
- Los recorridos que pasan por P5 y P7 (`docs/06-operacion/recorridos.md`).

## Cambios al construir

- Una categoría con umbral y con marca vigente de «no recibir» sale solo en `noRecibe`. La API la
  saca de `faltan`, `sobran` y `alDia`, para que el mapa nunca diga «FALTA» de algo que el acopio
  no recibe. Lo encontró la revisión final.
- La API devuelve también los acopios pausados (filtra los cerrados, como `/publico/balance`). La
  web los deja sin etiqueta y fuera de los chips.
- La etiqueta del punto se acorta a 24 caracteres con «…» antes del «+N»
  («FALTA: Alimento para… +2»); el texto completo queda en el `title` del marcador.
- En voluntariado, un lugar con varias jornadas suma «+N» a la etiqueta, sin la palabra
  «jornadas», y el texto tiene singular: «FALTA 1 PERSONA», «QUEDA 1 CUPO».
- Los puntos de voluntariado usan los colores de los estados del mapa de acopios: rojo para
  «faltan», verde para «quedan cupos» y gris para «llena».
- En la lista de P5, la etiqueta va en la línea de debajo del nombre y no al lado.
- La leyenda bajo el mapa lleva una fila por estado, con la píldora en tamaño pequeño y una frase
  corta. La fila del círculo verde dice «Acopio sin etiqueta: no publica su inventario». Lo pidió
  Joseph el 2026-10-20 al ver las píldoras grandes.
- Voluntariado abre en el mapa, con la lista en `?vista=lista` y «Mapa» primero en el selector,
  como en P5. Lo pidió Joseph el 2026-10-20.
- Si la URL trae un chip (`?estado=`), el chip se ve aunque no quede ningún acopio con los demás
  filtros, para poder quitarlo.
- Quedan para después, en [P-086](../../01-requerimientos/pendientes.md) y
  [P-087](../../01-requerimientos/pendientes.md): el tamaño de los íconos de Material Symbols, la
  clase `text-label-sm` que no existe en los tokens y los menores de las revisiones.
