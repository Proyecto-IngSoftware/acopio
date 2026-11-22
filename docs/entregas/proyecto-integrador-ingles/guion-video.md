---
title: "Proyecto integrador · guion del video"
type: entrega
tags: [entrega]
estado: vigente
actualizado: 2026-11-22
---

# Video script: Acopio

Guion para el video de la asignación, de 3 a 5 minutos. Va con la presentación `Acopio - Video Presentation.html`, una parte por diapositiva. Lo que está en cita se dice en voz alta; lo demás es para el equipo. Cada `[next]` es una pulsación de la flecha derecha y no se lee.

## Script

### Joseph

Slide 1. Cover

> Hello, everyone. We are Joseph, Brayan, Alejandra and Michel, and we study at ETITC in Bogotá. Our project is Acopio, a web platform for coordinating donations during disasters.

Slide 2. What is a collection center?

> After a disaster, people take food, water and other supplies to a collection center. In Colombia we call it a *centro de acopio*, so that is our name. The center sends those supplies to the affected areas.

Slide 3. The problem

> But each center keeps its own records, so one can have too much of an item while another area still needs it. In August we visited a center in Bogotá. Supplies arrived unevenly and the staff were overloaded.

Slide 4. Problem question

> Our question was: How can a web platform support the coordination and traceability of donations in kind between collection centers and affected areas during the response to a disaster? Traceability means following a donation from start to finish.

### Brayan

Slide 5. Objectives

> Our general objective was to develop that platform, with shared inventory, tracking by code and transfer suggestions. The specific objectives were to define what each user needs, to record inventory, to suggest transfers, to publish verified information, and to test the prototype.

Slide 6. Justification

> A center that does not know what the others have may keep receiving something it cannot store, while an affected area is left without help. With a shared record, coordinators can identify a possible transfer, and donors know where to go.

Slide 7. Methodology

> We worked in iterations. We compared three project ideas, wrote requirements for each role, designed the architecture and built the application in two sprints, with React, NestJS and PostgreSQL. Then we tested it in the browser.

### Alejandra

Slide 8. Theoretical framework

> Our first theoretical idea is traceability: every entry, exit and receipt leaves a record. The second is humanitarian standards. The Sphere Handbook gives references such as fifteen liters of water and two thousand one hundred kilocalories per person per day. They must be adjusted to each place.

Slide 9. An example

> Acopio calculates what is missing. For example, an area needs one hundred units. It has received thirty, and twenty are on the way, so it still needs fifty. If one center can give thirty-five, that transfer covers part of the need.

Slide 10. From suggestion to receipt

> These screens are in Spanish. First, the system suggests a transfer with a score. `[next]` Second, the administrator reviews the quantity and approves it. `[next]` Third, the load leaves the center. `[next]` Fourth, the receiver at the destination confirms what arrived, with a photo.

### Michel

Slide 11. Public portal

> On the public portal, people can find collection points on a map, `[next]` follow a donation with its code, `[next]` reserve a volunteer shift and `[next]` look up verified organizations. Acopio does not receive money.

Slide 12. Scope and results

> The prototype covers public information, inventory, tracking, transfers and reservations. In our local tests on October 19, nine of nine checks passed for the suggestion engine, seven of seven for dispatch and seven of seven for receipt. We used demonstration data, and its impact in a real emergency has not been measured.

Slide 13. Conclusions

> In conclusion, a shared record can support coordination when a person reviews and approves each suggestion. The tracking code and the confirmation of receipt let us follow the aid. The next step is a field trial with humanitarian organizations.

Slide 14. Thank you

> These are our main sources. Thank you for watching.

## Tiempos

| Quién | Diapositivas | Palabras | A 110 por minuto | A 130 por minuto |
|---|---|---|---|---|
| Joseph | 1 a 4 | 141 | 1:17 | 1:05 |
| Brayan | 5 a 7 | 119 | 1:05 | 0:55 |
| Alejandra | 8 a 10 | 129 | 1:10 | 1:00 |
| Michel | 11 a 14 | 132 | 1:12 | 1:01 |
| Total | 1 a 14 | 521 | 4:44 | 4:00 |

Faltan los segundos de los cambios de diapositiva y de persona. Si en el ensayo pasan de 4:45, quiten la última frase de la diapositiva 4.

## Pronunciación

| Palabra | Suena como |
|---|---|
| Acopio | se dice en español |
| disasters | di-SAS-ters |
| inventory | IN-ven-to-ri |
| traceability | trei-sa-BI-li-ti |
| suggestion | sag-YES-chon |
| receipt | ri-SIT, sin pronunciar la p |
| affected areas | a-FEK-ted E-rias |
| volunteer | vo-lan-TIR |
| Sphere Handbook | SFIR HAND-buk |
| kilocalories | KI-lo-ka-lo-ris |
| NestJS | nest yei-ES |
| PostgreSQL | POUST-gres kiu-EL |

## Cómo grabar

1. Abran la presentación en Chrome y presionen F para pantalla completa. Se avanza con la flecha derecha o la barra espaciadora. Las diapositivas 10 y 11 tienen cuatro pasos cada una; la cuarta pulsación pasa a la diapositiva siguiente.
2. Cada diapositiva deja libre la esquina inferior derecha. Presionen C para ver dónde va la cámara, acomoden ahí el recuadro y presionen C otra vez para ocultar la guía.
3. Cada persona aparece en cámara mientras habla. Si graban por separado, se unen los cuatro fragmentos en este orden: Joseph, Brayan, Alejandra y Michel.
4. Miren a la cámara al presentarse, en la pregunta problema y en el cierre. Los rótulos y las pantallas señalan solos lo que van nombrando.
5. Graben una prueba de diez segundos y escúchenla con audífonos antes de empezar.
6. Al subir el video, den permiso de ver a cualquiera con el enlace de la institución y ábranlo en una ventana de incógnito o desde otra cuenta.

Copi, la caja que acompaña la presentación, aclara en su globo alguna palabra o dato de cada diapositiva. No hace falta leer el globo en voz alta. Al cambiar de diapositiva, Copi camina durante segundo y medio: esperen a que se detenga antes de hablar. La tecla P pausa las animaciones.

En la diapositiva 10 las pantallas vienen de demostraciones distintas. Por eso una muestra agua y otra arroz.

## Lista para Teams

- [ ] El video dura entre 3 y 5 minutos
- [ ] Los cuatro aparecen en cámara
- [ ] El audio se entiende
- [ ] El docente puede abrir el video
- [ ] Se subió el trabajo escrito (`Acopio - Integrative Project.pdf`)
- [ ] Se subió el abstract (`Acopio - Abstract.pdf`)

## Questions to rehearse

The figure numbers refer to the written work.

- What does the public donation record show? Figure 4 shows the donated item and the current status. The donor's personal information and invoice are private.
- How does Acopio recommend a transfer? The engine estimates demand for each item, then subtracts supplies that have arrived or are on the way. The administrator reviews the recommendation before any dispatch. See Figure 5.
- What did you test? The browser test log records the successful local checks on October 19. Figure 9 shows the final confirmation with demonstration data. A real disaster response would require a separate field evaluation.
- Does Sphere define your food basket? Sphere provides planning references. The team selected the amounts of each food for the proposed basket, and those amounts need nutritional review before use in the field.
