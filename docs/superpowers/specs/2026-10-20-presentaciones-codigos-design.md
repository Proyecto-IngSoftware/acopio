---
title: "Presentaciones, códigos de barras y unidades · diseño"
type: spec
tags: [spec, catalogo, inventario, comprobantes]
estado: vigente
actualizado: 2026-10-20
---

# Presentaciones, códigos de barras y unidades

Diseño acordado con Joseph el 2026-10-20. Él vio una maqueta de cinco pantallas y aprobó la idea.
Falta el diseño en Stitch (ver «Restricciones»).

## Por qué

Joseph probó el escáner y encontró tres problemas.

1. La lista de códigos no se puede manejar. La pestaña «Códigos» del Catálogo (C18) muestra el
   número y la categoría, sin buscador, y con cientos de códigos no hay forma de validar, corregir
   o encontrar uno. El Administrador además solo puede revisar: un código entra únicamente cuando
   un Operador lo escanea en una entrada.
2. Las unidades no sirven para lo que se ve en una bodega. Una bolsa de arroz de 500 g se escribe
   «0,5» porque la categoría se mide en kg, cuando lo natural es escribir 500 g.
3. El catálogo de códigos arranca vacío. La demo trae dos códigos de prueba, así que con un
   producto real casi siempre sale «Código nuevo».

Un código de barras no describirá un producto de marca. Apuntará a una presentación genérica de
una categoría («Botella de agua 600 ml»), y muchas marcas caerán en la misma presentación, así la
lista queda corta. Joseph descartó los nombres por producto específico («Agua Cristal 600 ml»)
porque volverían caótico el catálogo.

## Objetivos

- El Administrador agrega, busca, corrige y aprueba códigos desde «Códigos».
- Cada código apunta a una presentación de su categoría, con un tamaño que nadie vuelve a
  escribir.
- Existen presentaciones al por mayor (paquete de 12, six-pack, paquete de 3) cuyo tamaño calcula
  Acopio a partir de la presentación de adentro.
- Operadores y Donadores alimentan la base escaneando, y el Operador es la fuente de verdad.
- En todo campo de cantidad se elige g o kg, ml o L, sin cambiar la unidad base de las
  categorías.
- El Operador puede hacer una carga inicial en la bodega: enseñar códigos y, si quiere, registrar
  cuántos hay.
- Hay topes de cantidad para que nadie escriba cifras absurdas.

## No objetivos

- Buscar el código en una base externa de productos (Open Food Facts u otra) para sugerir la
  categoría.
- Nombres de marca o de producto específico.
- Paquetes de paquetes, como una caja de cuatro six-packs. Un paquete contiene presentaciones
  sueltas, con un solo nivel.
- Mostrar cantidades en g o ml en saldos, historial, remisiones o reportes. Esas vistas siguen en
  la unidad base.
- Recordar la última unidad elegida en el selector.

## Lo que haría que esto fracase aunque funcione

- Que cambie la unidad base de las categorías, o que el motor, la canasta o el saldo calculen en
  gramos. Joseph pidió no tocar el motor interno.
- Que una propuesta equivocada de un Donador cuente para toda la red antes de que alguien la
  confirme.
- Que el catálogo de presentaciones se llene de duplicados por marca.

## Restricciones

- Stitch va antes del código de pantalla. La regla del proyecto es que ninguna pantalla se
  programa sin la maqueta aprobada por Joseph en Stitch, guardada en
  `docs/03-diseno/stitch/<código>-<nombre>/`. La maqueta de esta conversación validó la idea; la
  aprobación en Stitch sigue pendiente. Cambian C18 (Catálogo › Códigos), la hoja «Código nuevo»
  de `Escaner.tsx`, una hoja nueva «Nueva presentación», la recepción por folio
  (`RecibirFolio.tsx`), la entrada rápida (C4), salida, conteo, el editor de líneas de remisión y
  la donación que prepara el Donador (P9).
