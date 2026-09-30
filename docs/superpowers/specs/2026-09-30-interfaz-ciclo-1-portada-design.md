---
title: "Interfaz · Ciclo 1: cimientos y Portada · especificación"
type: spec
tags: [spec, interfaz, bloque-0]
estado: vigente
bloque: 0
actualizado: 2026-09-30
---

# Interfaz · Ciclo 1: cimientos y Portada · especificación

**Fecha:** 2026-09-30
**Estado:** aprobada por Joseph el 2026-09-30
**Deriva de:** [Bloque 0 · Cimientos](2026-09-28-bloque-0-cimientos-design.md) §8 y
[ADR-0011](../../02-arquitectura/adr/ADR-0011-interfaz-con-stitch.md)
**Plan:** [05-planes/2026-09-30-interfaz-ciclo-1-portada.md](../../05-planes/2026-09-30-interfaz-ciclo-1-portada.md)

## 1. Objetivo

Tener la primera pantalla de Acopio corriendo en el navegador sobre una base que
sirva para todas las demás: el esqueleto de `apps/web`, los tokens, los componentes
base y el cliente de la API.

La pantalla elegida es la Portada pública (P01), que ya está diseñada en el proyecto
«ACOPIO DISEÑO» de Google Stitch.

El ciclo termina cuando alguien abre `http://localhost:5173` en un teléfono de
360 × 640 px, sin cuenta, y ve la Portada con las emergencias activas que devuelve la
API. Los bloques que dependen de módulos sin construir muestran un estado vacío que
dice qué falta.

## 2. Alcance

### Dentro

| Área | Qué | Referencia |
|---|---|---|
| Flujo con Stitch | Cómo se guarda cada diseño y cómo pasa a código | ADR-0011 lo dejó pendiente |
| Sistema de diseño | `sistema-diseno.md` y ADR-0006 se alinean con el tema de Stitch | I-03 |
| `packages/ui-tokens` | Tokens como variables CSS y como tema de Tailwind | sistema de diseño §10, ADR-0006 |
| `apps/web` | Vite, React, TypeScript, Tailwind, React Router | ADR-0011 |
| Cliente de la API | Tipos generados desde el contrato OpenAPI | [contrato](../../03-diseno/api/README.md) |
| Componentes base | Los que usa la Portada: botón, estados vacío, de carga y de error, y barra de navegación. El distintivo de estado del inventario llega con el primer bloque que lo use | sistema de diseño §5 |
| Portada (P01) | Pantalla completa con su navegación inferior | RF-HOM-001, RF-HOM-002 |
| API | `GET /api/emergencias` se puede leer sin sesión | RF-HOM-001 |
| CI | `apps/web` entra a lint, tipos y pruebas; el revisor de colores empieza a aplicar | RNF-13 |

### Fuera, y a dónde va

| Qué | Cuándo | Por qué no ahora |
|---|---|---|
| Inicio de sesión (C01) y `ClienteAuth` | Ciclo 2 | La Portada es pública y no los necesita |
| Consola: C02, C16, C17, C18 | Ciclo 2 en adelante | Dependen del inicio de sesión. No están diseñadas en Stitch todavía |
| Mapa, Causas, Voluntariado y Más | Con su módulo de backend | En este ciclo son una página «Próximamente» |
| Datos de inventario, motor, turnos y comprobantes en la Portada | Con cada módulo | El backend no los tiene |
| Cifras vivas, carrusel de entidades y noticias de RF-HOM-001 | Bloque 1 | Salen de `acopios` y de causas |
| Hero legible sin JavaScript (RF-HOM-001) | Por decidir | Una SPA no lo cumple sin una página estática aparte. Queda anotado en [pendientes](../../01-requerimientos/pendientes.md) |
| Imagen de `web` con nginx y el servicio en el Compose | Antes del primer despliegue | En este ciclo basta el servidor de Vite |
| Modo sin conexión | Bloque 2 | ADR-0005 lo limita a los movimientos |

## 3. Decisiones de este ciclo

