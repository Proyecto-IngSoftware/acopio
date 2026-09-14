---
title: "Glosario"
type: contexto
tags: [contexto]
estado: vigente
actualizado: 2026-09-12
---

# Glosario

Vocabulario común del proyecto. Si un término se usa en código, interfaz o
conversación, está aquí y significa exactamente esto.

Regla: **el código usa estos nombres en español**, sin traducir. `Acopio`, no
`CollectionCenter`. Un solo vocabulario evita el costo de traducir mentalmente en
cada revisión de código.

---

## Lugares

**Acopio** — Centro de recolección, típicamente en ciudad de origen (Bogotá).
Recibe donaciones del público y despacha hacia zonas. Tiene inventario.

**Zona** — Área afectada por el desastre que necesita ser atendida. Recibe
remisiones. Tiene inventario y una población estimada.

**Ubicación** — Cualquiera de las dos. Un movimiento de inventario siempre ocurre
en una ubicación, identificada por `ubicacion_tipo` + `ubicacion_id`.

---

## Inventario

**Categoría** — Tipo de insumo del catálogo controlado: *Agua embotellada*,
*Arroz*, *Pañal adulto*. Tiene una unidad base y una marca de perecedero. Es la
unidad de conteo del sistema; no se cuentan marcas ni productos individuales.

**Unidad base** — La unidad en la que se cuenta una categoría: litros, kilogramos
o unidades. Fija por categoría; no se mezclan.

**Movimiento** — Hecho inmutable: *entraron 200 L de agua al Acopio Norte a las
3:14 pm*. Nunca se edita ni se borra. Cuatro tipos: `ENTRADA`, `SALIDA`, `AJUSTE`,
`RECEPCION`.

**Saldo** — Suma de todos los movimientos de una categoría en una ubicación.
**No se almacena, se deriva.** Es lo que hace auditable el sistema.

**Ajuste** — Movimiento correctivo con motivo escrito obligatorio. Es la única
forma de arreglar un error, porque los movimientos no se borran.

**Umbral** — Mínimo y máximo definidos para una categoría en una ubicación.
Alimentan el semáforo y el cálculo de superávit.

**No recibir** — Interruptor por categoría y por acopio. Significa *tenemos de
sobra, no traigan más*. Se publica en el mapa para que la gente lo vea antes de
salir de casa. Es la respuesta directa al problema del agua acumulada.

**Canasta estándar** — Cantidad de cada categoría que una persona necesita por día.
Multiplicada por la población de una zona y por el horizonte de días, da la
necesidad sin esperar un reporte manual.

---

## Flujo de la donación

**Comprobante** — Registro de una donación preparada por un Donador: el acopio de
destino y sus líneas —producto y cantidad—, con foto de factura opcional. Nace
`PREPARADO`; pasa a `PENDIENTE` cuando un Operador lo recibe en el acopio, y a
`CONCILIADO` o `RECHAZADO` cuando lo revisa un Auditor. Un `PREPARADO` que no se
entrega pasa a `CANCELADO`.

**Folio** — Identificador público de un comprobante, no secuencial. Con él, y sin
cuenta, cualquiera consulta qué se donó y su recorrido.

**Remisión** — Envío de un acopio hacia una zona, o hacia un **despacho general**
sin zona fija cuando no se conoce el destino al salir —quien la recibe la fija al
confirmar—. Tiene líneas (categoría y cantidad), un estado —`BORRADOR`,
`EN_TRANSITO`, `RECIBIDA`— y un QR imprimible; escanearlo al llegar es un atajo,
no un requisito.

**Cadena de custodia** — Donador prepara la donación → operador la recibe en el
acopio → auditor concilia, **aquí se cierra la donación del Donador** → si se
vincula a una remisión, receptor confirma recepción — estimado de mejor esfuerzo,
no garantizado (2026-09-12, P-019) → cualquiera consulta el folio y ve lo que se
sabe del recorrido.

---

## Motor

**Déficit** — Lo que le falta a una zona en una categoría:
`max(0, necesidad − recibido)`.

**Superávit** — Lo que le sobra a un acopio: `max(0, saldo − umbral_máximo)`.

**Cobertura** — Proporción de la necesidad de una zona ya satisfecha, entre 0 y 1.
Es la medida de criticidad: cobertura baja, criticidad alta.

**Sugerencia** — Propuesta del motor: *mover 500 L de agua del Acopio Norte a la
Zona 7*. Lleva un puntaje y su justificación. **Nunca se ejecuta sola**; un humano
la aprueba y esa aprobación es la que crea la remisión.

**Necesidad reportada** — Lo que el Receptor ve en el terreno y la canasta estándar
no puede calcular: una categoría y una nota corta, sin conteo. Complementa —no
reemplaza— el déficit calculado, y se publica en el mapa.

**Donador** — Quien se registra con cuenta propia para preparar una donación por
adelantado, escaneando lo que va a entregar. Es el único camino para obtener un
folio con seguimiento — la foto de factura queda como respaldo opcional, no como
alternativa sin cuenta (2026-09-12, P-017).

---

## Personas y accesos

**Rol** — `ADMIN`, `OPERADOR`, `AUDITOR`, `RECEPTOR`. Cuatro roles con cuenta;
ver [actores.md](actores.md#matriz-de-permisos).
Global por usuario, no por ubicación.

**Asignación** — Vínculo entre un usuario y una ubicación. Un usuario puede tener
varias. Solo un administrador las crea o las quita.

**Alcance** — El conjunto de ubicaciones asignadas a un usuario. Delimita todo lo
que puede tocar.

**Invitación** — Enlace de un solo uso, con vencimiento a 7 días, con el que una
persona define su propia contraseña en su primer ingreso. El administrador nunca
conoce ni fija contraseñas ajenas.

**Restablecer acceso** — Regenerar la invitación de un usuario que ya está activo.
Exige motivo escrito, notifica a la persona y a todos los administradores, y queda
destacado en la bitácora.

---

## Otros

**Entidad** — Organización que administra una causa o un acopio. Puede llevar sello
de verificación con documento soporte y fecha.

**Causa** — Frente de ayuda del directorio: personas, animales, adultos mayores,
personas desaparecidas, rescatistas. Enlaza al sitio oficial de su entidad. Al
terminar su campaña se **archiva**: deja de destacarse, pero sigue visible como
«causa atendida».

**Jornada** — Turno de voluntariado en un acopio, con fecha, horario y cupo máximo.

**Reserva** — Cupo tomado en una jornada mediante correo y código de confirmación.
No requiere cuenta.

**Antigüedad del dato** — Tiempo transcurrido desde la última actualización, visible
junto a todo dato operativo. *"1.240 L · hace 8 min"*, nunca *"1.240 L"* a secas.
Un número sin marca de tiempo es una afirmación que nadie puede verificar.

**Emergencia** — Entidad raíz. Todo cuelga de un evento. Permite reutilizar el
sistema en desastres futuros sin rehacer el modelo.
