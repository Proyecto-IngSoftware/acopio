---
title: "Avance 3 — Arquitectura inicial: faltantes y tareas"
type: entrega
tags: [entrega, is1]
estado: borrador
actualizado: 2026-09-12
---

# Avance 3 — Arquitectura inicial: faltantes y tareas

**Guía:** [Avance de Proyecto 3 – IS1](../talleres/Avance%20de%20Proyecto%203%20–%20IS1.pdf)
· Asignado 2026-09-04 · Docente: Juan Pablo Bustamante Moreno

| Fecha | Qué pasa |
|---|---|
| 2026-09-11 | Sustentación del primer corte, en horario de clase |
| **2026-09-14** | **Plazo para completar o corregir los entregables** |

**Dónde se entrega:** en el mismo Word de OneDrive del proyecto, después del Avance 2.
No se crea un archivo nuevo. El avance no se califica aparte: es evidencia de la
sustentación.

> Esta nota es el tablero de trabajo del avance, no el entregable. El texto final va
> al Word. Las decisiones abiertas viven en [pendientes.md](../01-requerimientos/pendientes.md).

**2026-09-12 · Joseph decidió, solo, para seguir avanzando:** GitHub Projects,
Mermaid, Jest, y despliegue local con Docker Compose. Están en EN DISCUSIÓN en
[pendientes.md](../01-requerimientos/pendientes.md) hasta que el equipo las confirme
en la reunión del 2026-09-14.

**Cómo montar la organización y el Project, y el backlog listo para copiar:**
[06-operacion/github-projects.md](../06-operacion/github-projects.md).

---

## Lo que falta

Estado frente a lo que pide la guía. ✅ existe · ⚠️ existe a medias · ❌ no existe.

### 1. Vista de descomposición funcional

| Pide la guía | Estado | Fuente en la bóveda |
|---|---|---|
| Diagrama gráfico con el nombre del sistema | ❌ | — |
| Entre 3 y 6 módulos | ⚠️ Hay 7 (M1–M7); propuesta de 6 grupos lista. [P-010](../01-requerimientos/pendientes.md) | [Especificación §3](../superpowers/specs/2026-08-20-acopio-design.md) |
| Funcionalidades agrupadas por módulo o submódulo | ⚠️ El contenido está en los RF, sin diagrama | [funcionales/](../01-requerimientos/funcionales/README.md) |
| Derivada de las épicas del Avance 2 | ❌ No hay Avance 2. Ver [P-012](../01-requerimientos/pendientes.md) | [historias/](../01-requerimientos/historias/README.md) |

### 2. Vista del modelo de datos

