---
title: "Avance 2 — Requisitos y planeación inicial"
type: entrega
tags: [entrega, is1]
estado: borrador
actualizado: 2026-09-14
---

# Avance 2 — Requisitos y planeación inicial

**Guía:** [Avance de Proyecto 2 – IS1](../talleres/Avance%20de%20Proyecto%202%20–%20IS1.pdf)
· Asignado 2026-08-28 · Docente: Juan Pablo Bustamante Moreno

**Dónde se entrega:** en el Word del proyecto, entre el Avance 1 y el Avance 3. No se
crea un archivo nuevo.

> Esta nota es la fuente de trabajo del avance. El texto final va al Word. Cada
> sección tiene su tarea en el
> [tablero](https://github.com/orgs/Proyecto-IngSoftware/projects/1).

| Sección de la guía | Tarea | Estado |
|---|---|---|
| 1. Requisitos funcionales | [#9](https://github.com/Proyecto-IngSoftware/acopio/issues/9) | 🟡 Borrador |
| 2. Requisitos no funcionales y escenarios de calidad | [#10](https://github.com/Proyecto-IngSoftware/acopio/issues/10) | ⬜ |
| 3. Restricciones y reglas de negocio | [#11](https://github.com/Proyecto-IngSoftware/acopio/issues/11) | ⬜ |
| 4. Historias de usuario y Product Backlog | [#12](https://github.com/Proyecto-IngSoftware/acopio/issues/12), [#13](https://github.com/Proyecto-IngSoftware/acopio/issues/13), [#16](https://github.com/Proyecto-IngSoftware/acopio/issues/16) | ⬜ |
| 5. Diagrama de casos de uso | [#14](https://github.com/Proyecto-IngSoftware/acopio/issues/14) | ⬜ |
| 6. Mapa de stakeholders | [#15](https://github.com/Proyecto-IngSoftware/acopio/issues/15) | ⬜ |

---

## Dependencia con el Avance 3

El Word del Avance 3 ya afirma que **los seis módulos de la descomposición funcional
son las épicas del Avance 2** y que cada funcionalidad se rastrea hasta su historia de
usuario. Este avance tiene que cumplir esa afirmación:

- Cada RF-xx cae en una de las seis épicas, que son los seis módulos de
  [P-010](../01-requerimientos/pendientes.md).
- Cada RF-xx agrupa RF de la bóveda que ya están en el
  [Anexo A del Avance 3](../03-diseno/descomposicion-funcional/datos.json). Así la
  cadena RF-xx → HU-xx → funcionalidad → módulo queda cerrada.

| Épica | Módulo del Avance 3 | RF del curso |
|---|---|---|
| **EP-01** | Portal público | RF-01, RF-02 |
| **EP-02** | Turnos de voluntariado | RF-03 |
| **EP-03** | Inventario | RF-04, RF-05, RF-06 |
| **EP-04** | Comprobantes y custodia | RF-07, RF-08, RF-09 |
| **EP-05** | Zonas y motor | RF-10, RF-11, RF-12, RF-13 |
| **EP-06** | Administración y acceso | RF-14, RF-15 |

Las épicas se confirman al escribir las historias
([#12](https://github.com/Proyecto-IngSoftware/acopio/issues/12)).

---

## 1. Requisitos funcionales

Quince capacidades observables, una por requisito. Salen de los 75 RF de la bóveda,
agrupados por la capacidad que le dan a un actor. Las condiciones de rol y permiso no
van aquí: van a las reglas de negocio de la sección 3.

| Código | Requisito funcional | Actor o usuario relacionado |
|---|---|---|
| RF-01 | El visitante podrá consultar en un mapa los centros de acopio, con lo que cada uno necesita y lo que ya no recibe. | Visitante (donante o voluntario, sin cuenta) |
| RF-02 | El visitante podrá consultar el directorio de causas verificadas y el paso a paso para donar en el sitio oficial de cada entidad. | Visitante (sin cuenta) |
| RF-03 | El voluntario podrá reservar un cupo en una jornada de voluntariado de un acopio, sin crear una cuenta. | Voluntario |
| RF-04 | El operador podrá registrar la entrada de insumos a su acopio escaneando el código de barras o buscando la categoría por palabra clave. | Operador de acopio |
| RF-05 | El operador podrá consultar el saldo de cada categoría de su acopio, con su nivel de abastecimiento y la antigüedad del dato. | Operador de acopio |
| RF-06 | El operador podrá marcar una categoría como «no recibir» en su acopio, para que se publique de inmediato en el mapa. | Operador de acopio |
| RF-07 | El donador podrá preparar una donación escaneando sus productos y obtener un folio con código QR para presentarlo en el acopio. | Donador (cuenta propia) |
| RF-08 | El auditor podrá conciliar cada donación recibida, comparando lo que declaró el donador con lo que se confirmó en el acopio. | Auditor |
| RF-09 | Cualquier persona podrá consultar con un folio qué se donó y el recorrido de esa donación, sin crear una cuenta. | Cualquier persona (sin cuenta) |
| RF-10 | El administrador podrá aprobar o descartar cada sugerencia de traslado del motor, viendo el déficit de la zona y el excedente del acopio que la justifican. | Administrador |
| RF-11 | El operador podrá despachar una remisión desde su acopio hacia una zona afectada, con un documento imprimible con código QR. | Operador de acopio |
| RF-12 | El receptor podrá confirmar la llegada de un envío a su zona adjuntando al menos una fotografía de evidencia. | Receptor |
| RF-13 | El receptor podrá reportar las categorías de insumos que hacen falta en su zona. | Receptor |
| RF-14 | El administrador podrá dar acceso a la consola interna mediante un enlace de invitación, con un rol y las ubicaciones asignadas. | Administrador |
| RF-15 | El administrador podrá verificar una entidad con un documento soporte, para que sus causas se publiquen en el directorio. | Administrador |

### Criterio de selección

- **El vertical logístico completo** —acopio → inventario → comprobante → motor →
  zona— queda cubierto de punta a punta: RF-04 a RF-13.
- **Cada problema del [Avance 1](avance-01-sprint0.md#problema) tiene al menos un
  requisito:** ayuda concentrada en una causa → RF-02; voluntarios que viajan en vano
  → RF-03; acopios saturados → RF-01, RF-06; reparto sin medir → RF-10, RF-13; sin
  trazabilidad → RF-07 a RF-09, RF-12.
- **Los siete actores con acceso aparecen**: visitante, voluntario, donador, operador,
  receptor, auditor y administrador.
- **Ningún requisito dice «gestionar»** ni describe una tarea técnica. Las cuatro
  reglas del sistema que el Avance 3 deja fuera del diagrama (RF-IDE-005,
  RF-INV-011, RF-CMP-002, RF-TUR-006) pasan como reglas de negocio o como requisitos
  no funcionales.

### Equivalencia con la bóveda

Los códigos RF-01 a RF-15 son del curso. Los de la bóveda (`RF-INV-001`…) no se
renumeran: detallan cada requisito del curso con sus criterios de aceptación. Es el
mismo criterio que ADR-001 del Word y ADR-0008 de la bóveda
([P-011](../01-requerimientos/pendientes.md)).

| RF del curso | RF de la bóveda que lo detallan | Cant. |
|---|---|:-:|
| RF-01 | [RED-002](../01-requerimientos/funcionales/red.md), RED-003, RED-009, RED-011, [HOM-001](../01-requerimientos/funcionales/home.md), HOM-002, HOM-006 | 7 |
| RF-02 | [RED-008](../01-requerimientos/funcionales/red.md), [HOM-005](../01-requerimientos/funcionales/home.md) | 2 |
| RF-03 | [TUR-001 a TUR-007](../01-requerimientos/funcionales/turnos.md) | 7 |
| RF-04 | [INV-001](../01-requerimientos/funcionales/inventario.md), INV-002, INV-004, INV-009, INV-011, [CAT-001](../01-requerimientos/funcionales/catalogo.md), CAT-002, CAT-004, [CMP-001C](../01-requerimientos/funcionales/comprobantes.md) | 9 |
| RF-05 | [INV-005](../01-requerimientos/funcionales/inventario.md), INV-006, INV-010 | 3 |
| RF-06 | [INV-007](../01-requerimientos/funcionales/inventario.md), INV-008 | 2 |
| RF-07 | [CMP-001B](../01-requerimientos/funcionales/comprobantes.md), CMP-001D, CMP-002, CMP-008, [IDE-013](../01-requerimientos/funcionales/identidad.md) | 5 |
| RF-08 | [CMP-003](../01-requerimientos/funcionales/comprobantes.md), CMP-004, CMP-005 | 3 |
| RF-09 | [CMP-006](../01-requerimientos/funcionales/comprobantes.md), CMP-007, [HOM-004](../01-requerimientos/funcionales/home.md) | 3 |
| RF-10 | [MOT-001](../01-requerimientos/funcionales/motor.md) a MOT-007, MOT-010, [RED-004](../01-requerimientos/funcionales/red.md), [CAT-003](../01-requerimientos/funcionales/catalogo.md), CAT-005, CAT-006 | 12 |
| RF-11 | [MOT-008](../01-requerimientos/funcionales/motor.md), [INV-003](../01-requerimientos/funcionales/inventario.md) | 2 |
| RF-12 | [MOT-009](../01-requerimientos/funcionales/motor.md) | 1 |
| RF-13 | [MOT-011](../01-requerimientos/funcionales/motor.md) | 1 |
| RF-14 | [IDE-001 a IDE-012](../01-requerimientos/funcionales/identidad.md) | 12 |
| RF-15 | [RED-001](../01-requerimientos/funcionales/red.md), RED-005, RED-006, RED-007, RED-010, [HOM-003](../01-requerimientos/funcionales/home.md) | 6 |
| | **Total** | **75** |

Los 75 RF de la bóveda quedan asignados, ninguno dos veces.

**Cruces de módulo.** Once RF de la bóveda viven en un módulo del Avance 3 distinto
de la épica de su RF del curso. La épica sigue la capacidad que ve el actor; el
módulo, dónde vive el código. No es una contradicción, pero la tabla de trazabilidad
de la sección 5 tiene que mostrarlo:

| RF de la bóveda | En el RF del curso | Vive en el módulo | Por qué |
|---|---|---|---|
| RED-011 | RF-01 | Administración y acceso | La importación de RedAcopio alimenta el mapa público |
| CAT-001, CAT-002, CAT-004 | RF-04 | Administración y acceso | El catálogo y los códigos de barras son lo que el operador busca y escanea |
| CMP-001C | RF-04 | Comprobantes y custodia | Recibir un folio genera las entradas al inventario |
| IDE-013 | RF-07 | Administración y acceso | Sin cuenta de Donador no hay folio |
| HOM-004 | RF-09 | Portal público | La transparencia muestra el recorrido agregado de las donaciones |
| CAT-003, CAT-005, CAT-006 | RF-10 | Administración y acceso | Canasta, emergencia y pesos son las entradas del cálculo del motor |
| INV-003 | RF-11 | Inventario | Despachar una remisión registra la salida del inventario |

Verificado con un script contra
[datos.json](../03-diseno/descomposicion-funcional/datos.json): 75 asignados, 75
únicos, ninguno sin asignar.

---

## 4. Tablero — evidencia

Tablero del equipo en GitHub Projects:
<https://github.com/orgs/Proyecto-IngSoftware/projects/1>

![Tablero del proyecto, 2026-09-14](../assets/github/backlog1.png)

*Captura del 2026-09-14 en vista de tabla. Para el Word conviene la vista de tablero
agrupada por Status, con las cinco columnas de la guía.*
