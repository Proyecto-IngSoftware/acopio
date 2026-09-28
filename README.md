# Acopio

Plataforma de coordinación logística para respuesta a desastres.
Proyecto de **Ingeniería de Software I** · ETITC.

**Estado:** Bloque 0 en curso ([plan](docs/05-planes/2026-09-28-bloque-0-cimientos.md)).

## Qué resuelve

1. Quien quiere ayudar no sabe cómo ni dónde → directorio de causas, mapa de acopios, turnos con cupo.
2. Los acopios se saturan de unos insumos y carecen de otros → inventario con umbrales y estado *no recibir*.
3. Las donaciones llegan mal repartidas a las zonas afectadas → motor de emparejamiento déficit/superávit.

**No recibe dinero.** Entrega el paso a paso y dirige al sitio oficial de cada entidad.

## La documentación es una bóveda de Obsidian

> Abrir **`docs/`** con *Abrir carpeta como bóveda*. No la raíz de este repositorio.
> Convenciones, propiedades y tableros en [docs/GUIA-OBSIDIAN.md](docs/GUIA-OBSIDIAN.md).

También se lee bien en GitHub o en cualquier editor: los enlaces son Markdown
relativos, no wikilinks.

## Por dónde empezar

| Quiero… | Voy a |
|---|---|
| Recorrer la documentación | [docs/README.md](docs/README.md) — portada de la bóveda |
| Entender el proyecto completo | [Especificación de diseño](docs/superpowers/specs/2026-08-20-acopio-design.md) |
| Ver el entregable del curso | [Avance 1 — Sprint 0](docs/entregas/avance-01-sprint0.md) |
| Entender el problema | [Problema](docs/00-contexto/problema.md) |
| Saber qué está y qué no está en alcance | [Fuera de alcance](docs/00-contexto/fuera-de-alcance.md) |
| Consultar un término | [Glosario](docs/00-contexto/glosario.md) |
| Saber por qué se decidió algo | [ADR](docs/02-arquitectura/adr/README.md) |
| Construir interfaz | [Sistema de diseño](docs/03-diseno/sistema-diseno.md) |
| Desplegar o arreglar algo roto | [Runbook](docs/06-operacion/runbook.md) |

## Equipo

| Integrante | Responsabilidad inicial |
|---|---|
| Joseph | Arquitectura y liderazgo de integración |
| Brayan | Análisis de requerimientos · Diseño UI/UX |
| Alejandra | Coordinación de Sprint y documentación |
| Michael | Calidad, pruebas y despliegue |

Los roles rotan cada Sprint. Reunión semanal: martes o viernes, de 6:00 a 8:00 p. m.

## Aportar una idea o un requerimiento nuevo

Todo entra crudo por [docs/01-requerimientos/pendientes.md](docs/01-requerimientos/pendientes.md).
En la revisión semanal se promueve, se aplaza o se descarta con razón escrita.
Nada se decide en un chat que nadie vuelve a leer.

## Estructura

```
apps/api        NestJS · dominio y API REST                      (T04)
apps/web        React + Vite · interfaz a partir de los mockups  (T14)
packages/shared reglas puras compartidas                         ✔
infra           docker-compose, nginx                            (T02)
prisma          esquema y migraciones                            (T03)
docs            bóveda de Obsidian                               ✔
```

## Desarrollo

Requisitos: [Bun](https://bun.sh) 1.3 y Node 22 (`.nvmrc`). Bun instala y corre los
scripts; el código y las pruebas corren sobre Node.

```bash
bun install          # dependencias de todos los paquetes
bun run lint         # ESLint y Prettier
bun run typecheck    # TypeScript en cada paquete
bun run test         # pruebas unitarias (Jest)
bun run format       # aplica Prettier
```

Prettier no toca `docs/` ni los `.md`: la bóveda se edita con Obsidian.