Tomadas por Joseph el 2026-09-30.

| # | Decisión | Alternativa descartada y por qué |
|---|---|---|
| I-01 | El primer ciclo construye los cimientos y la Portada. Usuarios y el resto de la consola van después | Empezar por el inicio de sesión y el tablero: prueba la cadena con la API, pero deja para más tarde la pantalla que ve todo el mundo |
| I-02 | Los bloques de la Portada sin backend muestran un estado vacío | Datos simulados detrás del cliente de la API: es trabajo que se tira y roza la regla de ADR-0011. Recortar los bloques: la pantalla no se parecería al diseño |
| I-03 | Manda el diseño de Stitch, con su tema «Acopio Field Command». Los tokens de `packages/ui-tokens` salen de ese tema, y `sistema-diseno.md` y ADR-0006 se alinean con él. Cambiada el 2026-09-30: la primera versión ponía a mandar la paleta de la bóveda, y la Portada montada así no convenció | Mantener la paleta de la bóveda y corregir Stitch: se probó y el resultado perdió lo que el diseño de Stitch tenía resuelto |
| I-04 | Cada pantalla se escribe con componentes propios y el HTML de Stitch queda como referencia | Convertir el HTML a JSX: cada pantalla trae su marcado repetido y decenas de colores escritos a mano |
| I-05 | Las pruebas de `apps/web` corren con Vitest y Testing Library. Jest sigue en la API y en `packages/shared` | Jest también en la web, como dice ADR-0008: obliga a mantener una segunda configuración de transformación junto a la de Vite |
| I-06 | La lectura de emergencias es pública | Un endpoint aparte para el portal: duplicaría una consulta que ya existe |

## 4. Flujo con Stitch

Proyecto: «ACOPIO DISEÑO», identificador `10306891818878200068`.

1. El tema del proyecto en Stitch, «Acopio Field Command», es la referencia de color,
   tipografía y forma. No se modifica desde aquí.
2. La pantalla se diseña o se ajusta en Stitch.
3. Se guarda en `docs/03-diseno/stitch/<codigo>-<nombre>/`:
   - `captura.png`
   - `pantalla.html`, el código que exporta Stitch
   - `README.md` con el identificador de la pantalla en Stitch, la fecha de
     exportación y las diferencias aceptadas entre el diseño y lo construido
   - `maqueta.html`, la pantalla tal como se va a construir, con los tokens reales y
     sus estados vacíos
4. La maqueta se publica como artefacto y Joseph la aprueba. Sin esa aprobación no se
   escribe código de la pantalla.
5. La pantalla se escribe en `apps/web` con los componentes base y los tokens. El
   código de `apps/web` nunca importa nada de `docs/`.
6. Se compara en 360 × 640 px contra la maqueta aprobada, con la app levantada.

Si una pantalla necesita un componente que no existe, el componente se agrega a la
base y no a la pantalla.

## 5. Estructura

```
packages/ui-tokens/
  src/tokens.css        variables CSS: color, tipografía, espaciado, radio
  src/tailwind.css      tema de Tailwind que lee esas variables
apps/web/
  index.html
  src/
    main.tsx            arranque, enrutador y cliente de consultas
    rutas.tsx           tabla de rutas
    api/
      esquema.d.ts      generado desde openapi.json, no se edita
      cliente.ts        cliente tipado; base de la URL desde VITE_API_URL
      emergencias.ts    consulta de emergencias
    componentes/        componentes base
    portal/
      Portada.tsx
      BarraNavegacion.tsx
      Proximamente.tsx
      bloques/          un archivo por bloque de la Portada
```

`packages/ui-tokens` es el único lugar donde se escribe un color hexadecimal.
`scripts/revisar-colores.sh` ya falla si aparece uno en `apps/web/src`.

Rutas de este ciclo:

| Ruta | Pantalla |
|---|---|
| `/` | Portada |
| `/mapa`, `/causas`, `/voluntariado`, `/mas`, `/entrar` | Próximamente |
| cualquier otra | No encontrada, con enlace a la Portada |

