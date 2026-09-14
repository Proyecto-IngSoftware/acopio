---
title: "RF-TUR · Turnos y aforo"
type: requerimientos
tags: [requerimientos, rf]
estado: vigente
modulo: turnos
bloque: 5
actualizado: 2026-08-20
---

# RF-TUR · Turnos y aforo

**Bloque 5**

Principio: **el aforo publicado es de reservas, no de presencia real.** La interfaz
lo dice con esas palabras; no se finge un dato que no se tiene.

---

### RF-TUR-001 · Crear jornada
**Actor:** Operador · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] Acopio, fecha, hora de inicio y fin, cupo máximo, descripción de la labor
- [ ] Requisitos opcionales: edad mínima, ropa cerrada, capacidad de carga
- [ ] Se pueden crear jornadas repetidas para varios días de una vez
- [ ] Una jornada con reservas no se elimina, se cancela, y se notifica a los
      inscritos

### RF-TUR-002 · Listado público de jornadas
**Actor:** Cualquiera · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] Agrupadas por fecha, con cupos libres visibles
- [ ] Filtro por acopio y por día
- [ ] Las jornadas llenas se muestran marcadas, no se ocultan: comunican dónde ya
      no hace falta ir
- [ ] Enlace desde la ficha del acopio y desde el mapa

### RF-TUR-003 · Reservar cupo
**Actor:** Cualquiera, sin cuenta · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] Solo pide nombre, correo y teléfono opcional
- [ ] Consentimiento de tratamiento de datos (Ley 1581)
- [ ] Genera un código de reserva y lo envía por correo
- [ ] **La reserva solo se crea si `reservas_activas < cupo_maximo`**, verificado
      dentro de la transacción con bloqueo sobre la jornada
- [ ] Dos personas reservando el último cupo a la vez: una obtiene el cupo, la otra
      recibe un mensaje claro
- [ ] Un mismo correo no puede reservar dos veces la misma jornada
- [ ] Límite de intentos por IP

### RF-TUR-004 · Confirmar y cancelar reserva
**Actor:** Voluntario · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] La pantalla de confirmación muestra código, dirección, cómo llegar, qué
      llevar y a qué hora
- [ ] Enlace para agregar al calendario, en formato `.ics`
- [ ] Cancelar con un enlace del correo, sin cuenta; libera el cupo de inmediato
- [ ] Recordatorio por correo 24 horas antes

### RF-TUR-005 · Administrar reservas de una jornada
**Actor:** Operador · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] Lista de inscritos con nombre y contacto
- [ ] Marcar asistencia, para tener registro de ausentismo
- [ ] **Ajustar manualmente los cupos restantes**, para reflejar a quien llegó sin
      reservar
- [ ] Cerrar la jornada anticipadamente cuando ya no hace falta gente
- [ ] Notificar a todos los inscritos ante un cambio o una cancelación

### RF-TUR-006 · Comunicar la naturaleza del dato
**Actor:** Sistema · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] Toda pantalla que muestre cupos dice explícitamente «cupos reservados», no
      «personas presentes»
- [ ] Se muestra la antigüedad del último ajuste manual
- [ ] La ficha del acopio advierte que puede haber gente sin reserva

### RF-TUR-007 · Voluntariado especializado
**Actor:** Administrador · **Prioridad:** PODRÍA

**Criterios de aceptación:**
- [ ] Una jornada puede exigir un perfil: veterinario, médico, psicólogo, cuidador
      de adulto mayor, conductor con licencia C2
- [ ] El listado público permite filtrar por perfil
- [ ] Conecta las causas de animales y adultos mayores con el módulo de turnos
