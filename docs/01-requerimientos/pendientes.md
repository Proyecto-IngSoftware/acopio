---
title: "Pendientes — bandeja de entrada"
type: pendientes
tags: [requerimientos, pendientes]
estado: vigente
actualizado: 2026-10-10
---

# Pendientes — bandeja de entrada

**Todo requerimiento, idea o duda nueva entra aquí crudo.** No hace falta que esté
bien redactado. Hace falta que quede escrito.

En la revisión semanal cada entrada sale por una de cuatro puertas:

| Destino                           | Cuándo                                               |
| --------------------------------- | ---------------------------------------------------- |
| `01-requerimientos/funcionales/`  | Entra al alcance del semestre                        |
| `99-futuro/backlog.md`            | Lo queremos, no cabe ahora                           |
| `00-contexto/fuera-de-alcance.md` | No lo queremos, y queda escrito por qué              |
| `02-arquitectura/adr/`            | Es una decisión de arquitectura, no un requerimiento |

Una entrada nunca se borra en silencio. Se mueve y se marca resuelta.

---

## Formato

```markdown
### P-000 · Título corto
**Fecha:** AAAA-MM-DD · **Propuesto por:** nombre
**Qué:** una o dos frases.
**Por qué:** qué problema real resuelve.
**Estado:** ABIERTO | EN DISCUSIÓN | RESUELTO → destino
```

---

## Abiertos

