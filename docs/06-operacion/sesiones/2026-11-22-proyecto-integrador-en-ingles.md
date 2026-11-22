---
title: "Sesión 2026-11-22 · Proyecto integrador en inglés"
type: informe
tags: [operacion, sesion]
estado: vigente
actualizado: 2026-11-22
---

# Sesión 2026-11-22 · Proyecto integrador en inglés

Joseph pidió pasar a inglés el proyecto integrador y compararlo con las instrucciones de la asignación de Teams. El documento quedó en inglés y tiene los nueve elementos que piden.

## Qué cambió

| Archivo | Qué trae |
|---|---|
| [proyecto-pics.md](../../entregas/proyecto-integrador-ingles/proyecto-pics.md) | Texto completo en inglés. La versión en español está en el commit `55c4b42` |
| [generar-pics.py](../../entregas/proyecto-integrador-ingles/generar-pics.py) | Portada, encabezado y rótulos en inglés. El índice sale de los encabezados del texto. También genera el abstract suelto |
| [generar-figuras.py](../../entregas/proyecto-integrador-ingles/generar-figuras.py) | Los cinco esquemas con rótulos en inglés |
| [Acopio - Integrative Project.pdf](../../entregas/proyecto-integrador-ingles/Acopio%20-%20Integrative%20Project.pdf) y su Word | La entrega, de 32 páginas |
| [Acopio - Abstract.pdf](../../entregas/proyecto-integrador-ingles/Acopio%20-%20Abstract.pdf) y su Word | Una página, con los nombres completos de los autores |
| [guion-video.md](../../entregas/proyecto-integrador-ingles/guion-video.md) | Guion del video, por diapositiva y por persona, con tiempos, pronunciación e indicaciones de grabación |
| [generar-presentacion.py](../../entregas/proyecto-integrador-ingles/generar-presentacion.py) | Genera la [presentación del video](../../entregas/proyecto-integrador-ingles/Acopio%20-%20Video%20Presentation.html), de 14 diapositivas, con capturas señaladas, animaciones y el personaje guía Copi. [exportar-presentacion.cjs](../../entregas/proyecto-integrador-ingles/exportar-presentacion.cjs) saca las 20 imágenes que forman el [PDF](../../entregas/proyecto-integrador-ingles/Acopio%20-%20Video%20Presentation.pdf) |
| [Acopio - Presentación.html](../../entregas/presentacion-final/Acopio%20-%20Presentación.html) y su [PDF](../../entregas/presentacion-final/Acopio%20-%20Presentación.pdf) | La misma presentación en español y sin docente, para sustentar y socializar. Sus textos están en [presentacion_es.py](../../entregas/proyecto-integrador-ingles/presentacion_es.py) y el generador falla si falta alguno |

El Word y el PDF en español siguen en la carpeta, sin cambios. La copia local de esos dos archivos es más reciente que la de `main` y quedó sin subir, igual que los demás cambios locales de otras sesiones.

## Pruebas

Las 28 entradas del índice coinciden con las páginas, tanto en el PDF de LibreOffice como en el que exporta Word. El abstract tiene 246 palabras sin contar las palabras clave. Se revisaron las páginas renderizadas y se buscó español fuera de la bibliografía: quedan nombres propios y los rótulos de pantalla que traducen las notas. La presentación se abrió en Chromium a 1920 × 1080: las 14 diapositivas caben, dejan libre la esquina de la cámara, responden al teclado y a los puntos de navegación y no dan errores de consola. Con las animaciones activas se revisaron las transiciones de las diapositivas 9 y 10; en reposo no queda ninguna corriendo y con movimiento reducido no hay ninguna. El guion tiene 521 palabras: 4:44 a 110 por minuto y 4:00 a 130, sin contar pausas. No se ha ensayado con cronómetro. Antes del PR pasaron lint, tipos, depcruise, colores, 1.478 unitarias y 566 de integración en un worktree sobre la rama principal.

## Decisiones

Joseph indicó que el trabajo va dirigido a Jorge Albeiro Betancourt Manjarres, que la portada lleva la fecha de hoy, 22 de noviembre de 2026, y que los archivos no se subían al repositorio. Al cerrar pidió subir todo a producción, con los nombres completos en un repositorio público, y se abrió el PR.

También pidió ajustar el guion y hacer una presentación nueva a partir de la de la Entrega 2, para alguien que no conoce el proyecto. Las instrucciones del video piden de 3 a 5 minutos y que las personas aparezcan.

Las demás las tomó Claude al adaptar el material:

- Se conserva el orden de la plantilla PICS. La pregunta problema, el marco teórico, los alcances y las conclusiones tienen encabezado propio y salen en el índice.
- El marco teórico pasó de «Antecedentes» a «Project development», donde lo ubican las instrucciones.
- Se quitó el «Resumen» en español, que repetía el abstract.
- El abstract nombra el título y trae los resultados del 19 de octubre, que constan en los [recorridos](../recorridos.md).
- La justificación declara el propósito y las conclusiones responden la pregunta problema con lo que ya decía el informe.
- Las capturas siguen en español porque así está la aplicación. Las notas traducen los rótulos principales.
- La presentación conserva los colores y la tipografía de la Entrega 2. Cambió los diagramas técnicos por una introducción, un ejemplo del cálculo y las pantallas con rótulos en inglés.
- Joseph rechazó la primera versión de la presentación por simple y pidió capturas, animación y un asistente. La presentación pasó a ser la ruta de una donación: el paisaje avanza y Copi, una caja de acopio dibujada para esto, camina y aclara un dato en cada diapositiva.
- Joseph pidió también la presentación en español y sin el nombre del docente. Se hizo como archivo aparte y la de inglés quedó igual byte a byte. La portada dice «Bogotá, noviembre de 2026» para poder usarla en otra fecha.
- El guion ya no trae la secuencia de demostración en vivo, porque el video usa capturas.

## Errores y correcciones

La primera presentación se entregó con diagramas simples y sin movimiento, aunque iba para un video. LibreOffice no arrancaba en el contenedor con el usuario del equipo. Se le dio un perfil en `/tmp`.

## Pendiente

Nada por escribir. La entrega depende de los pasos de abajo.

## Depende de Joseph

Imprimir el documento, subir los archivos a Teams y grabar el video con el [guion](../../entregas/proyecto-integrador-ingles/guion-video.md).
