# Video script: Acopio

## Opening

Hello. We are presenting Acopio, a web platform developed as an academic project at Escuela Tecnológica Instituto Técnico Central. Acopio is designed to help people coordinate donations in kind during disaster response.

## The problem

After a disaster, many people want to donate or volunteer. However, collection centers may keep separate records. One center can have too much of an item while another location needs it. Donors may also have difficulty finding current information, and a donation can be hard to follow after it leaves a collection center.

Our research question is: How can a web platform support the coordination and traceability of donations between collection centers and affected areas?

## Objective and methodology

Our general objective is to support coordination through shared inventory information, donation tracking and transfer suggestions. Our specific objectives included defining what each user needs to do and checking whether they can complete those tasks in the prototype. Shared records matter because staff at different locations can use them to review the same proposed shipment. We began with a documented observation at a collection center and then defined the users and requirements. We designed the architecture and built the platform in iterations. We tested representative workflows with demonstration data.

## How the platform works

Collection center staff record the supplies they receive and dispatch. The system uses inventory and reported needs to suggest transfers. An administrator reviews and approves a suggested transfer. The system creates a draft dispatch record. The administrator or the operator at the collection center can dispatch it. A receiver assigned to the destination confirms what arrived.

On the public side, people can consult verified causes and reserve volunteer shifts. Acopio sends people to an organization's official website for financial donations; the platform does not receive the money.

## Tools and evidence

The interface uses React. The server uses NestJS, and PostgreSQL stores the records. Figure 5 shows one suggestion and the four criteria behind its score. Figure 9 shows the confirmation of a delivery from a demonstration. In the local test run on October 19, the project log records nine successful checks for the suggestion engine, seven for dispatch and seven for receipt.

Our research also examined the Sphere Handbook and other humanitarian sources. They provide references for planning, but the quantities in our proposed food basket require further nutritional review and adjustment to local conditions.

## Conclusion

The prototype brings inventory records and delivery information into one workflow. The demonstrations show how staff can review a suggestion and record a delivery. Our evaluation covers selected workflows with test data. A field trial with humanitarian organizations could help us find out whether staff can keep inventory up to date and use the suggestions when a delivery needs to be organized. Thank you.

## Recording cues

These notes are for the presenters. The spoken script is above.

| Presenter | Script sections | What to show |
| --- | --- | --- |
| Joseph | Opening and the problem | Project title, then the research question |
| Brayan | Objective and methodology | The user roles in Figures B1 and B2 |
| Alejandra | How the platform works | The transfer suggestion and receipt in Figures 5 and 9, then the public verification badge in Figure 11 and the administrator’s confirmation in Figure 12 |
| Michael | Tools and evidence, then conclusion | The architecture in Figure C1 and the abstract's conclusions |

Keep each screen visible long enough to point to the detail being discussed. Figures 3 to 13 show the original Spanish interface. Explain the relevant labels aloud in English as you show them.

## Questions to rehearse

- **What does the public donation record show?** Figure 4 shows the public lookup with the donated item and the current status. The donor’s personal information and invoice were kept private. See the Sprint 1 review in the fourth project submission.
- **How does Acopio recommend a transfer?** The engine estimates demand for each item, then subtracts supplies that have arrived or are on the way. If a zone needs 100 units, has received 30 and expects 20, it still needs 50. The administrator reviews the recommendation before any dispatch. Show Figure 5 in the PICS report.
- **What did you test?** The browser test log records the successful local checks on October 19. The Sprint 2 report describes the workflows. Figure 9 shows the final confirmation with demonstration data. A live disaster response would require separate field evaluation.
- **Does Sphere define your food basket?** Sphere provides planning references. The team selected the amounts of individual foods for the proposed basket. Those amounts need further nutritional review before use in the field.

## Demo sequence and fallback

1. Open the suggestion engine as an administrator. Show the source, destination, quantity, score and four criteria in Figure 5.
2. Approve a suggestion and show the resulting draft. Use Figure 6 if the application is unavailable.
3. Dispatch the draft as the administrator or the assigned collection center operator. Use Figures 7 and 8 to show the dispatch form and the document with the matching reference code.
4. Use the receiver assigned to the destination to confirm the quantities and attach a photo. Show the [receipt form](../evidencia/avance-05/motor-5-recibir.png) and Figure 9 if the live demo is unavailable.

Figures 7 and 8 show the same dispatch. The suggestion, approval and receipt captures come from demonstration runs that do not follow that same shipment. Explain what each screen shows before moving to the next step. The [Sprint 2 report](../avance-05-sprint2.md#1a-flujo-del-motor-de-la-sugerencia-a-la-recepción) describes the workflow and the [test log](../../06-operacion/recorridos.md) records the checks.
