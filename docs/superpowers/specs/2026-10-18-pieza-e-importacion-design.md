---
title: "Pieza E · Importación de RedAcopio y carga por CSV · especificación"
type: spec
tags: [spec, bloque-1, importacion]
estado: vigente
bloque: 1
actualizado: 2026-10-18
---

# Pieza E · Importación de RedAcopio y carga por CSV · especificación

**Fecha:** 2026-10-18
**Estado:** aprobada por Joseph el 2026-10-18
**Deriva de:** [especificación del Bloque 1](2026-09-30-bloque-1-red-design.md) §2 (pieza E),
[RF-RED-011](../../01-requerimientos/funcionales/red.md#rf-red-011--importar-acopios-de-una-fuente-externa),
RF-RED-002 y RF-RED-003 (acopio referenciado en el mapa y en la ficha), criterio 2 de HU-01,
[P-022](../../01-requerimientos/pendientes.md), [I-003](../../00-contexto/investigaciones.md) y
[modelo-datos.md](../../02-arquitectura/modelo-datos.md) (dos clases de acopio)
**Issue:** [#49](https://github.com/Proyecto-IngSoftware/acopio/issues/49), filas 8a a 8e del
[plan de acción](../../05-planes/plan-de-accion.md), con despliegue el miércoles 21 de octubre

---

## 1. Objetivo

Que el mapa de Acopio muestre la red de acopios de Bogotá que ya mantiene la comunidad en
RedAcopio Bogotá, sin cargarla a mano, y que cualquier módulo se pueda llenar con datos de
prueba desde un archivo CSV.

Joseph lo pidió así el 2026-10-18: primero una lectura única de RedAcopio, guardada en el
repositorio, que sirva de base de desarrollo y de pruebas sin pedir la página en cada corrida.
Sobre esa base, un sistema que hoy se alimenta de la copia y mañana se conecta a la página real
sin cambiar nada más.

## 2. Alcance

Entra:

- El acopio **referenciado**: columnas nuevas en `acopio` y reglas que lo separan del operado.
- El módulo `importacion`, con un puerto de fuente y el adaptador de RedAcopio en dos variantes:
  la que lee la copia guardada y la que lee la página. La lectura programada cada 60 minutos
  queda escrita y apagada.
- La copia de trabajo: el HTML de la portada y el de `/herramientas` leídos el 2026-10-18.
- La lista de **otras plataformas** de `/herramientas`, aparte de las causas.
- La **carga por CSV** para todos los módulos que tienen datos de catálogo o de operación
  inicial, solo backend, con los endpoints listos para una pantalla futura.
- Las pantallas que muestran lo importado, con maquetas aprobadas antes de escribir su código:
  marcador de referenciado en P05, ficha de referenciado en P06 y la lista de otras plataformas.
- La demo del servidor de pruebas con los 88 puntos y las 9 plataformas.

No entra:

- Encender la lectura programada contra la página real. Se enciende con una variable cuando
  Joseph lo decida.
- La pantalla de carga por CSV en la consola. Los endpoints quedan listos y documentados.
- CSV de usuarios, comprobantes, remisiones y reservas. Las cuentas nacen por invitación
  (ADR-0014) y los otros tres son flujos con folio, secreto o firma que no se fabrican por lote.
- Reescribir `seed/demo.ts` en CSV. La demo suma lo importado y sigue sembrando lo suyo en
  código.
- El Open Graph de la ficha (pieza D, #50), que sigue a la ficha de esta pieza.
- Una segunda fuente. El puerto la admite sin tocar el resto.

## 3. Decisiones

| Decisión | Quién | Razón |
|---|---|---|
| Lectura única guardada en el repositorio como base de desarrollo y de pruebas | Joseph | No pedir la página en cada prueba; la prueba de formato (RTA-05) necesita una copia fija |
| La lectura programada es cada 60 minutos y queda apagada | Joseph | P-022: una lectura por hora es una de las salvaguardas con el operador del sitio |
| Las plataformas de `/herramientas` van en una lista aparte, fuera de las causas | Joseph | No traen NIT ni verificación; una causa sale solo de una entidad verificada (HU-15) |
| La carga por CSV cubre todos los módulos, solo backend, estructurada para una pantalla | Joseph | Llenar local y servidor sin escribir código; la pantalla vendrá después |
| Los 88 puntos se ven en el servidor para la sustentación | Joseph | Muestra el criterio 2 de HU-01 en vivo |
| Si el martes 20 por la noche no hay maquetas aprobadas, se despliega solo el backend con los referenciados ocultos | Joseph | La demo del viernes no depende de la parte visual |
| Los referenciados viven en la tabla `acopio` con `tipo` | Bóveda (P-022, modelo de datos) | Un solo mapa y una sola ficha; `fuente` + `fuente_id` evitan duplicados |
| El CSV lo define cada módulo dueño del dato; `importacion` pone el camino común | Claude | Cada regla de negocio sigue en su módulo, y `importacion` no importa a nadie (tabla de dependencias) |
| El endpoint público de acopios no devuelve referenciados salvo que se pidan | Claude | Las pantallas actuales siguen iguales hasta que las nuevas los pidan; el plan B queda automático |

## 4. Datos

### 4.1 Acopio referenciado

Migración sobre `acopio`, con los nombres de [modelo-datos.md](../../02-arquitectura/modelo-datos.md):

```
acopio
  tipo                  OPERADO | REFERENCIADO   DEFAULT OPERADO
  entidad_id            pasa a nulo              CHECK (tipo = 'REFERENCIADO' OR entidad_id IS NOT NULL)
  fuente                text?                    CHECK (tipo = 'OPERADO' OR fuente IS NOT NULL)
  fuente_id             text?                    UNIQUE (fuente, fuente_id)
  fuente_actualizado_en timestamptz?             el updated_at de la fuente
  fuente_estado         text?                    abierto, cerrado, lleno, sin_info… tal cual
  fuente_necesidades    jsonb?                   [{ nivel, texto }] tal cual
  fuente_horario        text?                    «10:00 am - 7:00pm» tal cual
  fuente_contacto       jsonb?                   teléfono, Instagram, WhatsApp, enlace de inscripción, notas
  fuente_url            text?                    enlace al punto o a la portada de la fuente
  oculto_por_admin      bool DEFAULT false
```

`horario` y `municipio` siguen obligatorios: un referenciado lleva `HORARIO_VACIO` (su horario
real está en `fuente_horario`) y el municipio de la fuente («Bogotá» para RedAcopio).

Un referenciado no tiene movimientos, umbrales, «no recibir», jornadas, comprobantes,
remisiones, sugerencias ni asignaciones. Lo garantizan:

- `acopio.dao.ts`, por donde pasan todas las consultas de acopios: cada método de lista recibe
  el tipo de forma explícita, y todo lo que no sea el mapa público y la ficha pide `OPERADO`.
- `VerificadorUbicaciones` rechaza un referenciado al asignar personas.
- Los servicios que escriben sobre un acopio (inventario, comprobantes, motor, turnos) lo
  rechazan con 409 `ACOPIO_REFERENCIADO`. Basta con que lo haga el método que hoy busca el
  acopio y lanza 404.

Mapa de estados (RF-RED-011): `abierto` → `ACTIVO`, `lleno` → `PAUSADO`, `cerrado` → `CERRADO`,
cualquier otro valor → `PAUSADO`.

### 4.2 Otras plataformas

```
plataforma
  id · nombre · categoria · descripcion · url · orden int
  fuente text? · fuente_id text?          UNIQUE (fuente, fuente_id)
  activa bool DEFAULT true
  actualizado_en timestamptz
```

Las 9 de `/herramientas` entran con `fuente = 'redacopio'` y su URL como `fuente_id`. El CSV de
plataformas permite sumar otras a mano.

### 4.3 Ejecuciones de importación

```
importacion_ejecucion
  id · fuente · origen ARCHIVO | HTTP · inicio · fin
  resultado OK | ABORTADA
  creados · actualizados · cerrados int · motivo text?
```

Dice cuándo fue la última lectura buena. La ficha la usa para «actualizado hace…» cuando la
fuente no trae fecha por punto, y la futura pantalla de la consola, para el historial.

## 5. Importación de fuentes

### 5.1 Puerto y adaptadores

```
FuenteAcopios
  nombre: 'redacopio'
  leer(): Promise<{ puntos: PuntoFuente[]; plataformas: PlataformaFuente[] }>
```

- `RedAcopioArchivo` lee la copia guardada en
  `apps/api/src/modulos/importacion/fuentes/redacopio/copia/` (`portada.html` y
  `herramientas.html`, con la fecha de lectura en un `LEEME.md` al lado).
- `RedAcopioHttp` pide las dos páginas con un User-Agent que nombra a Acopio y trae un
  contacto, con tiempo límite.
- Los dos pasan el HTML por el mismo lector, `leerRedAcopio(html)`. El lector junta los
  fragmentos `self.__next_f.push`, busca el arreglo de puntos y valida cada uno con un esquema
  Zod. Las plataformas salen de las tarjetas de `/herramientas`.
- `IMPORTACION_ORIGEN=archivo|http` elige el adaptador. Por defecto, `archivo`.

### 5.2 Reglas de la importación

- Solo entran los puntos con `verification_status = verificado`.
- Si el lector no encuentra el arreglo, o si un punto no cumple el esquema, la importación
  entera se aborta: no se escribe nada y queda una ejecución `ABORTADA` con el motivo (RTA-05).
- Cada punto se identifica por `fuente` + `fuente_id` (el `id` de RedAcopio): reimportar
  actualiza y no duplica.
- Un punto que deja de aparecer se cierra (`CERRADO`); no se borra.
- `oculto_por_admin` no se pisa al reimportar.
- Todo va en una transacción, con una entrada de bitácora por ejecución (`usuario_id` nulo,
  acción del sistema) que resume creados, actualizados y cerrados.

### 5.3 Cómo se dispara

- Script: `bun run --filter @acopio/api importar:redacopio`.
- Endpoint del Administrador: `POST /api/importacion/fuentes/redacopio/ejecutar`.
- `seed:demo` la corre con el adaptador de archivo, así local y servidor tienen los 88 puntos.
- Desde el script o la tarea programada, la bitácora queda con `usuario_id` nulo, como las demás
  acciones del sistema; desde el endpoint, con el Administrador que la pidió.
- Tarea programada cada 60 minutos, registrada solo si `IMPORTACION_PROGRAMADA=true` y no es
  `NODE_ENV=test`. Por defecto, apagada.

## 6. Carga por CSV

### 6.1 El camino común

`importacion` pone el lector de CSV, el registro de formatos, los endpoints y el reporte.
Cada módulo dueño del dato registra su formato al arrancar:

```
FormatoCsv<Fila>
  tipo: 'causas'                      nombre en la URL y en el script
  columnas: [{ nombre, obligatoria, descripcion, ejemplo }]
  esquema: Zod de una fila            tipos, formatos y valores permitidos
  revisar(filas, tx): errores         reglas que miran la base: que la entidad exista y esté verificada…
  aplicar(filas, usuario, tx)         usa los servicios o DAO del módulo, con su bitácora
```

Así las reglas siguen donde ya viven: una causa pasa por las reglas de causas y un inventario
inicial entra como movimientos `ENTRADA`, nunca como saldo. `importacion` no importa a ningún
módulo; los módulos importan el registro de `importacion`. La tabla «Dependencias permitidas» de
[vista-general.md](../../02-arquitectura/vista-general.md) y `.dependency-cruiser.cjs` suman las
flechas nuevas hacia `importacion`.

### 6.2 Formatos de esta ronda

| Tipo | Módulo | Notas |
|---|---|---|
| `entidades` | acopios | Entran sin verificar; verificar sigue siendo un acto del Administrador |
| `acopios` | acopios | Operados; la entidad se busca por nombre; coordenadas obligatorias (no geocodifica por lote) |
| `zonas` | acopios | La emergencia se busca por nombre |
| `plataformas` | importacion | Las otras plataformas |
| `categorias` | catalogo | Con unidad base y sinónimos |
| `inventario` | inventario | Entrada inicial por acopio y categoría, como movimientos `ENTRADA` |
| `causas` | acopios | La entidad tiene que estar verificada |
| `jornadas` | turnos | Con las mismas reglas de anticipación y cupo que la consola |

Las columnas exactas de cada formato salen de su esquema y quedan en `GET /api/importacion/formatos`.
Cada formato trae un archivo de ejemplo válido en `apps/api/src/modulos/importacion/ejemplos/`,
que usan las pruebas.

### 6.3 Revisar y aplicar

- `POST /api/importacion/csv/{tipo}/revisar` (multipart): lee, valida y devuelve
  `{ filas: [{ numero, valida, errores: [{ columna, mensaje }] }], validas, invalidas }` sin
  escribir nada.
- `POST /api/importacion/csv/{tipo}/aplicar` (multipart): vuelve a revisar y, si todas las filas
  son válidas, escribe todo en una transacción. Si alguna falla, responde 422 con el mismo
  reporte y no escribe nada.
- `GET /api/importacion/formatos`: tipos, columnas, descripción y ejemplo de cada formato, para
  la pantalla futura.
- Todo exige el rol de Administrador. Archivo en UTF-8, separador coma o punto y coma (se
  detecta en la cabecera), máximo 5 000 filas y 2 MB.
- Script: `bun run --filter @acopio/api cargar <tipo> <archivo> [--aplicar] [--como <correo>]`.
  Sin `--aplicar` solo revisa. Usa los mismos servicios que el endpoint, en nombre del
  Administrador de `--como` (por defecto, el primero que creó el seed), porque causas,
  jornadas y movimientos guardan quién los creó. Decisión de Claude.

## 7. API pública

- `GET /api/acopios` acepta `tipos=OPERADO,REFERENCIADO`. Sin el parámetro devuelve solo
  operados, como hoy. Un referenciado oculto por el Administrador nunca sale.
- Cada acopio trae `tipo`. Un referenciado trae además
  `fuente: { nombre, url, actualizadoEn, estadoOriginal, necesidades, horario, contacto }`, y
  no trae «lo que urge», «no recibir» ni jornadas.
- `GET /api/acopios/:id` responde también por un referenciado, con la misma forma.
- `GET /api/publico/plataformas`: las activas, en su orden.
- Contrato OpenAPI y tipos de la web regenerados.

## 8. Web

Ninguna pantalla se escribe sin su maqueta aprobada por Joseph en
`docs/03-diseno/stitch/<código>-<nombre>/` (ADR-0011, ADR-0013).

- **P05 Mapa.** Pide `tipos=OPERADO,REFERENCIADO`. El referenciado se distingue con ícono y
  texto, no solo con color (RNF-11). Los filtros «qué recibe» y «qué no recibe» aplican solo a
  los operados (RF-RED-002).
- **P06 Ficha de referenciado.** Muestra el estado, el horario, las necesidades en su texto
  original y el contacto, con «Fuente: RedAcopio Bogotá · actualizado hace…» enlazado. No
  muestra «lo que urge», «preparar donación» ni voluntariado (RF-RED-003).
- **Otras plataformas.** Lista con nombre, categoría, descripción y enlace que abre afuera. Dónde
  se entra (portada, «Más» o mapa) lo decide la maqueta.

## 9. Orden de construcción

1. Especificación aprobada (fila 8a).
2. Maquetas en Stitch, en paralelo con el backend (8b).
3. Migración y reglas del referenciado en `acopio.dao.ts` y en los servicios que escriben.
4. Lector de RedAcopio con su prueba contra la copia; importador y ejecuciones.
5. Camino común del CSV y los ocho formatos, cada uno con su archivo de ejemplo.
6. API pública, contrato y tipos; `seed:demo` con la importación.
7. Pantallas (8d), si las maquetas están aprobadas.
8. Despliegue en Dokploy y recorridos (8e).

## 10. Pruebas

- Unitarias del lector: la copia guardada da 88 puntos y 9 plataformas. Un HTML sin el arreglo,
  o con un punto sin `lat`, aborta con un motivo legible.
- Integración del importador: importar dos veces no duplica; un punto que desaparece se cierra;
  `oculto_por_admin` sobrevive; una importación abortada no escribe nada.
- Integración de las reglas: un referenciado no recibe movimientos, jornadas, comprobantes ni
  asignaciones (409 `ACOPIO_REFERENCIADO`); el motor, el balance público y la consola no lo
  cuentan.
- Integración del CSV, por formato: el ejemplo se aplica; una fila mala devuelve su número, su
  columna y su mensaje, y no se escribe ninguna fila; un Operador recibe 403.
- Integración de la API pública: sin `tipos` no salen referenciados; con `tipos` salen con su
  `fuente`.
- Web, con las maquetas: el marcador distinto en P05 y la ficha reducida en P06, con sus pruebas
  de accesibilidad.
- Las pruebas usan siempre el adaptador de archivo; ninguna sale a internet.
- Un recorrido nuevo, `recorridos/referenciados.mjs`, abre el mapa, entra a un referenciado y
  revisa la atribución.

## 11. Criterios de salida

- [ ] Criterio 2 de HU-01: un acopio de RedAcopio Bogotá muestra solo los datos de esa fuente,
      con su nombre, su enlace y su antigüedad
- [ ] La copia guardada importa 88 puntos y 9 plataformas, y reimportar no cambia nada
- [ ] Cambiar `IMPORTACION_ORIGEN` a `http` no toca nada fuera del adaptador
- [ ] Los ocho formatos de CSV tienen ejemplo, revisan sin escribir y aplican todo o nada
- [ ] Un referenciado no aparece en el motor, el balance, la consola ni en ninguna escritura
- [ ] Verificación completa y recorridos en verde; servidor de pruebas con los 88 puntos

## 12. Riesgos

| Riesgo | Qué se hace |
|---|---|
| La migración toca `acopio`, que usa toda la demo | `tipo` con valor por defecto `OPERADO` y `entidad_id` que solo se relaja; despliegue a más tardar el miércoles 21 |
| Una consulta vieja cuenta referenciados (motor, balance, alcance) | Todas pasan por `acopio.dao.ts` y deben nombrar el tipo; pruebas de integración por cada una |
| RedAcopio cambia su HTML | La copia guardada no cambia; con la lectura programada apagada, el riesgo solo existe al encenderla, y entonces aborta sin escribir |
| No hay autorización expresa del operador (P-022) | User-Agent con contacto, una lectura por hora, atribución visible; escribirle sigue recomendado |
| Las maquetas no llegan a tiempo | Plan B automático: sin `tipos`, el portal no muestra referenciados |

## 13. Lo que decide quien construye

- Los nombres internos de clases y archivos dentro de `importacion`.
- La librería para leer CSV, siempre que no sume dependencias nativas.
- Cómo se reparten los ocho formatos entre commits.
- Los textos de error de cada columna, en el tono de los mensajes de la API.

## 14. Cambios al construir

(vacío)
