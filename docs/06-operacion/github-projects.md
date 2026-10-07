---
title: "GitHub — organización y Project"
type: operacion
tags: [operacion]
estado: borrador
actualizado: 2026-10-07
---

# GitHub — organización y Project

Cómo montar la organización de GitHub del equipo y el Project (P-007), y el backlog
inicial listo para copiar en cuanto exista.

**Estado:** el repositorio todavía no existe. Esto se puede montar hoy, sin esperar
al Bloque 0: la organización y el Project no dependen de que haya código.

---

## 1. Por qué una organización y no una cuenta personal

Un repositorio o un Project colgado de la cuenta personal de alguien depende de esa
persona: si pierde acceso, cambia de correo o el equipo rota roles, todo se mueve con
ella. Una **organización** es una cuenta aparte, propiedad del equipo, con sus propios
miembros y su propia facturación (en cero, en el plan gratuito).

## 2. Roles dentro de una organización

| Rol | Qué puede hacer |
|---|---|
| **Owner** | Control total: facturación, borrar la organización, gestionar todos los repos y miembros. Debe haber al menos uno; se recomiendan dos, por si alguien pierde acceso |
| **Member** | Pertenece a la organización, pero solo ve lo que se le asigna explícitamente: un repo, un equipo, un Project |
| **Outside collaborator** | Acceso a un repositorio puntual sin ser miembro de la organización. No aplica aquí: los cuatro son miembros |

Con cuatro personas no hace falta crear *Teams* internos todavía; se invita a cada
quien directamente.

## 3. El plan gratuito alcanza

GitHub Free para organizaciones incluye repositorios públicos y privados ilimitados,
Issues, Projects y Actions con minutos limitados al mes. No incluye SSO ni algunas
protecciones avanzadas de rama, que este proyecto no necesita.

Si alguien del equipo tiene activado el **GitHub Student Developer Pack** (correo
institucional de la ETITC), da beneficios extra, pero no es un requisito para
arrancar hoy.

## 4. Pasos

1. **Crear la organización.** Con sesión iniciada: ícono de perfil → *Settings* →
   *Organizations* (barra lateral, sección *Access*) → **New organization** → plan
   **Free**.
2. **Nombre provisional.** El nombre de la organización no tiene que coincidir con el
   nombre final del producto — todavía en discusión. Se puede renombrar después
   (*Settings* de la organización → *Rename*), aunque cambia la URL, así que mejor
   evitar renombrarla más de una vez. Sugerencia mientras se decide: `acopio-is1`.
3. **Invitar a los tres compañeros como Members.** Pestaña *People* de la
   organización → **Invite member**. Cada quien necesita una cuenta de GitHub, nada
   más — no hace falta que exista un repositorio todavía.
4. **Crear el Project dentro de la organización**, no en la cuenta personal. Pestaña
   *Projects* de la organización → **New project** → plantilla *Table* o *Board*.
5. **Dar acceso al Project.** Si los cuatro ya son *Members* de la organización, en
   *Project → Settings → Manage access* se le puede dar acceso por defecto a **toda
   la organización** en vez de invitar a cada quien por separado.
6. **Cargar el backlog inicial** — sección 5 de esta nota.
7. **Cuando arranque el Bloque 0:** crear el repositorio dentro de la organización
   (dueño = la organización, no una persona), y ahí sí empiezan a importar los
   permisos de repositorio de cada ítem.

## 5. Draft issues: qué son y por qué alcanzan por ahora

Un **draft issue** es una tarjeta de texto que vive solo dentro del Project. No está
ligada a ningún repositorio, así que cualquier persona con acceso al Project la ve y
la edita sin necesitar permiso de repo. Se convierte en un *issue* real —y ahí sí
queda ligada a un repositorio— el día que exista el código al que corresponde.

Es exactamente lo que hace falta ahora: documentar y repartir tareas sin esperar al
Bloque 0.

---

## 6. Cómo se usa hoy

Desde el 2026-10-06 los issues del repositorio son el plan de trabajo del desarrollo.
Hay uno por bloque o ciclo pendiente y uno por cada pendiente técnico de
[pendientes.md](../01-requerimientos/pendientes.md) que pide código:

