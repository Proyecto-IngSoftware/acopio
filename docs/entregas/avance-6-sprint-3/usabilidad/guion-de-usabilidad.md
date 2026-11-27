---
title: "Prueba de usabilidad con personas · Sprint 3"
type: entrega
tags: [entregas, pruebas, usabilidad]
estado: borrador
actualizado: 2026-11-27
---

# Prueba de usabilidad con personas · Sprint 3

La guía del Sprint 3 pide un escenario de usabilidad con usuarios reales. Este guion lo corre
Joseph con 3 a 5 personas que no conozcan Acopio, una a la vez, en
`https://acopio.josephqaz.dev` desde su propio teléfono. Cada sesión dura unos 20 minutos.

## Qué se evalúa

| Elemento | Contenido |
|---|---|
| Atributo y riesgo | Usabilidad del portal público y del flujo del Donador. Riesgo: que alguien que quiere ayudar no encuentre qué se necesita o no termine su donación y la abandone. |
| Condiciones | Servidor de pruebas con la versión desplegada, teléfono de la persona, datos de la demo. Cuenta de Donador de la demo, con la contraseña que se entrega en el momento y no se escribe aquí. |
| Procedimiento | Cuatro tareas sin ayuda, con cronómetro. Después, el cuestionario SUS de 10 preguntas. |
| Resultado | Tasa de éxito por tarea, tiempo, errores y puntaje SUS (de 0 a 100). Se compara con 68, el promedio de referencia del SUS. |
| Evidencia | `registro.csv` lleno, una foto o captura de una sesión (sin cara si la persona no quiere) y las notas. |

## Antes de empezar

Se le lee a la persona:

> Vamos a probar una aplicación, no a ti. Si algo no te sale, es un problema de la aplicación y
> nos sirve saberlo. Piensa en voz alta mientras la usas. No te voy a ayudar durante las tareas;
> si te rindes, dime y pasamos a la siguiente. Tus respuestas se anotan sin tu nombre. ¿Estás de
> acuerdo?

Se anota solo un código (P1, P2…), la edad aproximada y si ha donado antes a un centro de acopio.

## Tareas

Se lee cada tarea en voz alta y se arranca el cronómetro. Se para cuando la persona dice que
terminó o que se rinde. Una tarea se marca **sí** si la completa sola, **con ayuda** si hubo que
darle una pista y **no** si se rinde o pasan 5 minutos.

1. **Encontrar una necesidad.** «Quieres llevar comida a un centro de acopio cercano. Averigua
   qué productos se necesitan más ahora mismo.» Se completa cuando la persona nombra al menos un
   producto que el portal muestra como necesidad.
2. **Preparar una donación.** «Entra con esta cuenta de Donador [se la entregas] y prepara una
   donación de dos productos para un acopio.» Se completa cuando aparece el folio de la donación.
3. **Seguir la donación.** «Revisa en qué estado va la donación que acabas de preparar.» Se
   completa cuando la persona ve la pantalla de seguimiento de ese folio.
4. **Reservar un turno.** «Quieres ayudar como voluntario un día de esta semana. Reserva un
   turno.» Se completa cuando aparece el código de la reserva. Al terminar se cancela desde el
   mismo enlace, para no dejar cupos ocupados.

En cada tarea se anotan los errores: un toque en algo que no lleva a la meta y obliga a volver
atrás, o una pregunta del tipo «¿y ahora qué?».

## Cuestionario SUS

Al final, la persona responde cada frase de 1 (totalmente en desacuerdo) a 5 (totalmente de
acuerdo):

1. Creo que me gustaría usar esta aplicación con frecuencia.
2. Encontré la aplicación innecesariamente complicada.
3. Pensé que la aplicación era fácil de usar.
4. Creo que necesitaría ayuda de una persona con conocimientos técnicos para usarla.
5. Las funciones de la aplicación están bien integradas.
6. Pensé que había demasiadas inconsistencias en la aplicación.
7. Imagino que la mayoría de las personas aprenderían a usarla muy rápido.
8. Encontré la aplicación muy difícil de usar.
9. Me sentí muy seguro usando la aplicación.
10. Necesité aprender muchas cosas antes de poder manejar la aplicación.

Cálculo por persona: a cada respuesta impar se le resta 1, y cada respuesta par se le resta a 5.
La suma de los diez valores se multiplica por 2,5. El puntaje de la prueba es el promedio de las
personas.

Para cerrar se hacen dos preguntas abiertas: «¿Qué fue lo más confuso?» y «¿Qué cambiarías
primero?».

## Registro

Cada sesión es una fila de [registro.csv](registro.csv). Cuando estén todas, Claude calcula el
SUS y las tasas, y redacta el resultado en el Avance 6.
