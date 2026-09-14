---
title: "Historias de usuario"
type: requerimientos
tags: [requerimientos, historias]
estado: vigente
actualizado: 2026-09-12
---

# Historias de usuario

Complemento de los [requerimientos funcionales](../funcionales/), no sustituto.

Los `RF` dicen **qué hace el sistema**. Las historias dicen **por qué le importa a
alguien**. Se necesitan las dos: un `RF` sin historia se construye sin entender a
quién sirve; una historia sin `RF` no se puede verificar.

## Formato

```markdown
### HU-000 · Título
**Como** <actor de [actores.md](../../00-contexto/actores.md)>
**quiero** <acción>
**para** <beneficio real, no una repetición de la acción>

**Contexto:** dónde está esta persona y en qué condiciones.
**Cubre:** RF-XXX-001, RF-XXX-002
```

El «para» es la parte que se hace mal. *«…para poder registrar entradas»* no es un
beneficio, es la acción otra vez. *«…para no tener que recordar qué llegó cuando
me pregunten al final del día»* sí lo es.

## Historias semilla

### HU-001 · Saber qué comprar antes de salir
**Como** donante en especie
**quiero** ver qué le falta a los acopios cercanos
**para** no comprar justo lo que ya les sobra

**Contexto:** en el supermercado, con el carrito, decidiendo qué llevar.
**Cubre:** RF-RED-002, RF-RED-003, RF-INV-008

### HU-002 · No viajar en vano
**Como** voluntario
**quiero** reservar un cupo antes de desplazarme
**para** no cruzar la ciudad y que me devuelvan porque ya hay suficiente gente

**Contexto:** en casa, planeando el sábado.
**Cubre:** RF-TUR-002, RF-TUR-003, RF-TUR-004

### HU-003 · Registrar sin frenar la fila
**Como** operador de acopio
**quiero** registrar una entrada en menos de diez segundos
**para** no detener la descarga ni dejar de anotar por falta de tiempo

**Contexto:** de pie junto al camión, con guantes, con gente esperando.
**Cubre:** RF-INV-001, RF-INV-002, RF-CAT-002

### HU-004 · Frenar lo que ya sobra
**Como** operador de acopio
**quiero** marcar una categoría como «no recibir» y que se vea en el mapa
**para** dejar de recibir agua cuando ya no me cabe

**Contexto:** bodega llena, sin espacio para más.
**Cubre:** RF-INV-008, RF-RED-003

### HU-005 · Mandar lo que falta a donde falta
**Como** administrador
**quiero** ver qué zonas están peor cubiertas y qué acopios tienen excedente
**para** decidir el próximo envío con un dato, no con una corazonada

**Contexto:** sentado, con calma, planeando la logística del día.
**Cubre:** RF-MOT-005, RF-MOT-006, RF-MOT-007

### HU-006 · Comprobar que mi donación llegó
**Como** Donador
**quiero** consultar el recorrido de mi donación con un folio
**para** confiar en que sirvió y volver a donar

**Contexto:** días después, desde el correo de confirmación o su propio historial.
**Cubre:** RF-CMP-001B, RF-CMP-006, RF-CMP-007, RF-CMP-008

### HU-007 · Seguir trabajando sin señal
**Como** operador de acopio
**quiero** registrar movimientos aunque no tenga datos
**para** no perder el registro de lo que llegó mientras la señal falló

**Contexto:** bodega en sótano, sin cobertura.
**Cubre:** RF-INV-009

### HU-008 · Dar acceso sin conocer contraseñas
**Como** administrador
**quiero** crear un usuario y enviarle un enlace para que él defina su contraseña
**para** poder darle acceso sin quedar en posición de alterar su información

**Contexto:** llega un voluntario de confianza que va a manejar un acopio.
**Cubre:** RF-IDE-001, RF-IDE-002, RF-IDE-003

---

Las historias que falten se agregan a medida que se detallen los bloques. Cada una
debe apuntar a `RF` existentes: si una historia no tiene `RF` que la cubra, o falta
el requerimiento, o la historia está fuera de alcance.