El espacio `/consola/*` queda reservado para el ciclo 2.

En desarrollo Vite corre en el puerto 5173, que es el `APP_URL` que la API ya acepta
por CORS. `VITE_API_URL` apunta a `http://localhost:3000`, sin `/api` porque las rutas del
contrato ya lo traen, y se documenta en
`.env.example`. Ninguna variable `VITE_*` lleva secretos.

## 6. Cliente de la API

Los tipos se generan desde `docs/03-diseno/api/openapi.json` con un script de
`apps/web`. El archivo generado se versiona, así un cambio de contrato aparece en el
diff y rompe la compilación de la pantalla que lo usa.

Las lecturas pasan por TanStack Query, que entrega los estados de carga, error y
datos que los componentes ya necesitan distinguir.

Los errores de la API llegan con la forma `{ estado, codigo, mensaje }`. El cliente
los convierte en un error con esos tres campos y las pantallas muestran `mensaje`.

## 7. Cambio en la API

`GET /api/emergencias` se marca con `@Publico()`. Crear, editar y cerrar una
emergencia sigue exigiendo el rol de administrador.

La respuesta trae nombre, tipo, fecha de inicio, horizonte en días, estado, fecha
hasta la que se destaca y, si está cerrada, cuándo se cerró y el motivo. Ninguno es un
dato personal ni interno, así que la respuesta pública es la misma que ya existe.

Después del cambio se regenera `openapi.json` y se actualiza la tabla de endpoints de
[api/README.md](../../03-diseno/api/README.md).

## 8. La Portada

Referencia: pantalla «Portada Móvil - Acopio» del proyecto de Stitch.

| Bloque | Origen de los datos | En este ciclo |
|---|---|---|
| Encabezado con marca y botón «Entrar» | Fijo | «Entrar» lleva a Próximamente |
| Emergencia activa y selector | `GET /api/emergencias` | Datos reales. Activas primero, la más reciente arriba; luego las que están en seguimiento (ADR-0010) |
| Zonas sin cobertura | `motor` | Estado vacío |
| Qué hace falta y No traigan | `inventario` | Estado vacío |
| Cómo apoyar | Fijo | Tres acciones de igual peso más el acceso a rastrear un folio. Llevan a Próximamente |
| Jornadas de voluntariado | `turnos` | Estado vacío |
| Reporte en terreno | causas y publicaciones | Estado vacío |
| Aviso de que la plataforma no recibe dinero | Fijo | Siempre visible (RF-HOM-001) |
| Nota de la Ley 1581 | Fijo | Texto al pie |
| Barra de navegación inferior | Fijo | Inicio, Mapa, Causas, Voluntariado y Más |

Cada estado vacío dice qué mostrará el bloque y por qué está vacío, por ejemplo:
«Aquí verás qué insumos hacen falta en cada acopio. Todavía no hay acopios
registrados.» No lleva botón, porque el visitante no puede hacer nada para llenarlo.

Estados de la pantalla completa:

- Cargando: esqueleto con la forma del bloque de emergencia. El contenido fijo se ve
  desde el primer momento.
- Error de red o de la API: mensaje con lo que pasó y un botón para reintentar. El
  contenido fijo sigue visible.
- Sin emergencias activas ni en seguimiento: el bloque lo dice, y los bloques que
  dependen de una emergencia no se muestran.

El selector de emergencia guarda la elección en la URL (`?emergencia=<id>`), para que
el enlace se pueda compartir y la elección sobreviva a una recarga.

La barra inferior del portal tiene cinco destinos, como en el diseño de Stitch. El
máximo de cuatro que fija el sistema de diseño (§6) habla de la consola.

## 9. Accesibilidad y texto

- Móvil primero. La Portada se revisa en 360 × 640 px y debe leerse sin
  desplazamiento horizontal.
