---
title: "Guía de la bóveda en Obsidian"
type: moc
tags: [moc, obsidian]
estado: vigente
actualizado: 2026-10-30
---

# Guía de la bóveda en Obsidian

Cómo está montada la documentación y cómo mantenerla sin romperla.

---

## Abrir la bóveda

**Abrir carpeta como bóveda → `Proyecto/docs`.**

No la raíz del repositorio: dejar fuera el código evita que la vista de grafo se
llene de archivos que nadie va a enlazar. El punto de entrada es
[README.md](README.md).

## Convenciones que no se rompen

### Enlaces Markdown, no wikilinks

Los enlaces son relativos y en formato Markdown: `[texto](ruta/archivo.md)`.

Obsidian los indexa igual, muestra backlinks y los pinta en el grafo. La razón de no
usar `[[wikilinks]]` es que esta documentación **también sale del vault**: va a
OneDrive, a Word y potencialmente a GitHub, donde `[[ ]]` se ve como texto plano.

> **En Ajustes → Archivos y enlaces**, pon *Tipo de enlace nuevo* en **Ruta relativa
> al archivo** y desactiva *Usar formato \[\[wikilink\]\]*. Así lo que escribas a
> mano sigue la misma convención.

### Mover y renombrar solo dentro de Obsidian

Renombrar con `F2` dentro de la aplicación actualiza los enlaces automáticamente.
Renombrar desde el explorador de Windows **los rompe todos** y no avisa.

### Un solo vocabulario, en español

Los términos están en [00-contexto/glosario.md](00-contexto/glosario.md). `Acopio`,
no `CollectionCenter`. Aplica a documentación, propiedades y código.

---

## Propiedades (frontmatter)

Toda nota lleva este bloque. **Los nombres son fijos**: los tableros dependen de que
no cambien.

```yaml
---
title: "Título de la nota"
type: contexto
tags: [contexto]
estado: vigente
actualizado: 2026-08-20
---
```

### Valores de `type`

| Valor | Para qué |
|---|---|
| `moc` | Notas índice |
| `contexto` | Problema, actores, glosario, fuera de alcance |
| `requerimientos` | RF, RNF, historias |
| `pendientes` | Bandeja de entrada |
| `arquitectura` | Vista general, modelo de datos |
| `adr` | Decisiones de arquitectura |
| `diseno` | Sistema de diseño, flujos |
| `prompt` | Prompts de video o de generación (por ejemplo, el video de la donación) |
| `spec` | Especificaciones formales |
| `plan` | Planes de implementación, en `05-planes/` |
| `operacion` | Despliegue, runbook |
| `guia` | Guías de uso, como los escenarios por rol |
| `informe` | Informes de sesión, en `06-operacion/sesiones/` |
| `entrega` | Entregables de la asignatura |
| `backlog` | Aplazado |

### Valores de `estado`

`vigente` · `borrador` · `reemplazado`

Los planes (`type: plan`) usan además tres estados propios:

| Valor | Significa |
|---|---|
| `aprobado` | Joseph aprobó el plan; su tabla de estado dice qué tarea falta |
| `ejecutado` | Sus tareas están hechas |
| `cerrado` | Se ejecutó y el bloque o ciclo quedó cerrado, con su issue |

### Propiedades adicionales por tipo

| Tipo | Añade |
|---|---|
| `adr` | `adr: <número>` · `decision: propuesta \| aceptada \| reemplazada` |
| `requerimientos` | `modulo: <nombre>` · `bloque: 0..6` |

### Vocabulario de etiquetas

Las búsquedas dependen de que no se disperse. Estas son las etiquetas en uso,
agrupadas por lo que nombran:

| Grupo | Etiquetas |
|---|---|
| Tipo de nota | `moc` · `indice` · `contexto` · `requerimientos` · `rf` · `rnf` · `historias` · `pendientes` · `arquitectura` · `adr` · `diseno` · `prompt` · `spec` · `plan` · `operacion` · `sesion` · `futuro` · `entrega` · `is1` · `obsidian` |
| Módulo o tema del dominio | `identidad` · `acceso` · `catalogo` · `codigos-de-barras` · `inventario` · `comprobantes` · `custodia` · `recepcion` · `seguimiento` · `donador` · `motor` · `simulador` · `remisiones` · `turnos` · `importacion` · `almacenamiento` · `causas` · `red` · `reportes` · `offline` · `persistencia` · `seguridad` · `legal` |
| Interfaz | `interfaz` · `web` · `api` · `stitch` · `consola` · `portal` · `portada` · `ux` · `componentes` · `color` |
| Etapa del trabajo | `bloque-N` · `sprint-N` · `pieza-X` · `cronograma` · `calendario` |
| Práctica y operación | `pruebas` · `recorridos` · `despliegue` · `servidor` · `seed` · `demo` · `patrones` · `buenas-practicas` · `resumen` |

