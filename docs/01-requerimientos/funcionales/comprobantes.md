---
title: "RF-CMP · Comprobantes y cadena de custodia"
type: requerimientos
tags: [requerimientos, rf]
estado: vigente
modulo: comprobantes
bloque: 3
actualizado: 2026-09-12
---

# RF-CMP · Comprobantes y cadena de custodia

**Bloque 3**

Principio: **la donación es válida cuando alguien la concilió, no cuando alguien
subió una foto.**

---

### RF-CMP-001 · Subir comprobante anónimo ~~DESCARTADO~~
**Actor:** ~~Donante, sin cuenta~~ · **Prioridad:** ~~DEBE~~

**2026-09-12 · descartado.** Reemplazado por
[RF-CMP-001B](#rf-cmp-001b--preparar-donación-con-escaneo-donador). Un folio sin
cuenta detrás es un código que la gente olvida y no tiene dónde recuperar — sin
login no hay a dónde volver a consultarlo. Mantener las dos vías en paralelo
—anónima por foto, y con cuenta por escaneo— también duplicaba trabajo de
desarrollo para dos caminos que terminan haciendo lo mismo. El número no se
reutiliza; ver [pendientes.md](../../01-requerimientos/pendientes.md), P-017.

**Lo que sigue existiendo sin ningún registro:** alguien puede llegar a un acopio
y entregar algo sin haber preparado nada — el Operador lo registra como una
entrada normal (C04), igual que cualquier mercancía. Lo que desaparece es la
promesa de un folio y un seguimiento personal para quien no se registró.

### RF-CMP-001B · Preparar donación con escaneo (Donador)
**Actor:** Donador · **Prioridad:** DEBE
**Depende de:** RF-IDE-013

**Único camino para obtener un folio con trazabilidad.** Quien quiere seguimiento
de su donación —el caso típico es alguien con seguidores a quienes rendirles
cuentas— tiene que registrarse; a cambio, nunca depende de recordar un código
suelto, porque queda en su cuenta.

**Criterios de aceptación:**
- [ ] Escanea el código de barras de cada producto con la cámara —mismo componente
      que usa C04— y ajusta cuántas unidades lleva, sin elegir acopio todavía
- [ ] Escanear dos veces el mismo producto suma a la línea existente, no crea otra
- [ ] Si el código tiene contenido registrado (RF-CAT-004), el sistema convierte a
      la unidad base de la categoría — «12 botellas de 600 ml» son 7,2 L
- [ ] Un producto sin código, o con un código desconocido, se busca por palabra
      clave, igual que en C04, y la cantidad se escribe en la unidad base. **El
      Donador no le enseña códigos nuevos al catálogo** — eso queda para el
      Operador (RF-INV-002), que tiene una ubicación asignada y responde por ella
- [ ] Fecha de vencimiento opcional por línea; si la categoría es perecedera y no
      la trae, la completa el Operador al recibir
- [ ] Con la lista lista, el sistema sugiere dónde entregarla y advierte si algo no
      sería aceptado — ver [RF-CMP-001D](#rf-cmp-001d--sugerir-punto-de-entrega)
- [ ] Elige el acopio sugerido, o cualquier otro en el mapa (RF-RED-002) — solo
      aparecen acopios en estado `ACTIVO`
- [ ] **Adjuntar una foto de la factura es opcional** — respaldo adicional, no
      requisito. Reusa el almacenamiento seguro de [RF-CMP-002](#rf-cmp-002--almacenar-archivos-de-forma-segura)
- [ ] Al confirmar, genera el comprobante con sus `linea_comprobante`, el acopio
      elegido y el folio
- [ ] Muestra el folio como código y como QR, para mostrarlo en el acopio
- [ ] El folio queda asociado a su cuenta — aparece en su historial (RF-CMP-008)
- [ ] El comprobante nace `PREPARADO`. El Donador puede cancelarlo mientras no se
      haya entregado; a los 7 días sin entrega pasa solo a `CANCELADO`
- [ ] Máximo 5 donaciones `PREPARADO` a la vez por Donador: frena el abuso de un
      registro abierto sin estorbar a quien dona de verdad
- [ ] El folio no es secuencial: no se puede adivinar otro probando números
- [ ] Los valores 7 días y 5 donaciones son iniciales y configurables

### RF-CMP-001D · Sugerir punto de entrega
**Actor:** Sistema · **Prioridad:** DEBERÍA
**Depende de:** RF-RED-002

Ayuda a decidir, no obliga. La misma idea de
[RF-RED-003](red.md#rf-red-003) —ver qué urge y qué no traer antes de moverse—
llevada al momento de preparar la donación, no al de comprar.

**Criterios de aceptación:**
- [ ] Ordena los acopios `ACTIVO` primero por cuántas líneas de la donación
      aceptan completas, luego por horario abierto ahora y cercanía si hay
      ubicación del dispositivo
- [ ] Por cada acopio de la lista, marca las líneas que ese acopio tiene en
      *no recibir* — la advertencia aparece antes de elegir, no después de llegar
- [ ] El Donador acepta el primero sugerido con un toque, o busca cualquier otro
      en el mapa —incluso uno que rechace alguna línea—: es su decisión, se
      advierte pero no se bloquea
- [ ] Sin ubicación del dispositivo, ordena solo por cobertura de líneas y horario
- [ ] Se recalcula si cambia una cantidad o agrega o quita una línea antes de
      confirmar

### RF-CMP-001C · Confirmar recepción física de una donación preparada
**Actor:** Operador · **Prioridad:** DEBE
**Depende de:** RF-CMP-001B

**2026-09-12 · sube a DEBE.** Sin el camino anónimo, es la única forma de que una
donación preparada entre al inventario con su folio (P-018).

**Criterios de aceptación:**
- [ ] El Operador busca el folio o escanea el QR del Donador
- [ ] Ve la lista declarada: categoría y cantidad por línea
- [ ] Confirma cada línea con un toque si coincide, o ajusta la cantidad con un
      gesto de deslizar si no coincide — sin abrir un formulario aparte
- [ ] Una línea que no llegó se ajusta a cero; no genera movimiento
- [ ] Si la categoría es perecedera y la línea no trae vencimiento, lo pide antes
      de dar esa línea por confirmada — igual que RF-INV-001
- [ ] Al terminar, genera un movimiento de `ENTRADA` por cada línea confirmada con
      cantidad mayor que cero —convertida a la unidad base—, enlazado al
      comprobante, y el comprobante pasa de `PREPARADO` a `PENDIENTE`
- [ ] Solo se recibe un comprobante `PREPARADO`. Uno ya recibido, cancelado o
      vencido muestra su estado y no deja confirmar otra vez
- [ ] Si el folio se preparó para otro acopio, se recibe igual donde llegó:
      `acopio_id` pasa al acopio del Operador y el cambio queda en la bitácora — la
      gente cambia de planes, y la mercancía no se devuelve por eso
- [ ] En ese caso se revisan de nuevo las categorías *no recibir* de este acopio —
      la advertencia que vio el Donador (RF-CMP-001D) era de otro sitio. No
      bloquea: la donación ya está físicamente aquí, igual que en RF-INV-001
- [ ] **Requiere conexión.** Sin señal, el Operador registra la mercancía como
      entradas normales en C04 offline (RF-INV-009); el folio sigue `PREPARADO` y
      el Auditor lo vincula después a esas entradas (RF-CMP-004)
- [ ] El comprobante sigue pasando por conciliación (RF-CMP-004) — confirmar la
      entrega no reemplaza el segundo par de ojos del Auditor, la hace más rápida
      porque compara líneas, no una foto suelta

### RF-CMP-008 · Historial de donaciones del Donador
**Actor:** Donador · **Prioridad:** DEBERÍA

**Criterios de aceptación:**
- [ ] Lista de todos sus comprobantes, con estado y antigüedad
- [ ] Cada uno enlaza al mismo seguimiento público de RF-CMP-006
- [ ] Ordenable por fecha y filtrable por estado
- [ ] Ver el historial no expone datos de otros donadores

### RF-CMP-002 · Almacenar archivos de forma segura
**Actor:** Sistema · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] Almacenamiento con **buckets privados, sin excepción** (Garage,
      [ADR-0012](../../02-arquitectura/adr/ADR-0012-almacenamiento-garage.md))
- [ ] El navegador nunca habla con el almacenamiento directamente; la API entrega URLs firmadas
      con expiración corta
- [ ] Miniaturas generadas con `sharp` en la API
- [ ] Se valida el tipo real del archivo, no la extensión
- [ ] Se elimina metadata EXIF, incluida la geolocalización del teléfono
- [ ] **Las facturas contienen nombre, cédula y dirección: jamás se exponen en
      superficie pública**

### RF-CMP-003 · Bandeja de pendientes
**Actor:** Auditor · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] Lista filtrable por acopio, fecha y estado
- [ ] Muestra los `PENDIENTE` —ya recibidos en el acopio—. Los `PREPARADO`
      todavía no llegan y no son trabajo del Auditor
- [ ] Ordenada por antigüedad; lo más viejo primero. Los que tienen alguna
      diferencia entre lo declarado y lo confirmado van marcados: son los que piden
      atención
- [ ] Contador visible de pendientes por acopio
- [ ] Vista de detalle con las líneas declaradas junto a las confirmadas por el
      Operador (RF-CMP-001C); la foto de factura, si existe, a un toque de
      distancia — es respaldo, no el dato principal

### RF-CMP-004 · Conciliar contra movimiento
**Actor:** Auditor · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] La vista de detalle compara, línea por línea: lo declarado por el Donador,
      lo confirmado por el Operador, y el movimiento de `ENTRADA` resultante
- [ ] Si el comprobante trae foto de factura, se muestra al lado como respaldo
      adicional, no como el dato que se concilia
- [ ] La comparación contra movimientos es por categoría: suma de lo confirmado,
      en unidad base, frente a suma de las `ENTRADA` del comprobante
- [ ] También se puede vincular un comprobante a entradas ya registradas, o crear
      el movimiento faltante desde ahí mismo — el caso de un folio entregado sin
      señal (RF-CMP-001C), que se busca por folio porque sigue `PREPARADO`
- [ ] Al aprobar, el estado pasa a `CONCILIADO` y queda registrado quién y cuándo
- [ ] Un comprobante `CONCILIADO` exige al menos un `movimiento_id`

### RF-CMP-005 · Rechazar comprobante
**Actor:** Auditor · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] Motivo obligatorio, escogido de una lista más texto libre
- [ ] Motivos previstos: duplicado, lo confirmado no cuadra con los movimientos,
      diferencia sin explicar entre lo declarado y lo confirmado. «Ilegible» salió
      con el comprobante por foto (P-017)