- La unidad base no cambia. `UnidadBase` sigue siendo `LITRO`, `KILOGRAMO` o `UNIDAD`, y todo lo
  que se guarda (movimientos, saldos, líneas, tamaño de presentaciones) va en la unidad base.
- Se respeta la arquitectura del repositorio: acceso a datos por DAO (`catalogo` y `comprobantes`
  están en `MIGRADOS_A_DAO`), bitácora en la misma transacción con datos de antes y después,
  errores con `ErrorDominio`, y `openapi` y `api:tipos` regenerados si cambia un endpoint. Los
  límites entre módulos de `docs/02-arquitectura/vista-general.md` siguen valiendo; `comprobantes`
  ya importa de `catalogo` para leer códigos.
- La entidad nueva y el estado del código son una decisión de arquitectura y piden un ADR nuevo.
  El siguiente número libre es ADR-0021.
- La petición entra por `pendientes.md` con el siguiente número, P-081.

## Lo que se decidió

### Presentaciones

Una presentación pertenece a una sola categoría y tiene un nombre genérico, sin marca («Botella de
agua 600 ml», «Bolsa de arroz 500 g», «Arroba de arroz 12,5 kg»). Hay dos clases:

- Suelta: tiene un tamaño en la unidad base de su categoría, escrito con el selector de unidades
  (500 g se guarda como 0,5 kg).
- Paquete: contiene N presentaciones sueltas de la misma categoría. Su tamaño es N por el de la
  suelta y lo calcula Acopio («Paquete x12 · botella 600 ml» = 7,2 L).

En las categorías por `UNIDAD`, una suelta vale 1 unidad y un paquete de 12 vale 12.

El tamaño sale del código (`codigo_barras.contenido` de hoy) y pasa a la presentación, y el código
solo la apunta. Todo código nuevo tiene presentación: el paso de elegirla no se salta. Los dos
códigos de la demo se pasan a presentaciones.

El tamaño de un paquete se calcula a partir de la suelta de adentro y no se guarda aparte. Si el
Administrador corrige la suelta (600 ml pasa a 500 ml), los paquetes que la contienen cambian
solos. La corrección se rechaza si deja algún paquete por encima del tope, y la bitácora nombra
los paquetes afectados. Las líneas de comprobante ya hechas no cambian, porque guardan su propio
`contenido_unitario`.

El nombre de una presentación es único dentro de su categoría, sin distinguir mayúsculas. Al
crear una suelta con el mismo tamaño que otra de la categoría, la pantalla avisa y ofrece la que
ya existe, pero deja crearla.

### Códigos de barras

Cada código apunta a una presentación, y muchos códigos (marcas) pueden apuntar a la misma. Un
código está propuesto o validado:

- Lo que asocia un Operador queda validado de una vez, porque el Operador tiene el producto en la
  mano.
- Lo que asocia el Administrador queda validado.
- Lo que asocia un Donador queda propuesto. Vale para su propia donación y no para el resto de la
  red hasta que se valide. Si el Donador creó una presentación nueva, también queda propuesta
  hasta que se valide junto con su código.

Hay dos vías de validación:

1. A mano, desde «Códigos»: aprobar, cambiar de presentación o corregir.
2. En la recepción del Operador. Cada línea de comprobante ya guarda su `ean`. Al recibir, el
   Operador ve la presentación que propuso el Donador y la confirma («Es correcto») o la corrige.
   Al terminar la recepción, los códigos de esas líneas quedan validados con lo que dejó el
   Operador.

Si en la recepción el Operador corrige una línea cuyo código ya estaba validado, la corrección
vale solo para esa línea (decisión de Joseph). La línea toma la presentación corregida, con su
categoría y su `contenido_unitario`. El código no cambia para la red: queda marcado para que el
Administrador lo revise en «Códigos». Si el código de la línea estaba propuesto, la corrección sí
lo deja validado con lo que eligió el Operador.

Si un Operador escanea en la entrada rápida un código que un Donador dejó propuesto, ve la
propuesta y la confirma o la corrige, y el código queda validado. Es la misma regla de la
recepción: el Operador, con el producto en la mano, decide.

