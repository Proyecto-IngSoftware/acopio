# Copia de RedAcopio Bogotá

Lectura única de <https://redacopiobogota.com/> (`portada.html`) y de
<https://redacopiobogota.com/herramientas> (`herramientas.html`), hecha el 2026-10-18 con un
User-Agent que nombra a Acopio. Trae 88 puntos verificados (55 abiertos, 31 cerrados, 1 lleno y
1 sin información) y 9 plataformas.

Es la base de desarrollo y de pruebas: el adaptador `RedAcopioArchivo` la lee y nadie le pide la
página a RedAcopio en cada corrida. No se edita a mano; si se renueva, se reemplazan los dos
archivos y se actualizan las cifras de `lector.test.ts`.