- [ ] Se notifica al Donador por correo con el motivo
- [ ] **Rechazar no borra mercancía.** Las `ENTRADA` ya ocurrieron —la mercancía
      está físicamente en el acopio—; si hay que corregirlas, es con un `AJUSTE`
      (RF-INV-004)
- [ ] Un rechazo se puede revertir; queda en la bitácora

### RF-CMP-006 · Seguimiento por folio
**Actor:** Cualquiera, sin cuenta · **Prioridad:** DEBE

Consultar un folio sigue sin pedir cuenta — solo **crear** uno la exige ahora
(RF-CMP-001B). Es lo que permite al Donador compartir su folio en público sin que
quien lo revise necesite registrarse.

**Criterios de aceptación:**
- [ ] Consulta pública por folio, con límite de intentos por IP
- [ ] Línea de tiempo: preparado → recibido en el acopio → **conciliado, donde se
      cierra la donación del Donador** → si se conoce, sigue con despachado →
      recibido en destino, marcado como estimado
- [ ] **Muestra qué se donó**: categoría y cantidad confirmada de cada línea. Es lo
      que el Donador necesita para rendir cuentas a quien le confió la donación —
      y no depende de que se conozca el resto del recorrido
- [ ] Muestra el destino y la fecha de recepción cuando existan; si no se vinculó
      a ningún despacho, dice **«conciliado, en el acopio»**, no un dato inventado