El Administrador puede editar cualquier código o presentación desde «Códigos», como hoy.

Se aceptan códigos de 8, 12, 13 o 14 dígitos, como hoy; los paquetes suelen traer uno de 14. El
Operador y el Administrador pueden escanear o escribir el número. El Donador solo escanea y no ve
la opción de escribirlo.

El estado «sin revisar» de hoy deja de aplicar a lo que asocia un Operador. «Códigos» muestra
primero los propuestos y los marcados para revisar, que son los que esperan a alguien.

Asociar un código o crear una presentación necesita red, como hoy aprender un código nuevo
(O-08). Sin conexión, la entrada rápida sigue reconociendo los códigos que el teléfono ya vio, y
el botón «Solo guardar el código» no aparece.

### Pestaña «Códigos» del Catálogo (C18)

- Buscador por número, por categoría y por presentación.
- Filtro «Propuestos (N)» y «Todos».
- Presentaciones agrupadas por categoría, con cuántos códigos tiene cada una y cuántos están
  propuestos.
- Al abrir una presentación se ven sus códigos, quién los asoció y su estado, y desde ahí se
  aprueban, se cambian de presentación o se borran.
- Botón «Agregar código», escaneando o escribiendo el número, con el mismo flujo de «Código
  nuevo».

### Asociar un código nuevo

El flujo es el mismo para Operador, Administrador y Donador:

1. Escanear el número, o escribirlo si no es Donador.
2. Elegir la categoría.
3. Elegir una presentación de esa categoría o crear una nueva: «Suelta» con tamaño y unidad, o
   «Paquete» con la presentación de adentro y cuántas trae.
4. Tocar «Asociar y seguir».

### Unidades

Donde hoy un campo de cantidad lleva la unidad base fija al lado, esa etiqueta pasa a ser un
selector: kg o g en las categorías en kg, L o ml en las categorías en L, y nada en las categorías
por unidades. El selector arranca en la unidad base.

La web convierte a la unidad base antes de mandar la cantidad. La API, la base, el saldo, el motor
y la canasta no cambian.

Aplica en la entrada rápida, la salida, el conteo, las líneas de una remisión, la donación del
Donador y el tamaño de una presentación suelta.

### Topes de cantidad

Joseph los aprobó como se propusieron. Se revisan en la web y en la API:

| Qué | Tope |
|---|---|
| Tamaño de una presentación (suelta o paquete, en total) | 50 kg o 50 L; en unidades, 1.000 |
| Cantidad de una línea (entrada, salida, conteo, remisión, donación), en unidad base | 10.000 kg, 10.000 L o 10.000 unidades |

La validación que cuenta es la del Operador al recibir y contar. Los topes solo frenan cifras
absurdas.

### Carga inicial en la bodega

Es la entrada rápida que ya existe, con el paso de la presentación, y no una pantalla nueva. El
Operador escanea, y si el código es nuevo lo asocia ahí mismo y queda validado. Después escribe
cuántos hay y se registra la entrada, o toca «Solo guardar el código» y pasa al siguiente sin
registrar cantidad.

Con un código, la cantidad cuenta presentaciones: 8 paquetes x12 son 8 × 7,2 L = 57,6 L. Si el
Operador busca la categoría por nombre en vez de escanear, la cantidad va con el selector de
unidades. Las entradas quedan en la bitácora como cualquier otra.

## Decisiones de Claude para revisar

Joseph decidió todo lo anterior salvo estos puntos, que tomó Claude a partir de lo conversado:

- Todo código nuevo tiene presentación.
- El tamaño de un paquete se calcula a partir de su suelta.
- El nombre de una presentación es único en su categoría, y una suelta repetida por tamaño solo
  genera un aviso.
- El Operador valida en la entrada rápida un código propuesto por un Donador.
- Asociar y crear presentaciones necesita red.
- En la migración, los códigos actuales pasan a validados.

## Lo que se deja al constructor