- Texto de datos en 16 px como mínimo, según el sistema de diseño §3.
- Todo estado lleva ícono y texto además del color.
- Áreas tocables de 48 px o más.
- axe-core sin violaciones críticas ni serias.
- Los textos salen del [glosario](../../00-contexto/glosario.md). Números y fechas con
  el formato de `packages/shared`.

## 10. Pruebas

| Qué | Cómo |
|---|---|
| Componentes base | Vitest y Testing Library: cada variante se dibuja y responde al teclado |
| Portada con emergencias | La API se simula en la prueba. Aparecen en el orden de ADR-0010 y el selector cambia la elegida |
| Portada cargando, con error y sin emergencias | Una prueba por estado |
| Accesibilidad | axe-core sobre la Portada en cada uno de sus estados |
| Lectura pública | Prueba de integración en la API: `GET /api/emergencias` responde 200 sin sesión; `POST` responde 401 sin sesión y 403 sin rol de administrador |
| Recorrido real | Con el Compose arriba y una emergencia creada, la Portada la muestra en el navegador a 360 × 640 px |

## 11. Criterios de salida

- [x] ~~El tema del proyecto en Stitch usa la paleta del sistema de diseño~~ Cambió con
      I-03: el sistema de diseño se alineó al tema de Stitch (ADR-0013)
- [x] `docs/03-diseno/stitch/P01-portada/` tiene captura, HTML, maqueta y nota
- [x] `bun install && bun run --filter @acopio/web dev` levanta la Portada
- [x] La Portada muestra las emergencias de la API sin iniciar sesión
- [x] Los estados vacíos se leen y ninguno muestra datos inventados
- [x] `bun run lint`, `typecheck`, `test` y `test:int` pasan, con `apps/web` incluido
- [x] `scripts/revisar-colores.sh` revisa `apps/web` y pasa
- [x] axe-core sin violaciones críticas ni serias en la Portada, en el navegador a 360 × 640
- [ ] El CI de `main` queda en verde

### Cambios al construir

| Qué | Por qué |
|---|---|
| Manda el diseño de Stitch y no la paleta de la bóveda (I-03, ADR-0013) | La Portada con la paleta de la bóveda no convenció |
| Los tokens llevan los nombres de Stitch | El marcado de Stitch pasa a código sin traducir clases |
| Íconos de Material Symbols desde Google Fonts, con `icon_names` | Son los del diseño; el parámetro baja solo los que se usan |
| `VITE_API_URL` es el origen sin `/api` | Las rutas del contrato ya lo traen |
| El GET de emergencias lleva `@ApiOperation({ security: [] })` además de `@Publico()` | El `@ApiBearerAuth` del controlador lo marcaba como protegido en el contrato |
| El distintivo de estado del inventario no se construyó | Ningún bloque del ciclo lo usa. La escala de estados sigue por aprobar (ADR-0013) |
| La cabecera no muestra «Sincronizado» | El portal no sincroniza nada; afirmaría algo falso |
| El campo de folio lleva `aria-label` | El diseño no tenía etiqueta y axe lo marca como grave |
| La línea de la Ley 1581 usa `on-surface-variant` en vez de `outline` | Con `outline` no llegaba al contraste AA |
| El bundle de producción pesa 163 kB comprimido | Queda por revisar contra RF-HOM-001 (3 s en 3G) |

## 12. Riesgos

| Riesgo | Qué se hace |
|---|---|
| Al cambiar el tema, Stitch regenera la Portada distinta a la que ya gustó | Se guarda la captura actual antes de tocar el tema. Si el resultado se aleja, se edita la pantalla en Stitch en vez de regenerarla |
| TypeScript 6 o Bun no se llevan bien con alguna herramienta de la web | Se prueba el esqueleto completo (lint, tipos, pruebas y build) antes de escribir la Portada |
| La Portada con varios bloques vacíos se ve pobre en una demostración | Es el costo aceptado de I-02. Cada bloque se llena cuando llega su módulo |
| El generador de tipos no entiende algo del `openapi.json` de nestjs-zod | Se detecta en la primera tarea del cliente. Si falla, se corrige el contrato en la API |