- [ ] **Revela el recorrido del insumo, jamás datos del donante ni la imagen de la
      factura**
- [ ] Un folio inexistente devuelve el mismo mensaje genérico que uno no encontrado

### RF-CMP-007 · Trazabilidad estimada del despacho
**Actor:** Sistema · **Prioridad:** DEBERÍA
**Depende de:** RF-MOT-008, RF-MOT-009

**2026-09-12, actualizado (P-019).** La donación **se cierra para el Donador al
conciliarse** (RF-CMP-004) — esa es la garantía real: alguien confirmó que lo
declarado llegó físicamente. Lo que pasa después —qué camión, qué zona— es un
riesgo aceptado: varios camiones salen de un mismo acopio, a veces sin destino
fijo todavía, y el saldo es una suma, no lotes
([ADR-0002](../../02-arquitectura/adr/ADR-0002-saldo-derivado.md)) — no hay forma
automática de saber qué entrada alimentó qué salida. Lo que sigue es un estimado
agregado, no un rastreo garantizado por folio.

**Criterios de aceptación:**
- [ ] Al despachar (RF-MOT-008), el Operador puede vincular folios conciliados a
      la remisión —escaneando su QR o eligiéndolos de los recibidos en su
      acopio—. Opcional: no bloquea el despacho
- [ ] Al confirmarse la recepción de la remisión (RF-MOT-009), los folios
      vinculados avanzan a «recibido en destino», con la fecha
- [ ] Un folio sin vincular se queda en «conciliado, en el acopio» — no se
      adivina a dónde fue
- [ ] Si una donación se reparte entre varias remisiones, se muestran todas, con
      el aviso **«parte de tu donación»** — no se finge exactitud que no existe
- [ ] Cada remisión que sale y cada una que se recibe suma, además, a un conteo
      público agregado — ver [RF-HOM-004](home.md#rf-hom-004--transparencia)