| Issue | Qué |
|---|---|
| [#34](https://github.com/Proyecto-IngSoftware/acopio/issues/34) | Bloque 3, ciclo 2: Recibir por folio y conciliación en la consola |
| [#35](https://github.com/Proyecto-IngSoftware/acopio/issues/35) | Bloque 4, Motor |
| [#36](https://github.com/Proyecto-IngSoftware/acopio/issues/36) | Bloque 5, Turnos |
| [#37](https://github.com/Proyecto-IngSoftware/acopio/issues/37) | Bloque 6, Extras |
| [#38](https://github.com/Proyecto-IngSoftware/acopio/issues/38) a [#43](https://github.com/Proyecto-IngSoftware/acopio/issues/43) | Deuda técnica: P-031, P-035, P-037, P-039, P-042 y menores de las revisiones |
| [#26](https://github.com/Proyecto-IngSoftware/acopio/issues/26) | Despliegue |
| [#44](https://github.com/Proyecto-IngSoftware/acopio/issues/44) | Registro de lo construido en los Bloques 0 a 3 (cerrado) |

**Etiquetas:** `bloque-3` a `bloque-6` para el trabajo de cada bloque y `deuda` para lo
técnico pendiente, además de las del curso (`avance-2`, `avance-3`, `bóveda`, `diseño`…).

**Ciclo de un issue:** al empezar un bloque o ciclo, su plan en
[05-planes/](../05-planes/README.md) enlaza el issue. Al cerrar cada tarea se marca su
casilla y se comenta qué se probó; al cerrar el ciclo se cierra el issue con el resumen.
Todo issue nuevo se agrega al Project.

**Columnas del tablero.** La guía del Avance 2 pide **Product Backlog · To Do · In
Progress · Review · Done**, que son las opciones del campo «Status».

**Campos y vistas del Project.**

| Qué | Para qué |
|---|---|
| Campo «Status» | Columna del tablero |
| Campo «Sprint» (Sprint 0, 1, 2, 3, Cierre) | Agrupa issues e historias por sprint. Creado el 2026-10-07 |
| Milestones «Semana N · hasta el …» | Fecha máxima de cada issue, según el [cronograma](../05-planes/cronograma.md) |
| [View 1](https://github.com/orgs/Proyecto-IngSoftware/projects/1/views/1) | Tabla con todo |
| [Sprint 1](https://github.com/orgs/Proyecto-IngSoftware/projects/1/views/2) | Board por Status, filtro `sprint:"Sprint 1" is:draft`: solo las historias del Sprint 1. Es la vista de la captura del Avance 4 |
| [Sprint 2](https://github.com/orgs/Proyecto-IngSoftware/projects/1/views/3) | Board por Status, filtro `sprint:"Sprint 2"`: historias e issues del Sprint 2 |

Las historias de usuario son draft issues del Project, una por HU, con su sprint y su
estado. Las vistas se pueden crear desde la web o con la API REST
(`POST /orgs/Proyecto-IngSoftware/projectsV2/1/views`).

El backlog inicial de septiembre (los siete draft issues del Avance 3) ya se convirtió
en issues y se cerró; queda en el historial del repositorio.

## 7. Equipo y asignaciones

| Integrante | Usuario de GitHub | Rol del Sprint 0 |
|---|---|---|
| Joseph | `Josephqaz` | Arquitectura y liderazgo de integración |
| Brayan | `Bij3y` | Análisis de requerimientos y diseño UI/UX |
| Alejandra | `algn1265-code` | Coordinación de Sprint y documentación |
| Michael | `estebangutierrez406-svg` | Calidad, pruebas y despliegue |

Joseph confirmó los usuarios el 2026-10-07. El de Michael no lleva su nombre; es
`estebangutierrez406-svg`.

Cada issue se asigna a quien tiene el rol de esa área, según el
[Avance 1](../entregas/avance-01-sprint0.md#5-roles-iniciales-y-acuerdos-de-trabajo):

| Tipo de issue | Se asigna a |
|---|---|
| Ceremonias del sprint, tablero, revisión de documentos y Word de los avances | Alejandra |
| Calidad, RNF, pruebas, despliegue, deuda de las revisiones | Michael |
| Maquetas en Stitch, accesibilidad, contenido del portal | Brayan |
| API, modelo de datos, contrato e integración de cada bloque | Joseph |
| Interfaz de un bloque con maquetas nuevas | Joseph y Brayan |
| Historias de usuario (draft issues) | Joseph, que construye e integra, y Brayan, que valida los criterios de aceptación |

Los roles no rotan en el Sprint 2 ([P-048](../01-requerimientos/pendientes.md)). Si
rotan más adelante, se cambia esta tabla y se reasignan los issues abiertos.

---

## Relacionado

- [Avance 3 — tablero de faltantes](../entregas/avance-03-arquitectura.md)
- [Pendientes](../01-requerimientos/pendientes.md) — P-005, P-007 a P-012
- [Avance 1 — roles y acuerdos](../entregas/avance-01-sprint0.md#5-roles-iniciales-y-acuerdos-de-trabajo)
