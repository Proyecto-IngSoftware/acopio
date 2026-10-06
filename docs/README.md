---
title: "Acopio — portada"
type: moc
tags: [moc, indice]
estado: vigente
actualizado: 2026-10-06
---

# Acopio

Plataforma de coordinación logística para respuesta a desastres.
Proyecto de **Ingeniería de Software I** · ETITC.

**Estado al 2026-10-06:** construidos los Bloques 0 a 2 y la API y el portal del Donador del
Bloque 3. Lo que sigue está en [05-planes/](05-planes/README.md) y en los
[issues del repositorio](https://github.com/Proyecto-IngSoftware/acopio/issues), que son el
plan de trabajo: el próximo es el ciclo 2 del Bloque 3 (#34).

> **Esta carpeta es la bóveda de Obsidian.** Ábrela con *Abrir carpeta como bóveda*.
> Convenciones en [GUIA-OBSIDIAN.md](GUIA-OBSIDIAN.md).

---

## Qué resuelve

1. Quien quiere ayudar no sabe cómo ni dónde → directorio de causas, mapa de acopios, turnos con cupo
2. Los acopios se saturan de un insumo y carecen de otro → inventario con umbrales y estado *no recibir*
3. Las donaciones llegan mal repartidas a las zonas → motor de emparejamiento déficit/superávit

**No recibe dinero.** Entrega el paso a paso y dirige al sitio oficial de cada entidad.

## Por dónde empezar

| Quiero… | Voy a |
|---|---|
| Entender el proyecto completo | [Especificación de diseño](superpowers/specs/2026-08-20-acopio-design.md) |
| Entender el problema | [Problema](00-contexto/problema.md) |
| Ver el entregable del curso | [Avance 1 — Sprint 0](entregas/avance-01-sprint0.md) |
| Saber qué está y qué no está en alcance | [Fuera de alcance](00-contexto/fuera-de-alcance.md) |
| Consultar un término | [Glosario](00-contexto/glosario.md) |
| Saber por qué se decidió algo | [ADR](02-arquitectura/adr/README.md) |
| Construir interfaz | [Diseños de Stitch](03-diseno/stitch/README.md) · [Contrato de la API](03-diseno/api/README.md) |
| Saber qué se construyó y qué sigue | [Planes](05-planes/README.md) · [Issues](https://github.com/Proyecto-IngSoftware/acopio/issues) |
| Desplegar o arreglar algo roto | [Runbook](06-operacion/runbook.md) |

---

## Mapa de la bóveda

| Carpeta | Qué guarda | Cuándo se toca |
|---|---|---|
| [00-contexto/](00-contexto/README.md) | Problema, actores, glosario, fuera de alcance | Rara vez. Es el suelo |
| [01-requerimientos/](01-requerimientos/README.md) | RF por módulo, RNF, historias, pendientes | Cada semana |
| [02-arquitectura/](02-arquitectura/README.md) | Vista general, modelo de datos, ADR | Al decidir algo caro de revertir |
| [03-diseno/](03-diseno/README.md) | Diseños de Stitch por pantalla, sistema de diseño, flujos, contrato de la API | Al construir interfaz |
| [superpowers/specs/](superpowers/specs/README.md) | Especificaciones formales por bloque | Al iniciar un bloque |
| [05-planes/](05-planes/README.md) | Planes de implementación | Al iniciar un bloque |
| [06-operacion/](06-operacion/README.md) | Despliegue, runbook | Al desplegar, y cuando algo falla |
| [entregas/](entregas/README.md) | Entregables de la asignatura | En cada avance de proyecto |
| [99-futuro/](99-futuro/backlog.md) | Aplazado, recuperable | Al recortar algo |
| [plantillas/](plantillas/plantilla-adr.md) | Plantillas de ADR y de requerimiento | Al crear una nota nueva |
| [tableros/](tableros/tablero-notas.base) | Vistas Bases sobre las propiedades | Para consultar de un vistazo |

---

## Los cuatro archivos que son la memoria del proyecto

Sin ellos esto es documentación muerta. Con ellos, es memoria.

### [Fuera de alcance](00-contexto/fuera-de-alcance.md)
Lo descartado **y por qué**. Evita que en el mes 3 alguien reabra una discusión ya
cerrada. Solo un argumento nuevo justifica reabrir.

### [Pendientes](01-requerimientos/pendientes.md)
**Bandeja de entrada.** Toda idea o requerimiento nuevo aterriza aquí crudo, sin
necesidad de estar bien redactado. En la revisión semanal se promueve, se aplaza o se
descarta con razón escrita. Nada se decide en un chat que nadie vuelve a leer.

### [Registro de decisiones (ADR)](02-arquitectura/adr/README.md)
Una decisión por archivo, con contexto, alternativas y consecuencias. **Las aceptadas
no se editan.** Es lo que se sustenta ante el jurado cuando pregunten *«¿por qué
Supabase solo para autenticación?»*.

### [Diseños de Stitch](03-diseno/stitch/README.md)
Una carpeta por pantalla con la captura, la maqueta aprobada por Joseph y sus
diferencias. No se escribe código de una pantalla sin su maqueta aprobada.

---

## Equipo

| Integrante | Responsabilidad inicial |
|---|---|
| **Joseph** | Arquitectura y liderazgo de integración |
| **Brayan** | Análisis de requerimientos · Diseño UI/UX |
| **Alejandra** | Coordinación de Sprint y documentación |
| **Michael** | Calidad, pruebas y despliegue |

Los roles rotan cada Sprint. Detalle en el
[Avance 1](entregas/avance-01-sprint0.md#5-roles-iniciales-y-acuerdos-de-trabajo).

**Reunión semanal:** martes o viernes, de 6:00 a 8:00 p. m., según el espacio que
asigne el docente.

---

## Ritual semanal — 30 minutos

1. Vaciar [pendientes.md](01-requerimientos/pendientes.md): cada entrada sale por una
   de sus cuatro puertas
2. ¿Alguna decisión de la semana merece un ADR?
3. ¿Algún requerimiento cambió? Actualizarlo donde vive, no en un comentario
4. ¿Algo se recortó? A [99-futuro/backlog.md](99-futuro/backlog.md), con la razón
5. Bumpear `actualizado:` en lo que se tocó

Media hora a la semana es lo que separa un proyecto documentado de uno con una
carpeta de documentos obsoletos.

---

## Convenciones

- **Español** en todo: documentación, propiedades, nombres de entidades y código.
  `Acopio`, no `CollectionCenter`
- **Enlaces Markdown relativos**, no wikilinks — la documentación también sale a
  OneDrive y a Word. Ver [GUIA-OBSIDIAN.md](GUIA-OBSIDIAN.md)
- Fechas absolutas en ISO: `2026-08-20`, nunca «la semana pasada»
- Los requerimientos se citan por su número: `RF-INV-004`
- **Un número asignado no se reutiliza jamás**, aunque el requerimiento se elimine

---

## Estructura del repositorio

La bóveda es solo `docs/`. El repositorio completo:

```
apps/api            NestJS 11 · Prisma 7.10 · dominio y API REST
apps/web            React · Vite · TanStack Query · Tailwind 4 · pantallas diseñadas en Stitch
packages/shared     funciones puras compartidas (formato, unidades, horarios)
packages/ui-tokens  los tokens del tema de Stitch, el único lugar con colores
infra               docker-compose (base de producción y desarrollo), Garage
prisma              esquema y migraciones
docs                esta bóveda
```

Comandos y reglas de trabajo en el `CLAUDE.md` de la raíz.
