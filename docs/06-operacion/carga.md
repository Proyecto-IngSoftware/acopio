---
title: "Pruebas de carga de Acopio"
type: operacion
tags: [operacion, pruebas, rendimiento]
estado: vigente
actualizado: 2026-11-18
---

# Pruebas de carga de Acopio

Corre la API de cada versión con Node 22 y PostgreSQL 16, sobre copias de la misma base
sintética. Usa una instancia y datos desechables para las escrituras y los recálculos.
Anota el commit, recursos del servidor, número de instancias y tamaños de las tablas antes
de comparar. La [demo compartida](despliegue.md) se usa para los recorridos del equipo.

## Carga HTTP con k6

El escenario [carga-acopio.mjs](../../scripts/carga-acopio.mjs) inicia sesión una vez por
cuenta antes de la carga y etiqueta cada petición con el nombre de la operación. Usa un
Administrador para leer cualquier acopio y recalcular. Cada Operador necesita permiso
sobre el acopio al que enviará entradas.

Exporta `ACOPIO_CARGA_URL` con el origen de la API, `ACOPIO_CARGA_USUARIO` con la cuenta del
Administrador y `ACOPIO_CARGA_CLAVE` con su contraseña. Usa variables de entorno también
para las claves de los Operadores. El JSON de destinos contiene sus nombres de variable.

```sh
export ACOPIO_CARGA_DESTINOS='[
  {"acopio":"UUID_ACOPIO_A","categoria":"UUID_CATEGORIA_A","usuario":"operador1","variableClave":"CLAVE_OP1"},
  {"acopio":"UUID_ACOPIO_B","categoria":"UUID_CATEGORIA_B","usuario":"operador2","variableClave":"CLAVE_OP2"}
]'
k6 run --summary-mode full --out json=lecturas.json scripts/carga-acopio.mjs

export ACOPIO_CARGA_DATOS_SINTETICOS=si
for modo in repartidas mismo-par con-motor; do
  ACOPIO_CARGA_MODO="$modo" k6 run --summary-mode full --out "json=$modo.json" scripts/carga-acopio.mjs
done
```

Reemplaza los UUID por los del entorno. Para una categoría perecedera agrega al destino
`"venceEn":"AAAA-MM-DD"` con una fecha futura. El primer destino se usa para saldos e
historial. Si exportas `ACOPIO_CARGA_CURSOR` con una secuencia de esa categoría, k6 también
consulta una página profunda.

- `lecturas` intercala las peticiones de portada, mapa, saldos e historial.
- `repartidas` intercala lecturas con entradas distribuidas entre los destinos.
- `mismo-par` concentra las entradas en el primer acopio y categoría.
- `con-motor` intercala lecturas y entradas repartidas y dispara un recálculo a los 10 s.

La tasa sube hasta cinco iteraciones por segundo por defecto. Ajusta los tramos con
`ACOPIO_CARGA_ESCALONES`, un JSON de objetos con `duration` y `target`. Si aparecen HTTP 429,
revisa el límite por ruta y cliente antes de interpretar la curva. Compara p50, p95 y p99
por `name` en `http_req_duration`, los estados HTTP y las iteraciones descartadas.
La prueba usa p95 para contrastar los objetivos de 200 ms en saldos y 500 ms por entrada.

## PostgreSQL y proceso de la API

- Habilita `pg_stat_statements` en la base de carga y toma dos capturas, antes y después,
  de llamadas, tiempo total, filas y bloques leídos. Durante la carga, muestrea
  `pg_stat_activity` y `pg_locks` para atribuir la espera a SQL o candados.
- Usa `EXPLAIN (ANALYZE, BUFFERS)` para comparar filas procesadas en saldos, historial y
  capa pública. Guarda un plan del inicio del historial y otro de una página profunda.
- Recoge CPU por proceso, `waitingCount` del pool de `pg` si está instrumentado y retraso
  del bucle principal con `monitorEventLoopDelay` de Node. El log de depuración del motor
  separa espera de su candado, lectura, cálculo y escritura.
- Mide el tiempo hasta contenido útil en Chromium con Playwright, contexto nuevo y 3G
  emulado. El objetivo de portada del [RNF-05](../01-requerimientos/no-funcionales.md#rnf-05--rendimiento)
  es de extremo a extremo.

Repite los ensayos con la misma carga tras cada cambio. Corre el caso del motor con
50 zonas y 40 categorías para verificar los 5 s y con el volumen de preproducción para
ver cómo se comportan las demás rutas mientras recalcula.