| Pide la guía | Estado | Fuente en la bóveda |
|---|---|---|
| Entidades y atributos principales | ✅ | [modelo-datos.md](../02-arquitectura/modelo-datos.md) |
| Diagrama entidad-relación | ✅ En Mermaid, 7 diagramas por clúster (20 entidades en total) — uno solo era ilegible | [modelo-datos.md § Diagrama entidad-relación](../02-arquitectura/modelo-datos.md#diagrama-entidad-relación-avance-3) |
| Llaves primarias y foráneas | ✅ Marcadas en cada entidad del diagrama | [modelo-datos.md](../02-arquitectura/modelo-datos.md#diagrama-entidad-relación-avance-3) |
| Relaciones y cardinalidades | ✅ | [modelo-datos.md](../02-arquitectura/modelo-datos.md#diagrama-entidad-relación-avance-3) |
| Restricciones de integridad | ✅ Nota junto al diagrama que remite a la tabla de invariantes | [modelo-datos.md § Invariantes](../02-arquitectura/modelo-datos.md#invariantes) |
| Solo las entidades del alcance | ✅ Las 20 se justifican: cada una responde a un RF. `saldo` se excluye por ser vista, no tabla | [modelo-datos.md](../02-arquitectura/modelo-datos.md#diagrama-entidad-relación-avance-3) |

**Punto que el docente puede preguntar — ya resuelto:** `movimiento`, `umbral` y
`usuario_asignacion` usan `ubicacion_tipo` + `ubicacion_id`, que apunta a un acopio o
a una zona sin llave foránea real. El diagrama la dibuja como dos relaciones posibles
y la nota debajo explica por qué PostgreSQL no puede expresarla como una sola FK. Ver
[modelo-datos.md](../02-arquitectura/modelo-datos.md#diagrama-entidad-relación-avance-3).

### 3. ADR-001: Arquitectura y selección tecnológica inicial

Los [ADR-0001 a 0006](../02-arquitectura/adr/README.md) son decisiones de detalle.
**Ninguno es el ADR global que pide la guía.** Numeración: ver [P-011](../01-requerimientos/pendientes.md).

| Campo | Estado |
|---|---|
| Estado y fecha | ❌ |
| Contexto: tipo de solución, requisitos, restricciones, atributos de calidad | ⚠️ Disperso en la especificación y los [RNF](../01-requerimientos/no-funcionales.md) |
| Decisión con tabla área / decisión preliminar | ⚠️ Las 13 filas tienen propuesta; 5 por confirmar en equipo. Ver el borrador abajo |
| Enfoque arquitectónico con nombre | ⚠️ Propuesto: cliente-servidor, monolito modular en capas. Falta confirmarlo en equipo |
| Alternativas consideradas (mínimo dos) | ⚠️ Hay alternativas por pieza en ADR-0001 y 0004; faltan las del enfoque completo |
| Justificación | ❌ |
| Consecuencias positivas | ⚠️ Repartidas en los ADR de detalle |
| Matriz de riesgos RTA, cinco o más | ⚠️ La [especificación §12](../superpowers/specs/2026-08-20-acopio-design.md) tiene 7 riesgos, sin ID, impacto ni probabilidad, y no todos son técnicos |

La guía advierte **no elegir tecnologías por tendencia**. El stack es grande —NestJS,
Prisma, PostgreSQL, MinIO, Supabase, Lovable, nginx, Docker—, así que la justificación
tiene que atar cada pieza a un requisito concreto.

#### Borrador de la tabla de decisión

De partida, sacado de la [especificación §4](../superpowers/specs/2026-08-20-acopio-design.md).
Se confirma en equipo antes de pasarlo al Word.

| Área | Decisión preliminar | Estado |
|---|---|---|
| Tipo de solución | Web responsive, móvil primero, dos superficies: portal público y consola interna | Decidido |
| Enfoque arquitectónico | Cliente-servidor; backend como monolito modular en capas | Por confirmar — propuesto por Joseph |
| Lenguaje | TypeScript en frontend y backend | Decidido |
| Framework o librería principal | NestJS en la API · React + Vite en el cliente | Decidido |
| Interfaz o cliente | SPA React con Tailwind y shadcn/ui, generada con Lovable · mapa con Leaflet y OpenStreetMap | Decidido |
| Backend o API | API REST en NestJS, un módulo por límite de dominio | Decidido |
| Persistencia | SQL con ORM Prisma y migraciones versionadas | Decidido |
| Motor de base de datos | PostgreSQL 16 | Decidido |
| Contenerización | Docker Compose con cinco servicios: db, api, storage, web, proxy | Decidido |
| Gestión de trabajo | GitHub Projects | Por confirmar — [P-007](../01-requerimientos/pendientes.md) |
| Herramientas de modelado y documentación | Obsidian para la documentación · Mermaid para los diagramas | Por confirmar — [P-008](../01-requerimientos/pendientes.md) |
| Pruebas previstas | Jest, unitarias e integración | Por confirmar — [P-009](../01-requerimientos/pendientes.md) |
| Despliegue previsto | Docker Compose en local para desarrollo · VPS con [Dokploy](https://dokploy.com) (Docker + Traefik) para producción | Falta proveedor y dominio — [P-005](../01-requerimientos/pendientes.md) |

Filas adicionales que conviene agregar: autenticación (Supabase Auth, solo emite el
token) y almacenamiento de archivos (MinIO con buckets privados).

### 4. Diagrama de arquitectura

| Pide la guía | Estado |
|---|---|
| Actores, interfaces, backend y módulos, base de datos, servicios externos, contenedores | ✅ | [vista-general.md](../02-arquitectura/vista-general.md#c4-nivel-2--contenedores) |
| Representación gráfica | ✅ Dos diagramas Mermaid: contexto y contenedores, con VPS y Dokploy | [vista-general.md](../02-arquitectura/vista-general.md) |
| Párrafo que lo explique | ✅ | [vista-general.md](../02-arquitectura/vista-general.md) |

---

## Tareas

Responsables sugeridos según el reparto del
[Avance 1](avance-01-sprint0.md#5-roles-iniciales-y-acuerdos-de-trabajo). Se ajustan en
la reunión.

### Primero — decisiones que bloquean

- [x] Elegir la herramienta de gestión de trabajo — **GitHub Projects**. [P-007](../01-requerimientos/pendientes.md) · confirmar en la reunión
- [x] Elegir la herramienta de diagramas — **Mermaid**. [P-008](../01-requerimientos/pendientes.md) · confirmar en la reunión
- [x] Definir las pruebas previstas y su herramienta — **Jest**. [P-009](../01-requerimientos/pendientes.md) · confirmar en la reunión
- [x] Definir el despliegue para el semestre — **Docker Compose local + VPS con Dokploy en producción**. [P-005](../01-requerimientos/pendientes.md) · falta proveedor y dominio, confirmar en la reunión
- [x] Agrupar los 7 módulos en 6 como máximo — propuesta confirmada. [P-010](../01-requerimientos/pendientes.md) · confirmar con Brayan en la reunión
- [x] Decidir la numeración del ADR del curso — **ADR-0008** (0007 lo tomó el Donador). [P-011](../01-requerimientos/pendientes.md) · anunciar en la reunión
- [x] Confirmar el enfoque arquitectónico: **cliente-servidor con monolito modular en capas**

### 1. Vista de descomposición funcional — Brayan

**2026-09-14 · Hecha por Joseph.** 6 módulos (P-010), 20 submódulos, 67
funcionalidades con CRUD y trazabilidad de los 75 RF (71 en el diagrama, 4 fuera
por ser reglas del sistema). Una vista general más un diagrama por módulo, igual
que el modelo de datos. Publicada como
[página](https://claude.ai/code/artifact/6fc99d02-0c56-4766-b051-ed287f1f4b56) y
como [lienzo editable](https://claude.ai/code/artifact/962c9ed6-140f-4656-bad2-f06175cd575e),
del que se exportan los PNG para el Word. Fuente única:
[build.mjs](../03-diseno/descomposicion-funcional/build.mjs). Falta la revisión de
Brayan.

- [ ] Fijar los módulos según lo que se decida en P-010
- [ ] Agrupar los RF de cada módulo en submódulos
- [ ] Marcar cada funcionalidad con la convención CRUD del ejemplo de la guía: C, R, U, D
- [ ] Dibujar el diagrama: sistema → módulos → submódulos → funcionalidades
- [ ] Incluir la leyenda de convenciones

### 2. Vista del modelo de datos — Joseph

- [x] Decidir qué entidades entran al diagrama y justificar las que se dejan — las 20 tablas, `saldo` excluida por ser vista
- [x] Marcar PK y FK en cada tabla, con tipos de dato
- [x] Dibujar el diagrama entidad-relación con cardinalidades — en [modelo-datos.md](../02-arquitectura/modelo-datos.md#diagrama-entidad-relación-avance-3), Mermaid
- [x] Nota sobre la relación `ubicacion_tipo` + `ubicacion_id`
- [x] Nota de restricciones de integridad, a partir de la tabla de invariantes
- [ ] Relacionar las entidades principales con sus RF e historias — pendiente, opcional para el Word

### 3. ADR-001 — Joseph, con Michael

**2026-09-14 · Redactado completo** en
[ADR-0008](../02-arquitectura/adr/ADR-0008-arquitectura-stack-inicial.md), estado
`propuesta`: contexto, decisión con tabla de 19 filas, tres alternativas,
justificación, consecuencias positivas, matriz RTA-01 a RTA-08, limitaciones y qué
se valida en el Sprint 1. Falta la revisión de Michael y la confirmación del equipo.

- [ ] Estado y fecha
- [ ] Contexto: web móvil primero, registro en menos de 10 s ([RNF-02](../01-requerimientos/no-funcionales.md)), integridad del inventario (RNF-06), sin conexión ([ADR-0005](../02-arquitectura/adr/ADR-0005-offline-solo-movimientos.md)), Ley 1581 (RNF-09), equipo de cuatro y un semestre
- [ ] Decisión: enfoque con nombre y tabla completa, sin filas abiertas
- [ ] Alternativas del enfoque completo, mínimo dos. Candidatas: Supabase completo como backend, y un monolito MVC sin separación de módulos
- [ ] Justificación: viabilidad, capacidad del equipo, alcance, requisitos y calidad
- [ ] Consecuencias positivas
- [ ] Matriz de riesgos RTA-01 en adelante, con impacto, probabilidad y estrategia. Candidatos:
  - [ ] Experiencia con NestJS — **riesgo contenido** (2026-09-14): Joseph, que lleva el backend, ya usa Prisma pero no NestJS; lo asume él. Estrategia: spike al inicio del Sprint 1
  - [ ] Concurrencia: dos registros simultáneos dejan el saldo negativo
  - [ ] Supabase pausa el proyecto inactivo, y sin internet no se inicia sesión
  - [ ] El modo sin conexión consume el tiempo del motor
  - [ ] Dependencia de Lovable para generar la interfaz
  - [ ] Correo: SMTP decidido ([P-004](../01-requerimientos/pendientes.md)); Microsoft 365 retira el SMTP con contraseña a fines de 2026 y puede exigir OAuth; Supabase con su servidor por defecto envía solo 2 correos por hora — I-004
  - [ ] Importador de RedAcopio: sin API ni licencia, se rompe si cambian su HTML — [P-022](../01-requerimientos/pendientes.md)
  - [ ] Datos de Esfera y DANE solo de referencia: el cálculo de déficit depende de valores configurables
- [ ] Revisar que ningún riesgo sea genérico, como pide la guía

### 4. Diagrama de arquitectura — Joseph

- [x] Actores: donante, voluntario, operador, receptor, auditor, administrador
- [x] Interfaces: portal público y consola
- [x] Backend con sus módulos
- [x] PostgreSQL y MinIO
- [x] Servicios externos: Supabase Auth, OpenStreetMap, correo, sitios oficiales de las entidades
- [x] Contenedores: VPS con Dokploy, Traefik, web, api, db, storage
- [x] Párrafo que explique el diagrama

### Diagramas a imagen — hecho 2026-09-14

16 PNG a 3× en [assets/diagramas/](../assets/diagramas/): 7 entidad-relación
(`er-01` a `er-07`), 2 de arquitectura (`arquitectura-01-contexto`,
`arquitectura-02-contenedores`) y 7 de descomposición funcional
(`descomposicion-00` a `06`). Los ER y la arquitectura también se leen en
[esta página](https://claude.ai/code/artifact/f7782416-a907-4043-bef2-e463e365522e).
Se generan desde la bóveda con
[02-arquitectura/diagramas/build.mjs](../02-arquitectura/diagramas/build.mjs): si
cambia un diagrama en `modelo-datos.md` o `vista-general.md`, se vuelve a correr.

### 5. Montaje en el Word — Alejandra

**2026-09-14 · Versión de revisión generada:**
[Avance 3 - Arquitectura inicial - Acopio.docx](Avance%203%20-%20Arquitectura%20inicial%20-%20Acopio.docx),
33 páginas, con el formato del Word del Avance 1: portada (Sprint 3), índice, las
cuatro secciones de la guía, 17 figuras, el Anexo A de trazabilidad y el Anexo B con
un resumen de cada código de la bóveda citado. ADR-001 aceptado. Se regenera con
[generar-avance-03.py](generar-avance-03.py) desde las fuentes de la bóveda. Orden
acordado: primero se corrigen los apartados sobre esta versión; después se arma un
documento con todo junto (Avance 1 + Avance 3, y el Avance 2 si llega a tiempo).

- [ ] Agregar las cuatro secciones del Avance 3 al Word de OneDrive
- [ ] Insertar los diagramas como imagen legible
- [ ] Actualizar el índice del documento
- [ ] Revisión final del equipo antes del 2026-09-14

### Después del 2026-09-14

- [ ] Pasar a la bóveda lo que cambió: ADR nuevo, modelo de datos y vista general
- [ ] Guardar los diagramas en [assets/](../assets/LEEME.txt)
- [ ] Corregir el conteo de RF en [01-requerimientos/README.md](../01-requerimientos/README.md): dice 60, hay 67
- [ ] Retomar el Avance 2 — [P-012](../01-requerimientos/pendientes.md)
- [ ] Barrer las menciones a Lovable en la bóveda (15 archivos: spec, README, 03-diseno, plantilla de prompt, vista general) — [P-021](../01-requerimientos/pendientes.md), [ADR-0009](../02-arquitectura/adr/ADR-0009-mockups-claude-design.md)