- El esquema exacto: la tabla `presentacion` (categoría, nombre, clase, tamaño o presentación
  contenida con su cantidad, estado y autor), la columna de estado del código y la migración de
  `codigo_barras.contenido` y `revisado`. En la migración, los códigos que existen pasan a
  validados, porque todos los asociaron Operadores. Cada código con contenido recibe una suelta
  de ese tamaño. Uno sin contenido queda sin presentación y marcado para revisar, y mientras no
  la tenga, su cantidad va en la unidad base, como hoy.
- Qué ve un Donador que escanea un código que otro Donador ya propuso: un código desconocido, o la
  propuesta marcada «sin confirmar».
- Cómo se juntan presentaciones repetidas desde «Códigos».
- La redacción de mensajes y avisos.
- Cómo se reparte en ciclos y PR.

## Cambios al construir

Lo que cambió respecto del diseño al construirlo (2026-10-20):

- **Los códigos no se borran.** Joseph decidió mantener la regla del Bloque 2: un código mal
  puesto se corrige, no se elimina. Salieron la ruta `DELETE /api/codigos-barras/:ean`, el permiso
  de borrado de `acopio_app`, la migración `20261024110000_codigos_borrado` y la acción de
  bitácora `codigo_barras.borrado`. Donde este diseño y el plan dicen «se borran», vale esto.
- **El Administrador puede mover un código de categoría.** Su `PATCH` acepta una presentación de
  cualquier categoría y `categoria_id` la sigue. No existe el 422 `PRESENTACION_DE_OTRA_CATEGORIA`.
  Sin borrar, es la única forma de arreglar un código mal clasificado, y el cambio queda en la
  bitácora con lo de antes y lo de después.
- **«Escribir el número».** El Operador y el Administrador pueden teclear el código desde la vista
  de la cámara, útil cuando no lee (#40). El Donador solo escanea.
- **«Código nuevo» no preselecciona ninguna presentación.** La maqueta marcaba la primera; se
  quitó para que nadie asocie la equivocada por descuido.
- **Orden de candados en la recepción.** Cada EAN se resuelve una sola vez por comprobante, en
  orden de EAN, y las líneas con el mismo EAN toman el resultado de la primera. Las presentaciones
  de destino se validan en orden de id. El orden de candados es presentación, código y candado
  consultivo. Así dos recepciones simultáneas no se bloquean entre sí.
- **Corregir a una presentación `PROPUESTO` la valida.** Si el Operador corrige una línea a una
  presentación propuesta por un Donador, esa presentación queda `VALIDADO`: el Operador es la
  fuente de verdad (decisión de Joseph).
- **«Corregir» en la recepción** abre con la categoría de la línea y llega a las demás buscando.
  No lista todas de entrada, porque pediría una consulta por categoría.
- **Preparar usa un campo de texto con selector** en las líneas de kg o L sin presentación, en
  lugar del contador con + y −. Es la única forma de escribir 600 ml.
- **Buscadores más cortos.** Los placeholders pasaron a «Busca: arroz…» (buscador de categoría),
  «Número o nombre» (C18) y «Buscar categoría», para que quepan enteros a 360 px junto a
  «Escanear». Las diferencias con la maqueta están en las notas de
  [C04 Escáner](../../03-diseno/stitch/C04-escaner/README.md) y
  [C04 Entrada rápida](../../03-diseno/stitch/C04-entrada-rapida/README.md).
- **El tope de 10.000 también limita el conteo físico.** Las líneas de cantidad incluyen el
  conteo, así que un acopio con más de 10 t de una categoría no puede registrar su conteo. Queda
  como [P-083](../../01-requerimientos/pendientes.md) para que Joseph decida.
- **La demo no reescribe filas ya migradas.** En el servidor de pruebas, `7501031311309` seguirá
  `VALIDADO` y `4006381333931` conservará la suelta que creó la migración. Se ajusta a mano tras
  el despliegue ([P-082](../../01-requerimientos/pendientes.md)).