### P-001 · Definir la canasta estándar con una fuente citable
**Fecha:** 2026-08-20 · **Propuesto por:** equipo
**Qué:** fijar cuántos litros de agua, kilogramos de grano y demás necesita una
persona por día, con una fuente citable (Esfera, UNGRD o Cruz Roja).
**Por qué:** el motor entero se apoya en este número. Inventado, todo el cálculo
de déficit queda sin defensa ante el jurado.
**Estado:** RESUELTO el 2026-10-06 → canasta v2
**Avance 2026-09-11:** el equipo decidió usar los datos de las fuentes **solo como
referencia**. El Avance 1 cita el Manual Esfera: 15 L de agua segura y 2.100 kcal por
persona al día. Falta la cantidad de referencia del resto de categorías.
`canasta_estandar.fuente` ya obliga a citar cada valor.
**Avance 2026-09-28:** primera versión de la canasta en
[catalogo-inicial.md](catalogo-inicial.md#canasta-estándar). Solo 10
categorías llevan cantidad por persona: agua (15 L, Esfera), jabón y detergente
(Esfera) y siete alimentos que suman 2.100 kcal (Esfera) con productos del kit de la
UNGRD. Las demás quedan fuera del cálculo automático y se mueven por el reporte del
Receptor (P-015), como ya permite RF-CAT-003. Falta confirmar las cifras en la fuente
([I-006](../00-contexto/investigaciones.md#i-006--cantidades-por-persona-para-la-canasta-estándar));
registro en [#20](https://github.com/Proyecto-IngSoftware/acopio/issues/20).
**Resuelto el 2026-10-06:** una búsqueda en las fuentes primarias confirmó el agua, la
energía y el jabón en Esfera 2018, con página, y las kilocalorías en la TCAC 2015 del
ICBF. Encontró que la mezcla de alimentos tenía poca grasa. La canasta v2 corrige arroz
(0,20 kg), granos secos (0,08 kg) y aceite (0,04 L) y cita la fuente de cada valor.
Detalle en [I-006](../00-contexto/investigaciones.md#i-006--cantidades-por-persona-para-la-canasta-estándar)
y [catalogo-inicial.md](catalogo-inicial.md#canasta-estándar).

### P-002 · Origen de la población estimada por zona
**Fecha:** 2026-08-20 · **Propuesto por:** equipo
**Qué:** decidir de dónde sale `Zona.poblacion_estimada`: censo DANE, reporte de
la alcaldía, o carga manual del administrador.
**Por qué:** es el otro factor del cálculo de necesidad. Y su antigüedad importa:
la población de una zona cambia con los desplazamientos.
**Estado:** RESUELTO el 2026-10-06 → RF-MOT-012
**Avance 2026-09-11:** las proyecciones de población del DANE 2020-2035 se usan
**solo como referencia**, según decisión del equipo. Falta decidir quién puede
ajustar el valor. `zona.poblacion_fuente` y `zona.poblacion_fecha` ya existen en el
modelo.
**Resuelto el 2026-10-06:** Joseph lo pasó a requerimiento de las zonas afectadas,
[RF-MOT-012](funcionales/motor.md#rf-mot-012--ajustar-la-población-de-una-zona), para
afinarlo ahí. La propuesta inicial: el Administrador ajusta el número desde C9, con
fuente y fecha obligatorias y con registro en la bitácora.

### P-003 · Catálogo inicial de categorías
**Fecha:** 2026-08-20 · **Propuesto por:** equipo
**Qué:** lista concreta de categorías con su unidad base y su marca de perecedero.
**Por qué:** demasiadas categorías vuelven tediosa la entrada rápida; demasiado
pocas hacen inútil el emparejamiento. Hay que encontrar el punto, probablemente
entre 25 y 40.
**Estado:** RESUELTO el 2026-09-28 → [catalogo-inicial.md](catalogo-inicial.md):
39 categorías en los diez grupos de RF-CAT-001. Medicamentos, fórmula infantil y comida
preparada quedan fuera del catálogo, con su razón. Registro en
[#20](https://github.com/Proyecto-IngSoftware/acopio/issues/20).

### P-004 · Proveedor de correo transaccional
**Fecha:** 2026-08-20 · **Propuesto por:** equipo
**Qué:** con qué se envían invitaciones, confirmaciones de reserva y avisos de
acceso. Candidatos: Resend, Brevo, o el SMTP de la universidad.
**Por qué:** sin correo no hay invitaciones ni confirmación de turnos. Afecta a
dos módulos.
**Estado:** RESUELTO → [ADR-0008](../02-arquitectura/adr/ADR-0008-arquitectura-stack-inicial.md),
confirmado el 2026-09-14 al redactar el Avance 3. Sigue abierto solo el remitente de
producción, que se fija antes del primer despliegue (RTA-04).
Decidido por Joseph el 2026-09-14: **SMTP estándar**,
sin SDK de proveedor, para que cambiar de servidor sea cambiar variables. En
desarrollo se prueba con una cuenta personal de Microsoft 365. Falta decidir el
remitente de producción: una cuenta personal no debería firmar las invitaciones de
la plataforma. Riesgo en [ADR-0008](../02-arquitectura/adr/ADR-0008-arquitectura-stack-inicial.md).
**Nota 2026-09-14:** Supabase Auth envía los correos de restablecer contraseña y
verificar correo, y con su servidor por defecto solo manda 2 por hora. Se configura
con este mismo SMTP. Microsoft 365 retira el SMTP con usuario y contraseña a fines
de diciembre de 2026 ([I-004](../00-contexto/investigaciones.md)).
**2026-09-28 · Remitente resuelto:** los correos de producción salen de un buzón del
dominio del proyecto (por ejemplo `no-responder@<dominio>`), por el SMTP del
proveedor del dominio o un relay por SMTP. La cuenta de Microsoft 365 queda solo
para pruebas en desarrollo. Queda cerrado RTA-04 en lo que toca a producción.

### P-005 · Dominio y hosting del despliegue
**Fecha:** 2026-08-20 · **Propuesto por:** equipo
**Qué:** dónde vive el `docker compose` en producción y bajo qué dominio.
**Por qué:** Supabase Auth necesita URLs de redirección configuradas, y el enlace
de invitación tiene que apuntar a algo estable.
**Estado:** RESUELTO el 2026-09-28 (ver al final de esta entrada) — el mecanismo quedó confirmado en
ADR-0008 el 2026-09-14. Mecanismo decidido el 2026-09-12: **VPS con
[Dokploy](https://dokploy.com)**, PaaS autoalojado sobre Docker y Traefik, que
gestiona el mismo `infra/docker-compose.yml` sin reescribirlo y resuelve dominio y
HTTPS automático. Desarrollo local sigue siendo Docker Compose para cada quien, sin
cambios. Falta elegir **proveedor de VPS y dominio** — eso sigue abierto y bloquea
el arranque real. Detalle en [despliegue.md](../06-operacion/despliegue.md#producción--vps-con-dokploy).
**2026-09-14:** el mecanismo quedó aceptado con ADR-0008; sigue abierto solo el
proveedor del VPS y el dominio.
**2026-09-28 · RESUELTO:** el despliegue va en un servidor de pruebas propio del
proyecto con Dokploy; servidor y dominio quedan cubiertos. Falta solo aprovisionarlo
(pasos 2 a 6 de [despliegue.md](../06-operacion/despliegue.md#producción--vps-con-dokploy)).

### P-006 · Política de retención de imágenes
**Fecha:** 2026-08-20 · **Propuesto por:** equipo
**Qué:** cuánto tiempo se conservan las facturas y evidencias en MinIO, y qué pasa
después.
**Por qué:** son datos personales. La Ley 1581 exige finalidad y temporalidad
declaradas en la política de privacidad, y P11 no se puede escribir sin esto.
**Estado:** RESUELTO el 2026-10-05 → [especificación del Bloque 3](../superpowers/specs/2026-10-05-bloque-3-custodia-design.md#3-decisiones), C-02.
La foto de una factura se guarda 12 meses desde que su comprobante se cierra
(conciliado, rechazado o cancelado); una tarea diaria la borra de Garage con su
miniatura y lo registra en la bitácora. El comprobante y sus líneas se conservan. Va en
la política de privacidad (P12).

### P-007 · Herramienta de gestión de trabajo
**Fecha:** 2026-09-11 · **Propuesto por:** equipo
**Qué:** elegir dónde viven el Product Backlog y las tareas de cada Sprint: Trello,
GitHub Projects, Jira o Notion.
**Por qué:** la tabla del ADR-001 del Avance 3 tiene la fila «Gestión de trabajo»
y hoy no tiene respuesta.
**Estado:** RESUELTO → ADR-0008, aceptado el 2026-09-14: **GitHub Projects**, porque
vive junto al repositorio y los PR sin abrir cuenta nueva.

### P-008 · Herramienta de diagramas
**Fecha:** 2026-09-11 · **Propuesto por:** equipo
**Qué:** elegir con qué se dibujan la descomposición funcional, el diagrama
entidad-relación y el diagrama de arquitectura: Draw.io, PlantUML, Excalidraw,
Lucidchart u otra.
**Por qué:** el Avance 3 pide tres diagramas gráficos y los de la bóveda están en
texto. Una sola herramienta para los tres mantiene el estilo. Una basada en texto,
como PlantUML o Mermaid, permite versionar los diagramas en la bóveda; Obsidian
dibuja Mermaid sin plugins. También responde la fila «Herramientas de modelado» del
ADR-001.
**Estado:** RESUELTO → ADR-0008, aceptado el 2026-09-14: **Mermaid**, por versionarse
como texto junto al Markdown y renderizar nativo en Obsidian.

### P-009 · Pruebas previstas y su herramienta
**Fecha:** 2026-09-11 · **Propuesto por:** equipo
**Qué:** definir qué pruebas se hacen y con qué: unitarias para `packages/shared` y
los servicios, de integración para la API, y si serán manuales, automatizadas o
híbridas. Candidatos: Jest, que NestJS trae por defecto; Vitest, que encaja con Vite;
Supertest para la API.
**Por qué:** fila «Pruebas previstas» del ADR-001. Además
[RNF-06](no-funcionales.md) exige la prueba de concurrencia del inventario y
[RNF-05](no-funcionales.md) pruebas de carga.
**Estado:** RESUELTO → ADR-0008, aceptado el 2026-09-14: **Jest**, porque NestJS lo
trae configurado por defecto y sirve igual para `packages/shared`.

### P-010 · Agrupar los módulos en seis como máximo
**Fecha:** 2026-09-11 · **Propuesto por:** equipo
**Qué:** la vista de descomposición funcional del Avance 3 admite entre 3 y 6
módulos, y el producto tiene 7 (M1–M7). Propuesta de partida:
1. Portal público: M1 directorio, M2 mapa, M7 home
2. Turnos de voluntariado: M3
3. Inventario: M4
4. Comprobantes y custodia: M5
5. Zonas y motor: M6
6. Administración y acceso: identidad, catálogo maestro, bitácora

**Por qué:** sin esto el diagrama no cumple la guía.
**Estado:** RESUELTO → descomposición funcional del Avance 3, entregada el
2026-09-14 con estos seis módulos. Son también las épicas del Avance 2
([avance-02-requisitos.md](../entregas/avance-02-requisitos.md)). La revisión de
Brayan sigue en [#5](https://github.com/Proyecto-IngSoftware/acopio/issues/5).

### P-011 · Numeración del ADR del curso
**Fecha:** 2026-09-11 · **Propuesto por:** equipo
**Qué:** la guía llama «ADR-001» a la decisión de arquitectura y stack. En la
bóveda, ADR-0001 ya es «Supabase solo para autenticación», y un número asignado no
se reutiliza. Propuesta: en el Word se titula «ADR-001: Arquitectura y selección
tecnológica inicial», como pide la guía; en la bóveda entra como ADR-0008 con una
nota de equivalencia, y cita los ADR-0001 a 0007 como decisiones de detalle.
**Por qué:** evitar dos ADR con el mismo número.
**Estado:** RESUELTO → ADR-0008, aceptado el 2026-09-14.
**Corrección 2026-09-14:** la propuesta original era ADR-0007, pero ese número lo
tomó el mismo 2026-09-12 «El Donador, excepción controlada al modelo de roles»
(P-019). El ADR del curso pasa a **ADR-0008**. El archivo se crea como `propuesta`
y pasa a `aceptada` cuando el equipo confirme el enfoque.

### P-012 · El Avance 2 no está en el documento
**Fecha:** 2026-09-11 · **Propuesto por:** equipo
**Qué:** el Word solo tiene el Avance 1. La guía del Avance 3 pide ubicarlo después
del Avance 2 y derivar la descomposición funcional de sus épicas. No hay épicas,
Product Backlog, casos de uso ni mapa de stakeholders escritos. Mientras tanto, la
descomposición se deriva de los RF y las historias semilla de la bóveda.
**Por qué:** el docente puede notar el hueco.
**Estado:** EN CURSO desde el 2026-09-14 →
[avance-02-requisitos.md](../entregas/avance-02-requisitos.md). Estuvo aplazado desde
el 2026-09-11 mientras se entregaba el Avance 3.

### P-013 · Roles reducidos a cuatro: solo Admin, Auditor, Operador, Receptor
**Fecha:** 2026-09-12 · **Propuesto por:** Joseph, en conversación con el equipo
**Qué:** de los cinco roles originales (Admin, Operador, Coordinador, Verificador,
Observador), Coordinador de zona se reduce y renombra a **Receptor** — solo confirma
la llegada de un envío con un botón y una foto, sin decidir ni reportar nada más.
Verificador y Observador se fusionan en **Auditor** — concilia comprobantes y audita
el resto en solo lectura. Las decisiones que antes tenía Coordinador —aprobar
sugerencias del motor, gestionar remisiones, dar de alta zonas— pasan al
Administrador. Nadie más tiene cuenta: ni entidades, ni donantes, ni voluntarios.
**Por qué:** investigación de campo — ver
[investigaciones.md, I-001](../00-contexto/investigaciones.md#i-001--confirmación-de-recepción-en-el-último-tramo-last-mile) —
muestra que en la respuesta ciudadana espontánea nadie en el punto de entrega hace
conteo riguroso ni tiene mandato de decisión — la ayuda "se reparte para aumentar la
eficiencia", sin control. Pedirle a esa persona que decida traslados o audite
inventario no es realista. Aterriza en [actores.md](../00-contexto/actores.md) y
[modelo-datos.md](../02-arquitectura/modelo-datos.md).
**Estado:** RESUELTO → `00-contexto/actores.md`, `02-arquitectura/modelo-datos.md`,
RF de `identidad`, `comprobantes`, `inventario`, `motor`, `red`, `turnos`

**Nota de fase:** es la base para el semestre, no necesariamente definitiva.
Coordinador de zona con decisión propia queda como candidato de
[backlog](../99-futuro/backlog.md) si el equipo ve que centralizar todo en el
Administrador no escala.

### P-014 · Publicaciones tipo blog para causas específicas
**Fecha:** 2026-09-12 · **Propuesto por:** Joseph, en conversación con el equipo
**Qué:** entidades con causa específica —rescatistas de animales, proyección a
población vulnerable, Cruz Roja— necesitan varias publicaciones en el tiempo tipo
blog o noticia en la portada, no una ficha fija. La tabla `causa` actual solo admite
una descripción estática por causa.
**Por qué:** una sola ficha no alcanza para difundir novedades de una misma causa a
lo largo de la emergencia (una nueva convocatoria, un cambio de necesidad, un
agradecimiento).
**Estado:** ABIERTO — falta diseñar la tabla `publicacion` (entidad_id o causa_id,
titulo, cuerpo, imagen, fecha, publicada) y su pantalla en C19 / home. Bloquea M1 y
M7 si se quiere completo, aunque no bloquea el Avance 3.

### P-015 · Reporte de necesidades por zona, con mapa público
**Fecha:** 2026-09-12 · **Propuesto por:** Joseph, en conversación con el equipo
**Qué:** el Receptor, además de confirmar recepción, reporta qué hace falta en su
zona: elige una o varias categorías del catálogo y opcionalmente una nota corta.
Cada envío queda como un registro nuevo — nunca se edita ni se borra, igual que
`movimiento` — y la necesidad vigente es el reporte más reciente por zona y
categoría. Se muestra en el mapa público (P5), junto al «qué urge» de los acopios,
con la zona representada como área aproximada, sin exponer una dirección exacta.
**Por qué:** el cálculo automático del motor (`necesidad(z,c)`) predice cantidades
genéricas a partir de la canasta estándar; no puede anticipar un lote dañado o una
necesidad puntual. Esa información solo la tiene quien está en el terreno, y hoy no
tenía dónde quedar registrada. Publicarla en el mapa cierra el círculo con el
donante: ve qué falta en destino, no solo en el acopio, y decide qué comprar con
eso en mente.
**Estado:** RESUELTO → `02-arquitectura/modelo-datos.md` (tabla `reporte_necesidad`),
`00-contexto/actores.md`, `RF-MOT-011`, `RF-RED-009`,
`superpowers/specs/2026-08-20-acopio-design.md`

### P-016 · Rol Donador, con auto-registro
**Fecha:** 2026-09-12 · **Propuesto por:** Joseph, en conversación con el equipo
**Qué:** un donante que quiere rendir cuentas de forma exacta —el caso que motivó
esto: influencers, cantantes o iglesias que recaudan en especie y necesitan
demostrar en qué se usó— puede registrarse por su cuenta como **Donador**. Prepara
la donación escaneando el código de barras de cada producto y ajustando la
cantidad, recibe un folio con esas líneas, y lo muestra al llegar al acopio. El
Operador confirma o ajusta por línea con un gesto rápido. El folio sigue siendo
público como hoy (RF-CMP-006), y el Donador además ve todo su historial al iniciar
sesión.
**Por qué:** el comprobante de hoy es solo una foto de factura; no alcanza como
prueba para alguien bajo escrutinio público. No reemplaza el camino anónimo —las
dos vías conviven—, y no reabre la regla de "solo 4 cuentas internas": Donador no
es un rol interno, se auto-registra fuera de la consola, sin invitación y sin
ubicación asignada.
**Estado:** RESUELTO → `00-contexto/actores.md`, `00-contexto/glosario.md`,
`02-arquitectura/modelo-datos.md` (`linea_comprobante`, `comprobante.donador_id`,
rol `DONADOR`), `RF-IDE-013`, `RF-CMP-001B`, `RF-CMP-001C`, `RF-CMP-008`,
[flujos.md](../03-diseno/flujos.md)

**Nota de alcance:** es trabajo del **Bloque 3 · Custodia**, adelantado a pedido del
equipo. No bloquea el Avance 3 ni la reunión del 2026-09-14.

### P-017 · Se retira el comprobante anónimo; factura queda opcional
**Fecha:** 2026-09-12 · **Propuesto por:** Joseph, en conversación con el equipo
**Qué:** ya no existe el camino de subir solo una foto de factura sin cuenta
(RF-CMP-001, descartado). Crear un comprobante con folio exige ser
[Donador](../00-contexto/actores.md#donador) — la foto de factura pasa a ser un
adjunto **opcional** al preparar la donación por escaneo (RF-CMP-001B), respaldo
adicional y no el dato principal. Quien no quiere registrarse puede seguir
donando: el Operador lo registra como entrada normal, sin folio ni seguimiento
personal.
**Por qué:** un folio sin cuenta detrás es un código que la gente olvida, y sin
login no hay dónde recuperarlo. Mantener dos caminos en paralelo —anónimo por foto
y con cuenta por escaneo— también duplicaba trabajo de desarrollo para terminar
resolviendo lo mismo.
**Estado:** RESUELTO → `RF-CMP-001` (descartado), `RF-CMP-001B`, `RF-CMP-003/004`,
`RF-CMP-006`, `00-contexto/actores.md`, `00-contexto/glosario.md`,
`02-arquitectura/modelo-datos.md` (`comprobante.donador_id` obligatorio,
`archivos` opcional), `superpowers/specs/2026-08-20-acopio-design.md` (§8, P9),
[flujos.md](../03-diseno/flujos.md) (flujo 1 reemplazado, flujo 3 actualizado)

### P-018 · Validación de flujos y modelo de la cadena de custodia
**Fecha:** 2026-09-12 · **Propuesto por:** Joseph, revisión de viabilidad
**Qué:** al recorrer los flujos 4 y 6 contra el modelo de datos aparecieron huecos
que impedían construirlos tal como estaban escritos. Se corrigieron así:

| Hueco | Corrección |
|---|---|
| `PENDIENTE` mezclaba «preparado, sin entregar» con «recibido, sin conciliar»: la bandeja del Auditor se llenaba de donaciones que nunca llegaron | Estado `PREPARADO` antes de `PENDIENTE`, y `CANCELADO` para lo que no se entrega (vence a los 7 días) |
| Escanear un código dice la categoría, no el tamaño: «12» podía ser botellas o litros | `codigo_barras.contenido` opcional y `linea_comprobante.contenido_unitario`; la `ENTRADA` se convierte a la unidad base |
| Un perecedero exige fecha de vencimiento (RF-INV-001) y el flujo del Donador no la pedía | `linea_comprobante.vence_en`; el Operador la completa al recibir |
| El flujo 6c ponía la conciliación antes del motor, pero el saldo ya incluye las `ENTRADA` desde que el Operador recibe | Conciliar y despachar corren en paralelo; conciliar no retiene mercancía |
| «Esta donación va en este cargamento» —parte de la idea original— no estaba en el modelo, y con un saldo fungible no se puede deducir | Tabla `remision_comprobante`: el Operador vincula folios al despachar, opcional. Sin vínculo, el folio no inventa destino |
| La página pública del folio no mostraba qué se donó — justo lo que el Donador necesita para rendir cuentas | RF-CMP-006 muestra categorías y cantidades confirmadas, sin datos personales |
| RF-CMP-001B (DEBE) dependía de RF-IDE-013 (DEBERÍA), y RF-CMP-001C quedó como única entrada de un folio con prioridad DEBERÍA | Ambos suben a DEBE |
| RF-IDE-013 pedía «una misma transacción» entre Supabase y nuestra base, que son sistemas distintos | Dos pasos con endpoint idempotente, única excepción controlada a RF-IDE-005 |
| El principio de RF-IDE decía «nadie se auto-registra», en contradicción con RF-IDE-013 | Principio con la excepción explícita |
| Un reporte de necesidad append-only no tenía cómo retirarse | `reporte_necesidad.resuelta` |
| La nota del Receptor al recibir no tenía dónde guardarse | `remision.nota_recepcion` |
| El historial del Donador (RF-CMP-008) no tenía pantalla | P13 «Mi cuenta de Donador» |
| El flujo 4 aún describía la recepción con conteo por categoría | Alineado a RF-MOT-009: botón «Recibido» + foto |
| Sin señal en el acopio, el Operador no puede consultar el folio | Entrada normal offline; el Auditor vincula el folio después |
| Folio secuencial: se podían recorrer todas las donaciones probando números | Sufijo aleatorio, no secuencial |

**Por qué:** ninguno cambia la idea de los flujos; todos son condiciones para poder
construirlos. Los valores iniciales —7 días de vigencia, 5 donaciones preparadas a
la vez— son supuestos para ajustar con el equipo. Queda por decidir a quién se le
asigna la pantalla P13 en el reparto de la especificación.
**Estado:** RESUELTO el 2026-09-28 — confirmados los valores: **7 días** de vigencia
de una donación `PREPARADO` y **5** donaciones preparadas a la vez por Donador. Tocó `RF-CMP-001B/001C/003/004/005/006/007`, `RF-IDE-013`,
`RF-CAT-004`, `RF-MOT-008/009/011`,
[modelo-datos.md](../02-arquitectura/modelo-datos.md),
[flujos.md](../03-diseno/flujos.md) (4, 5, 6a, 6b, 6c),
`superpowers/specs/2026-08-20-acopio-design.md` (§5, §8, P10, P13),
`00-contexto/glosario.md` y `02-arquitectura/vista-general.md` (C4 con Donador).

**Nota de alcance:** Bloque 3, adelantado. No bloquea el Avance 3.

### P-019 · Cuatro situaciones validadas en la propuesta del Donador
**Fecha:** 2026-09-12 · **Propuesto por:** Joseph, validación de la propuesta con
el equipo, a partir de las situaciones planteadas en P-018
**Qué:** cuatro huecos quedaron resueltos así:

| Situación | Resolución |
|---|---|
| Contradicción con [ADR-0003](../02-arquitectura/adr/ADR-0003-rol-global-alcance-multiple.md): «nadie se auto-registra» y su enum sin `DONADOR` | [ADR-0007](../02-arquitectura/adr/ADR-0007-donador-excepcion-rol.md): acota ADR-0003 para los 4 roles internos, sin reabrirlo. Enum corregido en todo el vault |
| Recibir en un acopio distinto al elegido, sin revalidar «no recibir» | Se adelanta la ayuda: al terminar de escanear, el sistema sugiere acopios y avisa qué línea no aceptaría cada uno (RF-CMP-001D), antes de elegir. Si aun así termina en otro, se revisa de nuevo al recibir (RF-CMP-001C) |
| Entidad que caduca deja causas publicadas colgando, o las causas nunca rotan | `causa` gana `archivada`: no se despublica, sale del carrusel y del listado principal, queda visible en un filtro de «causas atendidas» (RF-RED-010). Se archiva sola por duración propia o por caducidad de la entidad, o el Administrador la archiva a mano |
| Varios camiones, distintos destinos, sin trazabilidad exacta garantizada | Aceptado como riesgo: la donación **se cierra para el Donador al conciliarse** (RF-CMP-004), no al llegar a una zona. El despacho es de mejor esfuerzo: `remision.zona_destino_id` ahora admite **despacho general** sin zona fija; quien recibe la asigna al confirmar. Cuenta agregada de «en tránsito» y «recibidas» en transparencia (RF-HOM-004) |
| Múltiples emergencias activas, acopio de otra emergencia | Validado que no aplica: [RF-CAT-005](../01-requerimientos/funcionales/catalogo.md) ya limita a **una emergencia activa a la vez**. El destino de un despacho lo declara quien lo formaliza (el Operador, al despachar), no el Donador. **Corregido el 2026-09-14 ([P-024](#p-024--varias-emergencias-activas-el-acopio-no-pertenece-a-ninguna)):** pueden estar activas varias, pero el acopio no pertenece a ninguna, así que el caso sigue sin existir |

**Por qué:** los dos primeros evitan que la donación llegue a un lugar que no la
va a aceptar. El tercero le da rotación a la portada sin borrar la rendición de
cuentas de una campaña anterior. El cuarto acepta una limitación real de la
operación —no siempre se sabe qué camión lleva qué— en vez de modelar una
trazabilidad perfecta que no se puede sostener en la práctica.
**Estado:** RESUELTO → `ADR-0007` (nuevo), nota en `ADR-0003`, spec (§6, §8),
`RF-CMP-001B/001C/006/007`, `RF-CMP-001D` (nuevo), `RF-MOT-008/009`, `RF-RED-003/006/007/008`,
`RF-RED-010` (nuevo), `RF-HOM-003/004`,
[modelo-datos.md](../02-arquitectura/modelo-datos.md) (`causa`, `remision`,
`remision_comprobante`), [flujos.md](../03-diseno/flujos.md) (4, 6a, 6b, 6c),
`00-contexto/glosario.md`.

**Nota de alcance:** Bloque 3, adelantado. No bloquea el Avance 3.

### P-020 · Barrido de consistencia tras P-016 a P-019
**Fecha:** 2026-09-12 · **Propuesto por:** Joseph, revisión completa del vault
**Qué:** una pasada archivo por archivo buscando lo que quedó desfasado después de
las decisiones del Donador, la custodia y el despacho general.

| Encontrado | Corrección |
|---|---|
| RNF-08/09 hablaban de «subir un comprobante» y no limitaban el auto-registro | Consentimiento al registrarse como Donador; límite de intentos en el registro |
| El flujo 4 decía que la recepción «cierra la cadena de custodia»; la fricción de C13 exigía escanear el QR | Alineados a P-019 (cierre al conciliar) y a RF-MOT-009 (QR opcional) |
| La spec §6 tenía `username NOT NULL` y el guard sin la excepción del Donador; §11 aún mostraba nginx como proxy de producción | Corregidos; producción apunta a Traefik/Dokploy |
| RF-HOM-003 decía «carrusel de causas», contradiciendo RF-HOM-001 (introducido en P-019) | Vuelve a «carrusel de entidades»; una causa archivada deja de destacarse |
| La matriz de acceso (RF-IDE-011) se llenaría de Donadores; RF-IDE-004 no aclaraba cómo entra el Donador | Donadores en un listado aparte; RF-IDE-004 remite a RF-IDE-013 |
| Cerrar un acopio dejaba sin aviso a los folios `PREPARADO` hacia él | Aviso por correo: el folio sirve en otro acopio (RF-RED-001) |
| Módulos del backend, runbook, issue 5 y glosario sin las piezas nuevas | Actualizados |
| Diagrama ER: `EMERGENCIA` no aparecía completa en ningún clúster aunque las cajas livianas remitían a «Raíz y catálogo» | Dibujada completa en su clúster, y enlazada a `MOVIMIENTO` |
| Diagrama ER: faltaban atributos que gobiernan reglas | `movimiento.vence_en/motivo`, `entidad.vence_en`, `causa.vigente_hasta`, `jornada.cupos_ajuste_manual` |
| Modelo sin dos restricciones expresables en el esquema | `CHECK` de remisión `RECIBIDA` con zona y de causa archivada con fecha; riesgos aceptados de P-019 en la spec §12 |

**Por qué:** cada decisión nueva deja copias viejas en otros archivos; sin un
barrido, el documento termina contradiciéndose a sí mismo.
**Estado:** RESUELTO. Los dos criterios nuevos —aviso por correo al cerrar un acopio
y listado aparte de Donadores— quedan confirmados el 2026-09-28.

### P-021 · Lovable sale; los mockups se hacen en Claude Design
**Fecha:** 2026-09-14 · **Propuesto por:** Joseph
**Qué:** la interfaz ya no se genera con Lovable. Las pantallas se diseñan como
mockups en Claude Design y el equipo las implementa a mano en React con TypeScript
y Tailwind.
**Por qué:** Claude Design ya es la herramienta en uso (lienzo base del
2026-09-13), crea mockups con mucho menor consumo de tokens, y su resultado pasa
directo a Tailwind. Lovable obligaba a sustituir su capa de datos de Supabase en
cada regeneración.
**Estado:** RESUELTO → [ADR-0009](../02-arquitectura/adr/ADR-0009-mockups-claude-design.md),
que reemplaza a ADR-0004. Confirmado en la tabla de decisión de ADR-0008 el
2026-09-14; la revisión de Brayan, responsable de UI/UX, sigue en
[#7](https://github.com/Proyecto-IngSoftware/acopio/issues/7). **2026-10-06:** se barrieron las menciones a Lovable de la documentación vigente y se
borraron `prompts-lovable/` y su plantilla. Quedan en los ADR 0001, 0004, 0009 y 0011 y en
los avances entregados, que son registros históricos. Desde ADR-0011 la interfaz se
diseña en Google Stitch.

### P-022 · Importar automáticamente los acopios de RedAcopio Bogotá
**Fecha:** 2026-09-14 · **Propuesto por:** Joseph
**Qué:** el mapa trae de forma automática, cada 60 minutos, los puntos de
redacopiobogota.com. Entran como acopios **referenciados**: se muestran con los
datos de su fuente, pero no operan inventario en Acopio.
**Por qué:** la fuente tiene 88 puntos verificados y mantenidos por la comunidad;
cargarlos a mano duplica ese trabajo y envejece rápido.
**Riesgo aceptado:** la fuente no tiene API pública ni licencia de reutilización
([I-003](../00-contexto/investigaciones.md)). El importador lee el JSON que la
página incrusta en su HTML: se rompe si cambian el formato, y no hay autorización
expresa del operador. Se descartó esperar permiso antes de construirlo. Salvaguardas:
User-Agent identificable con contacto, una lectura por hora, atribución visible con
enlace a la fuente, prueba automática contra una copia guardada de su HTML, aborto
completo si el formato cambia, y carga por CSV como respaldo. **Recomendado, sin
bloquear:** escribir al operador para pedir autorización o un endpoint.
**Estado:** RESUELTO → [RF-RED-011](funcionales/red.md), RF-RED-002/003,
[modelo-datos.md](../02-arquitectura/modelo-datos.md) (`acopio.tipo`, `fuente`,
`fuente_id`), [vista-general.md](../02-arquitectura/vista-general.md) (módulo
`importacion`), [ADR-0008](../02-arquitectura/adr/ADR-0008-arquitectura-stack-inicial.md).
Confirmado en ADR-0008 el 2026-09-14.

### P-023 · Validación de la modularidad del backend
**Fecha:** 2026-09-14 · **Propuesto por:** Joseph
**Qué:** se confirma el monolito modular, **sin microservicios**, y se corrigen
cuatro huecos: módulo transversal `notificaciones` para el correo, `almacenamiento`
sale de `comprobantes` a módulo propio, módulo `importacion` para fuentes externas,
y tareas programadas dentro del proceso con `@nestjs/schedule`.
**Por qué:** el correo lo necesitaban cuatro módulos sin dueño; el almacenamiento
dentro de `comprobantes` obligaba a `motor` a depender de él por una foto; nadie
ejecutaba los vencimientos y archivados automáticos. Ninguna pieza justifica un
servicio aparte: el motor calcula 2.000 celdas en milisegundos.
**Estado:** RESUELTO → [vista-general.md](../02-arquitectura/vista-general.md),
[ADR-0008](../02-arquitectura/adr/ADR-0008-arquitectura-stack-inicial.md). Quedan
11 módulos.

### P-024 · Varias emergencias activas; el acopio no pertenece a ninguna
**Fecha:** 2026-09-14 · **Propuesto por:** Joseph
**Qué:** pueden estar activas varias emergencias a la vez. La emergencia pertenece a
la zona afectada; acopios, entidades y movimientos no pertenecen a ninguna, y las
causas se ligan a una de forma opcional. Al crearla se programa hasta cuándo se
destaca; al pasar esa fecha baja a *en seguimiento* en el portal, pero el motor la
sigue atendiendo igual. Cerrarla es manual.
**Por qué:** un mismo centro de acopio atiende varias emergencias al mismo tiempo —el
caso de la Cruz Roja que planteó el equipo—, y quien entrega no decide a cuál va su
donación. Además, el diseño de la portada ya asumía varias. Bajar la prioridad solo en
la vitrina evita que el reparto siga a la visibilidad en vez de a la necesidad.
**Fuente (2026-10-06):** el protocolo de la ANDI de 2019, que respalda que el acopio
destina las donaciones a donde se necesitan. Joseph decidió usarlo y no buscar otra
fuente; la parte multiemergencia queda como deducción del equipo
([I-005](../00-contexto/investigaciones.md#i-005--un-centro-de-acopio-atiende-varias-emergencias-a-la-vez)).
**Estado:** RESUELTO → [ADR-0010](../02-arquitectura/adr/ADR-0010-varias-emergencias-activas.md),
`RF-CAT-005` (reescrito), `RF-CAT-006`, `RF-MOT-001/002/005`, `RF-HOM-001`,
[modelo-datos.md](../02-arquitectura/modelo-datos.md), nota en `ADR-0008`, `B-08`
promovido, corrección en P-019. Los diagramas ER se regeneraron el 2026-10-06.

### P-025 · Login local mientras el desarrollo sea local
**Fecha:** 2026-09-28 · **Propuesto por:** Joseph
**Qué:** mientras se trabaja en local, el inicio de sesión lo resuelve la propia API,
con la estructura lista para pasar a Supabase Auth en la nube (plan gratuito, cómputo
*Nano*). Supabase sigue siendo solo lo que dice ADR-0001: iniciar sesión, confirmar el
correo y enviar esos correos.
**Por qué:** que no haga falta un proyecto de Supabase configurado para empezar el
Bloque 0.
**Cómo queda estructurado:**
- Un puerto de proveedor de identidad con dos adaptadores, `local` y `supabase`,
  elegidos con `AUTH_PROVEEDOR`. La API no arranca con `local` si `NODE_ENV=production`
- El adaptador local firma el JWT con RS256 y publica sus llaves en un endpoint JWKS
  con la forma del de Supabase, con los mismos claims (`sub`, `email`). El guard de
  RF-IDE-005 valida contra `SUPABASE_JWKS_URL` sin saber quién la sirve
- Contraseñas con bcrypt, el formato de Supabase, para importar los usuarios sin
  pedirles una contraseña nueva. Identificadores UUID, que se conservan al importar
- Los correos de confirmación y de restablecer contraseña salen por el SMTP de la API
  y en desarrollo los atrapa Mailpit
- Migrar es: crear el proyecto de Supabase, configurarlo según
  [despliegue.md](../06-operacion/despliegue.md#configuración-de-supabase), importar
  los usuarios y cambiar `AUTH_PROVEEDOR=supabase`
**Estado:** RESUELTO → validado contra el proceso ya aceptado en
[ADR-0001](../02-arquitectura/adr/ADR-0001-supabase-solo-auth.md): no lo cambia, solo
aplaza su configuración. Detalle en
[despliegue.md](../06-operacion/despliegue.md#autenticación-en-desarrollo). Se prueba
en el spike [#19](https://github.com/Proyecto-IngSoftware/acopio/issues/19); allí se
confirma que Supabase acepta importar el hash bcrypt.

### P-026 · El frontend se trabaja con Google Stitch
**Fecha:** 2026-09-28 · **Propuesto por:** Joseph
**Qué:** las pantallas se diseñan en Google Stitch, que también genera su código de
interfaz. Reemplaza a Claude Design.
**Por qué:** diseño y primer código de cada pantalla en un solo paso.
**Estado:** RESUELTO → [ADR-0011](../02-arquitectura/adr/ADR-0011-interfaz-con-stitch.md),
que reemplaza a ADR-0009. El código de Stitch es punto de partida: se adapta a tokens,
componentes y al [contrato de la API](../03-diseno/api/README.md) antes de entrar al
repositorio.

### P-027 · MinIO dejó de publicar imágenes de Docker
**Fecha:** 2026-09-28 · **Propuesto por:** Claude, al armar el Compose del Bloque 0
**Qué:** MinIO retiró `minio/minio` de Docker Hub y archivó la edición comunitaria;
quay.io conserva una copia congelada, sin actualizaciones de seguridad. El Compose
apunta hoy a `quay.io/minio/minio:latest`.
**Por qué:** ADR-0008 elige MinIO para facturas y evidencias. Un almacenamiento sin
mantenimiento que guarda datos personales (Ley 1581) no es sostenible.
**Estado:** RESUELTO el 2026-09-28 →
[ADR-0012](../02-arquitectura/adr/ADR-0012-almacenamiento-garage.md): **Garage**, en un
solo nodo, en el mismo Compose. Se evaluaron SeaweedFS (plan B, si la retención de
P-006 exige más reglas de ciclo de vida), RustFS (joven), la copia congelada o un fork
de MinIO (sin mantenimiento), el disco detrás de la API (pierde S3) y servicios en la
nube (datos fuera del país). Verificado con el SDK de AWS: subida con la llave de la
API, URL firmada vigente (200), sin firma (403), con otra llave (403) y vencida (400).
Actualizados el Compose, `.env.example`, despliegue, runbook, vista general, modelo de
datos, RNF-08, RF de comprobantes y los diagramas. El respaldo de archivos pasa a
`rclone sync` por la API de S3.
- MinIO fuera de Docker Hub — <https://github.com/milvus-io/milvus/issues/53430> — consultado 2026-09-28
- Copia en quay.io, congelada — <https://byteiota.com/minio-docker-hub-quay-anonymous-pull-fix/> — consultado 2026-09-28

### P-028 · Ajustes al construir el backend del Bloque 0
**Fecha:** 2026-09-28 · **Propuesto por:** Claude, al implementar
**Qué:** decisiones de detalle que aparecieron al programar. Ninguna cambia una
decisión de arquitectura.

| Qué | Por qué |
|---|---|
| El login recibe el nombre de usuario y la API lo resuelve a su correo; no hay endpoint público que lo revele (RF-IDE-004) | Un endpoint menos que proteger, y el correo no sale hacia el navegador |
| El Administrador puede crearse sin ubicaciones (RF-IDE-001) | Tiene alcance global (actores.md) |
| `usuario.tokens_validos_desde` | Al canjear un restablecimiento, las sesiones anteriores dejan de servir (RF-IDE-009) sin depender del proveedor |
| Con el adaptador local, el guard lee las llaves en proceso, no por HTTP | Son las mismas que publica el JWKS; evita que la API se llame a sí misma |
| Cada servicio escribe su propio registro de bitácora en la misma transacción, en vez de un interceptor | El registro se revierte si la escritura se revierte, y lleva los datos de antes y después |
| Suspender o cambiar el rol bloquea antes a todos los administradores activos, en orden | Dos administradores que se suspenden a la vez producían un interbloqueo; ahora uno gana y el sistema conserva un administrador |
| El Auditor consulta toda la bitácora, no solo la de sus ubicaciones | Para confirmar: la matriz de actores limita su alcance a sus ubicaciones |
| NestJS 11 y Prisma 7.10, no las últimas | NestJS 12 es solo ESM y su ecosistema no lo acompaña; la última de Prisma es una versión candidata |

**Estado:** RESUELTO → [especificación del Bloque 0](../superpowers/specs/2026-09-28-bloque-0-cimientos-design.md#11-cambios-al-construir),
RF-IDE-001, 003 y 004. Queda por confirmar el alcance del Auditor sobre la bitácora.

### P-029 · Decisiones al arrancar la interfaz
**Fecha:** 2026-09-30 · **Propuesto por:** Joseph
**Qué:** lo que se fijó para el primer ciclo de la interfaz.

| Qué | Por qué |
|---|---|
| El primer ciclo es la Portada pública (P01) con los cimientos de `apps/web`; usuarios y consola van después | La Portada ya está diseñada en Stitch y es la pantalla que ve todo el mundo |
| Los bloques de la Portada sin backend muestran un estado vacío | ADR-0011 no admite datos de ejemplo incrustados |
| ~~Manda la paleta del sistema de diseño; el tema del proyecto en Stitch se corrige~~ **Cambiado el mismo día: manda el diseño de Stitch.** | Joseph vio la Portada con la paleta de la bóveda y no le gustó; el tema de Stitch («Acopio Field Command») resuelve mejor el color y la experiencia. Alineados `sistema-diseno.md` y ADR-0006 con [ADR-0013](../02-arquitectura/adr/ADR-0013-estetica-desde-stitch.md). Queda por aprobar la escala de estados, que separa Crítico de Urgente |
| `GET /api/emergencias` se puede leer sin sesión | La Portada es pública y necesita las emergencias activas |
| Las pruebas de `apps/web` corren con Vitest; Jest sigue en la API y en `packages/shared` | Vitest usa la configuración de Vite. Ajusta la fila «Pruebas previstas» de ADR-0008 solo para la web |

**Abierto:** RF-HOM-001 pide que el hero se lea sin JavaScript. Una SPA no lo cumple
sin una página estática aparte. Falta decidir si se relaja el criterio o se genera esa
página al construir.
**Estado:** RESUELTO → [especificación del ciclo 1 de la interfaz](../superpowers/specs/2026-09-30-interfaz-ciclo-1-portada-design.md),
salvo el punto abierto.

### P-030 · Piezas compartidas entre pantallas
**Fecha:** 2026-09-30 · **Propuesto por:** Joseph
**Qué:** tres cabeceras (pública, de acceso y con sesión) y una sola barra inferior para
todos. Con sesión, el inicio sigue siendo la Portada; las herramientas de cada rol se
abren desde «Más».
**Por qué:** las pantallas de Stitch traían cabeceras y barras distintas entre sí.
**Estado:** RESUELTO → [stitch/_compartidos](../03-diseno/stitch/_compartidos/README.md),
[sistema-diseno.md §6](../03-diseno/sistema-diseno.md#navegación). Cambia lo que decía
§6: antes la consola tenía su propia barra con inventario, entrada rápida, pendientes y
más.

### P-031 · El contrato exporta los campos nullable como arreglos
**Fecha:** 2026-09-30 · **Propuesto por:** Claude, al construir el ciclo 2 de la interfaz
**Qué:** en `openapi.json`, `username` de `YoDto` y `SesionDto` sale como
`{ "type": "array", "items": { "type": "string" } }`, aunque en la API es
`z.string().nullable()` y la respuesta real es un texto o `null`. Lo mismo pasa con
`motivoCierre` de `EmergenciaDto`.
**Por qué:** los tipos que genera la web quedan mal, y hoy `cliente-auth.ts` los
convierte a mano (`as unknown as`).
**Estado:** ABIERTO. Revisar cómo exporta nestjs-zod los campos nullable y corregir el
contrato en la API.
**Avance 2026-09-30:** en el Bloque 1 pasa lo mismo con los campos opcionales nuevos
(`telefono`, `indicacionesAcceso` de acopio y los de entidad).

### P-032 · Todo en local hasta el mínimo viable
**Fecha:** 2026-09-30 · **Propuesto por:** Joseph
**Qué:** el proyecto corre solo en local, con el Compose de desarrollo, hasta tener un
mínimo viable. El Bloque 0 se cierra sin RTA-04: la prueba del correo real por el SMTP
del dominio pasa al primer despliegue, junto con el VPS y el dominio
([#26](https://github.com/Proyecto-IngSoftware/acopio/issues/26)).
**Por qué:** RTA-04 necesita el dominio y el servidor, que todavía no existen. Esperarlos
frenaría el Bloque 1.
**Estado:** RESUELTO → [plan del Bloque 0](../05-planes/2026-09-28-bloque-0-cimientos.md),
[índice de planes](../05-planes/README.md).

### P-033 · Ajustes al especificar el Bloque 1
**Fecha:** 2026-09-30 · **Propuesto por:** Joseph
**Qué:** tres cambios a la bóveda que salieron al especificar la red base y el mapa.

| Qué | Por qué |
|---|---|
| El Operador asignado pausa y reactiva su acopio, y edita el horario, las indicaciones y el teléfono. RF-RED-001 daba todo al Administrador | Quien está en el acopio sabe si se llenó o si cambió el horario. Dónde queda y quién responde por él siguen siendo del Administrador |
| «No recibir» va en su propia tabla, `no_recibir`, con llaves foráneas reales a `acopio` y `categoria`. `modelo-datos.md` lo tenía como columnas de `umbral` | Los umbrales llegan en el Bloque 2 y también aplican a zonas, donde «no recibir» no tiene sentido |
| Pantalla nueva C21 Acopios, para crear y editar acopios | El catálogo de pantallas no tenía dónde gestionarlos |

**Estado:** RESUELTO → [especificación del Bloque 1](../superpowers/specs/2026-09-30-bloque-1-red-design.md#3-decisiones).
RF-RED-001, `modelo-datos.md` y el catálogo de pantallas quedaron al día el 2026-09-30.

### P-034 · Menores de la revisión final de la API del Bloque 1
**Fecha:** 2026-09-30 · **Propuesto por:** revisión final del plan de la API
**Qué:** nueve detalles que la revisión dejó como menores y que no se arreglaron:
- `GeocodificadorNominatim` lee el cuerpo fuera del `try`: una respuesta que no es JSON
  termina en 500, no en 503
- «No recibir» revisa el acopio y la categoría fuera de la transacción
- `GET /acopios/:id/no-recibir` responde para un acopio cerrado o inexistente; la ficha
  da 404
- Un PATCH vacío deja un registro en la bitácora que no cambia nada
- `sitioWeb` de entidad acepta cualquier esquema, incluso `javascript:`; se mostrará como
  enlace público
- `engines` dice `>=22`, pero `require` de ESM sin bandera pide Node 22.12
- `GET /ubicaciones/mias` carga todas las ubicaciones y filtra en memoria
- `poblacionFecha` sale con hora y `hasta` sin hora
- `no_recibir.marcado_por` no tiene llave foránea a `usuario`

**Por qué:** ninguno rompe el recorrido de hoy, pero conviene cerrarlos antes de desplegar.
**Estado:** ABIERTO.

### P-035 · La pantalla P5 de Stitch todavía muestra el filtro viejo
**Fecha:** 2026-10-01 · **Propuesto por:** Joseph
**Qué:** Joseph aprobó el 2026-10-01 el filtro «¿Qué vas a llevar?» de P5. Oculta los
acopios que no reciben la categoría elegida y dice cuántos ocultó. La pantalla de Stitch
y su `pantalla.html` siguen con la píldora «No recibe: Ropa». Falta corregirla en Stitch,
exportarla de nuevo y reemplazar la captura.
**Por qué:** el diseño de Stitch es la referencia (ADR-0013). Mientras muestre el filtro
viejo, quien lo tome como base puede volver a construir lo contrario de lo que pide
RF-RED-002.
**Estado:** ABIERTO, deuda importante. La diferencia ya quedó en la
[nota de P5](../03-diseno/stitch/P05-mapa/README.md).

### P-036 · Decisiones al especificar el Bloque 2
**Fecha:** 2026-10-01 · **Propuesto por:** Joseph
**Qué:** el alcance y los ajustes a la bóveda que salieron al especificar el inventario.

| Qué | Por qué |
|---|---|
| Entran el escáner (con RF-CAT-004) y la captura sin conexión; la alerta de vencimiento (RF-INV-010) queda fuera del bloque | La alerta pide saldo por lote, y el saldo es por categoría (V-02) |
| El saldo vive en una tabla mantenida por disparador, no en una vista materializada | PostgreSQL no refresca una vista materializada por fila. [ADR-0015](../02-arquitectura/adr/ADR-0015-saldo-en-tabla-por-disparador.md) |
| Sin umbral configurado, la categoría dice «Sin umbral» | Un acopio no tiene población y la canasta no da un mínimo. Ajusta RF-INV-007 |
| Las salidas sin remisión eligen motivo de una lista corta | Se pueden contar y filtrar. Ajusta RF-INV-003 |
| Service worker con `vite-plugin-pwa`; sin conexión solo entradas | [ADR-0016](../02-arquitectura/adr/ADR-0016-service-worker-con-vite-plugin-pwa.md) |

**Estado:** RESUELTO → [especificación del Bloque 2](../superpowers/specs/2026-10-01-bloque-2-inventario-design.md#3-decisiones).
RF-INV-010 sigue abierto para un bloque posterior.

### P-037 · Probar el escáner con un teléfono y un código real
**Fecha:** 2026-10-02 · **Propuesto por:** Joseph
**Qué:** leer un EAN impreso con la cámara trasera de un teléfono, en C4, C5 y C6.
**Por qué:** el recorrido del cierre del ciclo 2 usó la cámara falsa de Chromium: la vista
abre y se cierra bien, pero ninguna prueba leyó un código de verdad. Falta ver cuánto tarda
`@zxing/browser` en reconocerlo, si enfoca a la distancia de una caja y cómo se porta con
poca luz.
**Estado:** ABIERTO. Se hace cuando la web se pueda abrir desde un teléfono (HTTPS o la red
local con permiso de cámara).

### P-038 · Menores de la revisión final del ciclo 2 del Bloque 2
**Fecha:** 2026-10-02 · **Propuesto por:** Joseph
**Qué:** lo que la revisión del ciclo 2 encontró y no se arregló en la misma pasada.

| Qué | Dónde |
|---|---|
| Elegir otra categoría en C4 no limpia la fecha de vencimiento: la de un perecedero pasa al siguiente | `EntradaRapida.tsx`, `elegir` |
| La nota de una salida no tiene `maxLength` 280 en el campo; la API la limita y responde 400 | `Salida.tsx` |
| Dos escaneos seguidos pueden elegir dos veces: no hay un estado «buscando» que bloquee «Escanear» | `BuscadorCategoria.tsx` |
| Si otra persona asoció el código mientras tanto, el 409 en «Código nuevo» no ofrece salida; convendría volver a consultarlo | `Escaner.tsx` |
| `GET /codigos-barras/:ean` le muestra al Operador quién asoció el código y hace una consulta más por escaneo | `codigos-barras.service.ts`, `obtener` |
| Guardar sin cambios en C18 manda un `PATCH` vacío y deja una fila en la bitácora | `PestanaCodigos.tsx` |
| C4 pide teclado decimal también en categorías por unidades; C5 y C6 piden el numérico | `EntradaRapida.tsx` |

**Estado:** ABIERTO. Ninguno rompe un flujo; se toman cuando se vuelva a tocar el archivo.
El 2026-10-05, en la tarea 5 del ciclo 3 (O-10), se resolvieron dos: la fecha que pasaba a
la categoría siguiente y el teclado decimal en unidades. Los otros cinco siguen abiertos.

### P-039 · Los íconos se ven como texto mientras baja su fuente
**Fecha:** 2026-10-05 · **Propuesto por:** Joseph
**Qué:** en la primera carga, durante unos 400 ms, Material Symbols todavía no llega y cada
ícono se dibuja con su nombre (`chevron_right`). En la portada, a 360 px, eso lleva el ancho
a 401 px y hay desplazamiento horizontal hasta que la fuente carga.
**Por qué:** lo encontró el recorrido de humo del 2026-10-05. Las revisiones de los cierres
anteriores medían el ancho después de cargar la fuente, así que no lo veían. Se podría fijar
el ancho de los íconos en `1em` con `overflow: hidden`, o precargar la fuente.
**Estado:** ABIERTO.

### P-040 · Un tercero puede registrar el correo de otra persona
**Fecha:** 2026-10-05 · **Propuesto por:** Joseph
**Qué:** el registro del Donador fija la contraseña antes de confirmar el correo. Alguien
puede registrar el correo de otra persona con una contraseña suya, y cuando la dueña
confirme con el enlace, la cuenta queda activa con esa contraseña ajena. La respuesta
uniforme (RF-IDE-013) oculta qué correos existen, pero no cierra este caso.
**Por qué:** lo vio la revisión del Bloque 3. Una mitigación posible es que la contraseña
se defina al confirmar: el registro solo recibe correo y nombre, y el enlace lleva a un
formulario donde la dueña elige su contraseña.
**Resuelto el 2026-10-06:** el registro pide solo nombre y correo y deja al Donador `INVITADO`,
sin credencial. La contraseña se elige al confirmar con el enlace, y esa confirmación inicia la
sesión. Quien registra un correo ajeno no fija ninguna contraseña.
**Estado:** RESUELTO el 2026-10-06 → [RF-IDE-013](funcionales/identidad.md#rf-ide-013--auto-registro-de-donador).

### P-041 · Las URL firmadas de la factura traen el host interno de Garage
**Fecha:** 2026-10-05 · **Propuesto por:** Joseph
**Qué:** la API firmaba las URL con `S3_ENDPOINT`, que en el Compose es `http://storage:3900`.
Un navegador no resuelve ese nombre. El recorrido con curl tuvo que redirigir el host con
`--connect-to`.
**Por qué:** lo encontró el recorrido de cierre del Bloque 3. Las pruebas usan
`AlmacenMemoria` y no lo ven.
**Resuelto en desarrollo (2026-10-06):** `S3_URL_PUBLICA` es opcional. Si existe, un segundo
cliente S3 firma con ese host, porque SigV4 firma el Host y la URL no se puede reescribir
después. `docker-compose.dev.yml` la fija en `http://localhost:3900`. Con la API en el Compose,
una URL firmada se bajó con curl desde el anfitrión, sin `--connect-to`: 200 e `image/webp`.
**Sigue abierto:** en producción Garage tiene que ser alcanzable por una ruta pública, y eso
choca con «El almacenamiento nunca se expone» de [vista-general](../02-arquitectura/vista-general.md).
Hay que decidir entre exponer solo la ruta de lectura de Garage o un proxy en la API, y
registrarlo en un ADR.
**Resuelto el 2026-10-06:** Joseph eligió que la API entregue la imagen. Garage no se
publica en ningún entorno ([ADR-0017](../02-arquitectura/adr/ADR-0017-factura-servida-por-la-api.md)).
El cambio de código va en [#26](https://github.com/Proyecto-IngSoftware/acopio/issues/26),
antes del primer despliegue.
**Estado:** RESUELTO el 2026-10-06 (decisión; falta el código).

### P-042 · Correo de contacto para los datos personales
**Fecha:** 2026-10-06 · **Propuesto por:** Joseph
**Qué:** P12 (Privacidad) tiene que decir a qué correo escribir para conocer, actualizar o
borrar los datos (Ley 1581 de 2012). El proyecto todavía no tiene uno. El diseño de Stitch
traía `privacidad@acopio.co`, que no existe.
**Por qué:** salió al aprobar la maqueta del ciclo 1 del Bloque 3. Mientras no haya correo, la
web lo lee de una sola constante y P12 muestra el texto sin dirección.
**Resuelto el 2026-10-06:** Joseph decidió usar correos y datos de maqueta. P12 muestra
`contact@acopio.co` (`apps/web/src/portal/contacto.ts`). El primer administrador del seed es
`admin@acopio.co` (`SEED_ADMIN_CORREO` en `.env.example`). Las cuentas por rol de `seed:demo`
llevan el correo de un integrante: `joseph@acopio.co` (operador1), `brayan@acopio.co`
(operador2), `michael@acopio.co` (auditor1) y `alejandra@acopio.co` (receptor1). Ninguno es un
buzón real. Si el proyecto llega a tener uno, se cambia la constante y la variable.
**Estado:** RESUELTO el 2026-10-06.

---

### P-043 · Pantalla del simulador del motor
**Fecha:** 2026-10-06 · **Propuesto por:** Joseph
**Qué:** una pantalla de la consola que corra el simulador de RF-MOT-010 con parámetros
editables y muestre la comparación contra el reparto igualitario y por cercanía.
**Por qué:** en el Bloque 4 el simulador es un script con semilla que escribe un informe en
la bóveda (M-08): es reproducible y basta para la sustentación. Una pantalla luce en vivo,
pero necesita diseño en Stitch. Como el cálculo vive en `packages/shared`, se puede agregar
sin tocarlo.
**Estado:** ABIERTO

---

### P-044 · Estado automático de una zona
**Fecha:** 2026-10-06 · **Propuesto por:** Joseph
**Qué:** derivar `zona.estado` (`SIN_ATENDER`, `EN_ATENCION`, `CUBIERTA`) de la cobertura
calculada por el motor, en vez de que el Administrador lo cambie a mano en C9.
**Por qué:** la cobertura ya se calcula en la ficha de zona. Falta decidir con qué umbral y en
cuántas categorías una zona cuenta como cubierta; la especificación del Bloque 4 lo dejó
fuera para no abrir esa discusión.
**Estado:** ABIERTO

### P-045 · Calendario por semanas, alcance del Sprint 1 y seguimiento semanal
**Fecha:** 2026-10-07 · **Propuesto por:** Joseph
**Qué:** tres decisiones al preparar el Avance 4. Las fechas del curso se cuentan por
semana, con la semana 18 en la del 1 de diciembre; la semana 1 empieza el 3 de agosto
y la tabla está en [calendario.md](../entregas/calendario.md). El Sprint 1 (semanas 8
a 10, del 21 de septiembre al 11 de octubre) abarca lo que se construyó en ese tiempo:
los Bloques 0 a 3 y la etapa 1 de la API del Bloque 4. El ADR-001 lo había limitado al
Bloque 0. El equipo se reúne una vez por semana, el miércoles o el viernes, y esa
reunión cuenta como el «Daily Scrum» de las guías.
**Por qué:** la guía del Avance 4 fecha el sprint por semanas y pide el registro de un
seguimiento con evidencia; el equipo acordó no reunirse a diario.
El seguimiento del Sprint 1 es el viernes 9 de octubre al terminar la clase virtual, en
la misma reunión del primer Planning del Sprint 2.
**Estado:** DECIDIDO. Aplicado en [avance-04-sprint1.md](../entregas/avance-04-sprint1.md)
y en [avance-05-sprint2.md](../entregas/avance-05-sprint2.md)

### P-046 · Historias Must sin plan: causas, verificación de entidades e importador
**Fecha:** 2026-10-07 · **Propuesto por:** Joseph
**Qué:** la revisión del Sprint 1 encontró trabajo comprometido que no tiene plan ni
issue. La especificación del Bloque 1 apartó dos piezas para después: la «C»
(verificación de entidades con documento, causas y su archivado: HU-02 y HU-15) y la
«E» (importador de RedAcopio y carga por CSV: criterio 2 de HU-01). Ninguna quedó en
el orden de construcción ni en un issue. Además, el inventario no atenúa ni advierte
una categoría sin movimientos en más de 6 horas (criterio 2 de HU-05).
**Por qué:** HU-02 y HU-15 son Must y entraron en el Sprint 1; el Sprint Review las
marca «No».
La misma especificación apartó la pieza «D» (contenido del home, páginas legales y Open
Graph), que tampoco tenía issue.
**Estado:** ABIERTO. Desde el 2026-10-07 cada pieza tiene issue y fecha: la C en
[#48](https://github.com/Proyecto-IngSoftware/acopio/issues/48) (hasta el 1 de noviembre),
la E en [#49](https://github.com/Proyecto-IngSoftware/acopio/issues/49) y la D en
[#50](https://github.com/Proyecto-IngSoftware/acopio/issues/50) (hasta el 15 de
noviembre). El criterio 2 de HU-05 quedó en
[#43](https://github.com/Proyecto-IngSoftware/acopio/issues/43). Fechas en el
[cronograma](../05-planes/cronograma.md)

### P-047 · Fechas del segundo corte y de los Sprints 2 y 3
**Fecha:** 2026-10-07 · **Propuesto por:** Joseph
**Qué:** el [cronograma](../05-planes/cronograma.md) supone sprints de tres semanas
(Sprint 2 en las semanas 11 a 13, Sprint 3 en las 14 a 16). Tampoco se sabe cuándo es
la sustentación del segundo corte. La del primero fue en la semana 6; si se repite el
intervalo, la segunda caería en la semana 12, pero ninguna guía lo dice.
**Por qué:** de esas fechas depende qué evidencia tiene que estar lista y cuándo.
**Estado:** RESUELTO el 2026-10-09 → [calendario](../entregas/calendario.md) y
[cronograma](../05-planes/cronograma.md). La guía del
[Avance 5](../talleres/Avance%20de%20Proyecto%205%20–%20IS1.pdf) pone el Sprint 2 en
las semanas 10 a 12 y la sustentación del segundo corte el viernes 23 de octubre. El
Sprint 2 se cierra en la semana 12 y el Sprint 3 empieza en la 13; su duración sigue
siendo un supuesto hasta su consigna. La «validación que se realizará en clase el próximo viernes»
que menciona la guía es la misma sustentación del 23 (confirmado por Joseph); la Review
del Sprint 2 se hace ese día


### P-048 · Los roles no rotan en el Sprint 2
**Fecha:** 2026-10-07 · **Propuesto por:** Joseph
**Qué:** el [Avance 1](../entregas/avance-01-sprint0.md#5-roles-iniciales-y-acuerdos-de-trabajo)
dice que los roles rotan cada sprint y propone a cada integrante un rol posible. En el
Sprint 2 se mantienen los del Sprint 0: Joseph en arquitectura e integración, Brayan en
requerimientos y diseño UI/UX, Alejandra en coordinación y documentación, y Michael en
calidad, pruebas y despliegue. Los responsables del Sprint 1 y del borrador del Sprint 2
siguen esos roles.
**Por qué:** decisión de Joseph del 2026-10-07.
**Estado:** DECIDIDO. Se vuelve a revisar en el Planning del Sprint 3

### P-049 · Cerrar el Avance 4 después de la reunión del 9 de octubre
**Fecha:** 2026-10-07 · **Propuesto por:** Joseph
**Qué:** el Word del Avance 4 está revisado y aprobado por Joseph. Falta lo que sale de
la reunión del viernes 9 de octubre, al terminar la clase virtual de las 6:30 p. m.:
la captura de la reunión (`docs/entregas/evidencia/avance-04/seguimiento.png`), las
filas de Brayan, Alejandra y Michael en la tabla del seguimiento y la retrospectiva
confirmada por el equipo. Con eso se regeneran los Word (`generar-avance-04.py` y
`unificar-avances.py`), se actualiza el índice en Word y se pasa al documento de
OneDrive antes del domingo 11. Si en la clase llega la consigna del Sprint 2, se
ajustan también el calendario, el cronograma, los milestones de las semanas 11 a 13
y el borrador de [avance-05-sprint2.md](../entregas/avance-05-sprint2.md).
**Por qué:** la guía pide la evidencia de un seguimiento del equipo y la
retrospectiva hecha por el equipo; ninguna de las dos se puede escribir sin la reunión.
**Estado:** ABIERTO. Issue [#45](https://github.com/Proyecto-IngSoftware/acopio/issues/45)

### P-050 · El Avance 5 exige DAO aunque el proyecto descartó Repository sobre Prisma
**Fecha:** 2026-10-09 · **Propuesto por:** Joseph
**Qué:** la guía del [Avance 5](../talleres/Avance%20de%20Proyecto%205%20–%20IS1.pdf)
pide DAO de forma obligatoria y aclara que un ORM no basta: hay que mostrar cómo se
encapsula el acceso a datos aunque por dentro se use Prisma. También pide DTO, o una
justificación si no aplican, y al menos dos patrones creacionales, dos estructurales y
uno de comportamiento (el texto dice dos), cada uno con código identificable y con su
beneficio y su complejidad explicados. La
[nota de patrones](../02-arquitectura/patrones-y-practicas.md) descarta hoy «Repository
sobre Prisma» y 28 servicios llaman a `this.prisma` directamente. Los controladores no
consultan la base, salvo `salud`. Adapter, Decorator y Strategy ya están en el código;
los creacionales no están documentados.
**Por qué:** es requisito de la consigna y se evalúa en la sustentación del 23 de
octubre. Cambiar el criterio sobre Repository es una decisión de arquitectura y va en un
ADR nuevo, que dice en qué módulos entran los DAOs y cómo comparten la transacción de
cada servicio con la bitácora y la cola de correo.
**Estado:** EN DISCUSIÓN. La parte de arquitectura quedó en el
[ADR-0019](../02-arquitectura/adr/ADR-0019-dao-sobre-prisma.md), con `inventario`,
`comprobantes` y `salud` migrados a DAO el 2026-10-09. La sección de patrones del
[Avance 5](../entregas/avance-05-sprint2.md#patrones-de-diseño) explica cada uno, y el
Factory Method del proveedor de identidad quedó en su propia función. Falta pasar esa
sección al Word del avance. Issue
[#59](https://github.com/Proyecto-IngSoftware/acopio/issues/59), hasta el 18 de octubre

### P-051 · Evidencia de ramas, pull requests y revisión en el Sprint 2
**Fecha:** 2026-10-09 · **Propuesto por:** Joseph
**Qué:** el Avance 5 pide evidencia de colaboración en GitHub: commits, ramas, pull
requests y revisión de cambios. Hoy, mientras Joseph trabaja solo, los cambios van
directo a `main` sin PR (CLAUDE.md, «Flujo de trabajo»). El borrador del Planning ya
propone que en el Sprint 2 cada cambio entre por un PR que otro integrante revise.
**Por qué:** sin ramas ni PR el repositorio no muestra la evidencia que pide la guía, y
el repositorio tiene que estar público con su enlace en el documento.
**Estado:** RESUELTO el 2026-10-09 → «Flujo de trabajo» de CLAUDE.md. Desde el Sprint 2
cada cambio va en una rama con PR. Joseph lo revisa y lo fusiona cuando el CI pasa; como
GitHub no deja aprobar un PR propio, la revisión queda como comentario. El primero es el
que registra esta decisión


### P-052 · Dos DTO con el mismo nombre se pisan en el contrato
**Fecha:** 2026-10-10 · **Propuesto por:** Joseph
**Qué:** Swagger nombra cada esquema del contrato con el nombre de la clase del DTO. En la
etapa 2 del motor, `RecibirDto` existía en `comprobantes` y en `motor`, y el contrato se
quedó con uno solo: la web dejó de compilar porque la recepción de donaciones perdió sus
campos. Se renombró a `RecibirRemisionDto`, pero nada impide que vuelva a pasar.
**Por qué:** el error no aparece en la API ni en sus pruebas, solo en los tipos de la web,
y en otro caso podría pasar sin que nada compile mal.
**Estado:** ABIERTO. Una prueba unitaria en `apps/api` que busque nombres de clase
`*Dto` repetidos en `src/` o que revise el contrato generado

---

## Resueltos

_Al resolver una entrada, muévela aquí con su destino. No se borran: la historia
de por qué algo no entró vale tanto como lo que entró._