`bloque-N`, `sprint-N` y `pieza-X` siguen su patrón sin pedir permiso. Cualquier
otra etiqueta nueva se agrega a esta tabla en el mismo cambio que la usa por
primera vez; si ya hay una que dice lo mismo, se usa esa.

---

## Navegación

La bóveda se recorre por **notas índice**, no por carpetas. Cada carpeta tiene su
`README.md` con `type: moc`.

```
README.md                    ← portada
├─ 00-contexto/README.md
├─ 01-requerimientos/README.md
│  └─ funcionales/README.md
├─ 02-arquitectura/README.md
│  └─ adr/README.md
├─ 03-diseno/README.md
│  └─ stitch/README.md
├─ 05-planes/README.md
├─ 06-operacion/README.md
├─ entregas/README.md
├─ superpowers/specs/README.md
├─ 99-futuro/README.md
└─ plantillas/README.md
```

**Regla:** toda nota nueva se enlaza desde al menos un índice. Una nota que nadie
enlaza es una nota que nadie va a encontrar.

---

## Tableros (Bases)

En [tableros/](tableros/):

| Archivo | Qué muestra |
|---|---|
| `tablero-adr.base` | Todas las decisiones, y solo las aceptadas |
| `tablero-requerimientos.base` | RF por bloque, y el núcleo de bloques 2 a 4 |
| `tablero-notas.base` | Todas las notas por tipo, estado y antigüedad |

> **Si tu versión de Obsidian no abre alguno**, la sintaxis `.base` cambió entre
> versiones. No pierdas tiempo depurando el YAML: crea la vista desde la interfaz
> —*Nueva base* → filtro por la propiedad `type` → elige columnas— y reemplaza el
> archivo. Toma dos minutos y queda con la sintaxis exacta de tu versión.

Bases requiere Obsidian 1.9 o superior.

Hay un solo plugin de comunidad, [Mehrmaid](.obsidian/plugins/mehrmaid/manifest.json),
que permite escribir Markdown dentro de los diagramas Mermaid. Está versionado en
`.obsidian/plugins/`, así que llega con el repositorio.

---

## Plantillas

En [plantillas/](plantillas/README.md): [ADR](plantillas/plantilla-adr.md) ·
[requerimiento](plantillas/plantilla-requerimiento.md) ·
[informe de sesión](plantillas/plantilla-informe-sesion.md).

La carpeta de plantillas ya está fijada en `.obsidian/templates.json`; se insertan
con la paleta de comandos.

---

## Ajustes recomendados

Estos ajustes están guardados en `.obsidian/app.json` y `.obsidian/templates.json`,
que van en el repositorio: quien abre la bóveda ya los tiene. La tabla sirve para
revisarlos si alguien los cambia.

| Ajuste | Valor | Por qué |
|---|---|---|
| Archivos y enlaces → Tipo de enlace nuevo | Ruta relativa al archivo | Compatibilidad fuera de Obsidian |
| Archivos y enlaces → Usar formato wikilink | **Desactivado** | Igual que arriba |
| Archivos y enlaces → Carpeta de archivos adjuntos | `assets` | Que las imágenes no se rieguen |
| Plantillas → Carpeta | `plantillas` | |
| Editor → Modo de vista predeterminado | Lectura | La documentación se lee más de lo que se escribe |

---

## Mantenimiento

**En la reunión semanal**, 30 minutos:

1. Vaciar [pendientes.md](01-requerimientos/pendientes.md)
2. ¿Alguna decisión merece un ADR?
3. Actualizar `actualizado:` en lo que se tocó
4. Revisar el grafo: ¿alguna nota quedó suelta? Enlazarla desde su índice

**Responsable:** Alejandra, según el reparto del
[Avance 1](entregas/avance-01-sprint0.md#5-roles-iniciales-y-acuerdos-de-trabajo).
Rota cada Sprint.

---

## Lo que no debe entrar a la bóveda

- Credenciales, claves de API, contenido de `.env`
- Archivos generados: `node_modules`, `dist`, respaldos de base de datos
- Documentos personales ajenos al proyecto

La bóveda es documentación del proyecto y se comparte con el equipo entero.
