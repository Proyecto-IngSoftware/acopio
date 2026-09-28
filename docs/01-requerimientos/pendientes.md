---
title: "Pendientes — bandeja de entrada"
type: pendientes
tags: [requerimientos, pendientes]
estado: vigente
actualizado: 2026-09-28
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
**Estado:** ABIERTO — bloquea el Bloque 4
**Avance 2026-09-11:** el equipo decidió usar los datos de las fuentes **solo como
referencia**. El Avance 1 cita el Manual Esfera: 15 L de agua segura y 2.100 kcal por
persona al día. Falta la cantidad de referencia del resto de categorías.
`canasta_estandar.fuente` ya obliga a citar cada valor.
**Avance 2026-09-28:** primera versión de la canasta en
[catalogo-inicial.md](catalogo-inicial.md#canasta-estándar--primera-versión). Solo 10
categorías llevan cantidad por persona: agua (15 L, Esfera), jabón y detergente
(Esfera) y siete alimentos que suman 2.100 kcal (Esfera) con productos del kit de la
UNGRD. Las demás quedan fuera del cálculo automático y se mueven por el reporte del
Receptor (P-015), como ya permite RF-CAT-003. Falta confirmar las cifras en la fuente
([I-006](../00-contexto/investigaciones.md#i-006--cantidades-por-persona-para-la-canasta-estándar));
registro en [#20](https://github.com/Proyecto-IngSoftware/acopio/issues/20).

### P-002 · Origen de la población estimada por zona
**Fecha:** 2026-08-20 · **Propuesto por:** equipo
**Qué:** decidir de dónde sale `Zona.poblacion_estimada`: censo DANE, reporte de
la alcaldía, o carga manual del administrador.
**Por qué:** es el otro factor del cálculo de necesidad. Y su antigüedad importa:
la población de una zona cambia con los desplazamientos.
**Estado:** ABIERTO — bloquea el Bloque 4
**Avance 2026-09-11:** las proyecciones de población del DANE 2020-2035 se usan
**solo como referencia**, según decisión del equipo. Falta decidir quién puede
ajustar el valor. `zona.poblacion_fuente` y `zona.poblacion_fecha` ya existen en el
modelo.

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
**Estado:** ABIERTO

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
[#7](https://github.com/Proyecto-IngSoftware/acopio/issues/7). Quedan 15 archivos de la bóveda que aún mencionan Lovable; se
barren después de la entrega.

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
**Pendiente:** una fuente sobre la operación multiemergencia de la Cruz Roja. Las dos
revisadas el 2026-09-14 no la sostienen, pero el protocolo de la ANDI sí respalda que
el acopio destina las donaciones a donde se necesitan
([I-005](../00-contexto/investigaciones.md#i-005--un-centro-de-acopio-atiende-varias-emergencias-a-la-vez)).
**Estado:** RESUELTO → [ADR-0010](../02-arquitectura/adr/ADR-0010-varias-emergencias-activas.md),
`RF-CAT-005` (reescrito), `RF-CAT-006`, `RF-MOT-001/002/005`, `RF-HOM-001`,
[modelo-datos.md](../02-arquitectura/modelo-datos.md), nota en `ADR-0008`, `B-08`
promovido, corrección en P-019. Faltan los diagramas ER regenerados.

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

---

## Resueltos

_Al resolver una entrada, muévela aquí con su destino. No se borran: la historia
de por qué algo no entró vale tanto como lo que entró._
