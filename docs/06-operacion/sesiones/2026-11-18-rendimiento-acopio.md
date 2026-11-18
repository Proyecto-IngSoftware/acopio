---
title: "Sesión 2026-11-18 · Rendimiento y concurrencia de Acopio"
type: informe
tags: [operacion, sesion, rendimiento]
estado: vigente
actualizado: 2026-11-18
---

# Sesión 2026-11-18 · Rendimiento y concurrencia de Acopio

Se fijó el reloj de las pruebas web que bloqueaban el CI y se corrigieron los hallazgos
de inventario, motor, mapa público y correo. Las mediciones se hicieron en un entorno
local desechable con Node 22 y PostgreSQL 16.

## Qué cambió

- Saldos agrega en SQL por categoría y lote. Historial pagina por secuencia y conserva
  el saldo por fila mediante los bloques del [ADR-0025](../../02-arquitectura/adr/ADR-0025-saldos-del-historial-por-bloques.md).
- El cálculo del motor corre en un hilo de trabajo. Las llamadas simultáneas a una
  instancia comparten la ronda. El candado global y la transacción conservan la
  sustitución atómica de propuestas.
- La portada usa un solo balance para su titular y su panel. Las ubicaciones
  asignadas se filtran en SQL. El mapa limita los reportes por fecha y comprueba si
  están resueltos después de elegir el más nuevo.
- nginx comprime con gzip el JavaScript y el CSS de `/assets/`.
- La tarea de turnos reclama cada recordatorio antes de encolarlo. La cola renueva el
  préstamo durante el envío y exige el identificador de reclamo para registrar el
  resultado.

## Pruebas

Pasaron 1256 pruebas de la web, 116 de shared, 103 unitarias de la API y 563 de integración. Las seis
suites de integración que cubren los cambios finales volvieron a pasar, con 35 pruebas.
Se verificaron tipos, lint, dependencias entre módulos, colores y los builds de la
API y la web.

k6 2.4.0 ejecutó los cuatro modos de la [guía de carga](../carga.md). La comparación
siguiente corresponde a una corrida mixta por versión, con unos 100.000 movimientos
en el mismo acopio y categoría, 190.000 reportes históricos adicionales y un recálculo.
Se usaron 10 s de subida a 3 iteraciones/s y 16 s de subida a 8. Ambas corridas tuvieron
cero errores HTTP y cero iteraciones descartadas.

| Operación | p95 anterior | p95 con cambios |
|---|---:|---:|
| Saldos | 486 ms | 37 ms |
| Historial, primera página | 270 ms | 7,5 ms |
| Historial, página profunda | 150 ms | 5,9 ms |
| Balance de portada | 25 ms | 11 ms |
| Reportes del mapa | 467 ms | 30 ms |
| Registro de entrada | 230 ms | 28 ms |

El recálculo tomó 0,71 s en la primera corrida y 1,04 s en la segunda. El log de la
segunda separó 1 ms de espera del candado, 106 ms de lectura, 318 ms de cálculo y
598 ms de escritura. Las cifras de latencia son de una muestra corta y local.
`EXPLAIN (ANALYZE, BUFFERS)` mostró que la ventana del historial pasó de unas 100.000
filas a 51. PostgreSQL usó el índice por fecha para leer 13.302 de 190.002 reportes.

En Chromium con 3G emulado, nginx 1.28 sirvió la portada compilada. El titular útil
apareció entre 3,48 y 3,54 s en tres aperturas. Al activar gzip para CSS y JavaScript,
apareció entre 2,06 y 2,07 s. Las seis aperturas hicieron una petición a balance
y cero a necesidades.

## Decisiones

Se usó el p95 para contrastar los objetivos de saldos y escritura del RNF-05.
El libro de movimientos sigue siendo la fuente de verdad. Los totales de cada
bloque histórico se rellenan al migrar y se mantienen junto a cada escritura.

## Errores y correcciones

La primera repetición de integración heredó la configuración de captcha del entorno de
carga. Se corrió de nuevo con la configuración del entorno de pruebas. Una prueba de
Portada esperaba el título provisional tras recuperarse de un fallo de red. Ahora espera
el titular que muestra el balance vacío y la suite quedó en verde.

## Pendiente

- Repetir la carga con preproducción aislada y datos representativos. Medir la espera
  del pool, los candados, el costo del relleno histórico y la portada servida por nginx.
  [P-090](../../01-requerimientos/pendientes.md#p-090--validar-la-carga-en-preproducción-aislada)

## Depende de Joseph

- Identificar un entorno aislado para el ensayo de preproducción si la demo de Dokploy
  se sigue usando para los recorridos. [P-090](../../01-requerimientos/pendientes.md#p-090--validar-la-carga-en-preproducción-aislada)
