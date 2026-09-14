---
title: "Avance de proyecto #1 — Selección y definición inicial del producto"
type: entrega
tags: [entrega, is1]
estado: vigente
actualizado: 2026-09-11
---

# Avance de proyecto #1 — Selección y definición inicial del producto

> Versión Markdown del Word entregado:
> [Avance 1 - Sprint 0 - Acopio.docx](Avance%201%20-%20Sprint%200%20-%20Acopio.docx).
> Si difieren, manda el Word.

**Asignatura:** Ingeniería de Software I
**Docente:** Juan Pablo Bustamante Moreno
**Institución:** Escuela Tecnológica Instituto Técnico Central (ETITC)
**Integrantes:** Joseph · Brayan · Alejandra · Michael
**Fecha de entrega:** 9 de septiembre de 2026
**Sprint:** 0

---

## 1. Matriz de selección

### Ideas consideradas

El equipo evaluó tres propuestas antes de tomar una decisión. Cada proyecto aborda un
público específico con necesidades distintas. Los criterios de viabilidad son
fundamentales en este punto, ya que determinarán la ejecución de la iniciativa. A
continuación, presentamos una breve explicación de cada propuesta, el problema que
identifica y el objetivo que se busca con ella.

**Idea 1 — Acopio.** Plataforma web de coordinación logística para respuesta a
desastres. Integra un inventario compartido de centros de acopio, control de qué
insumos sobran y cuáles faltan en cada punto, trazabilidad de las donaciones en
especie mediante comprobantes, y un motor que calcula el déficit de cada zona
afectada y propone hacia dónde trasladar los excedentes. Incluye un portal público
con directorio de causas verificadas, mapa de acopios y reserva de turnos de
voluntariado. La plataforma no recauda dinero: dirige al sitio oficial de cada
entidad.

**Idea 2 — AulaLibre.** Sistema de reserva de laboratorios, salas y equipos de la
ETITC. Estudiantes y docentes consultan disponibilidad, reservan franjas horarias y
reciben confirmación; el personal administrativo gestiona el catálogo de espacios y
resuelve conflictos de agenda.

**Idea 3 — MediRuta.** Aplicación móvil de acompañamiento a pacientes crónicos:
recordatorios de medicación, registro de síntomas, alertas a un cuidador y
sugerencias generadas por un modelo de lenguaje.

### Matriz comparativa

Escala de 1 a 5. En el criterio *Riesgos y dependencias identificables*, un puntaje
alto significa que los riesgos están **bien identificados y son manejables**, no que
sean pocos.

| Criterio | Idea 1 — Acopio | Idea 2 — AulaLibre | Idea 3 — MediRuta | Justificación de la valoración |
|---|:-:|:-:|:-:|---|
| Problema y usuario claros | **5** | 4 | 4 | Acopio: el problema se observó de forma directa tras el terremoto y los usuarios están delimitados —donante, voluntario, operador de acopio, coordinador de zona—, con condiciones de uso muy específicas. AulaLibre tiene usuarios claros pero un problema de conveniencia, no de necesidad. MediRuta tiene un problema real, con un usuario al que el equipo no tiene acceso para validar. |
| Valor o innovación | **5** | 2 | 4 | Acopio aporta un motor de emparejamiento entre déficit y superávit que ninguna de las herramientas revisadas ofrece para el contexto colombiano (ver sección 4). AulaLibre es un CRUD con calendario: existen decenas de soluciones equivalentes y gratuitas. MediRuta es valiosa, pero el espacio está saturado de aplicaciones comerciales. |
| Viabilidad técnica | 4 | **5** | 2 | Acopio usa tecnologías dominadas por el equipo, aunque exige resolver transacciones concurrentes y sincronización sin conexión. AulaLibre es técnicamente trivial. MediRuta implicaría datos de salud —categoría especial bajo la Ley 1581— y dependencia de un proveedor de IA de pago. |
| Viabilidad temporal | 3 | **5** | 2 | **Es el punto débil reconocido de Acopio:** Contempla siete módulos y el semestre alcanza para cinco y medio (se mitiga con un orden de construcción y un plan de recortes definido desde ahora, ver sección 3). Por su parte, AulaLibre se terminaría en dos Sprints. En cuanto a MediRuta, se le asigna la puntuación más baja porque el alcance de la aplicación es muy grande, lo que la hace inviable en términos de tiempo para el período disponible. |
| Complejidad adecuada para el curso | **5** | 2 | 4 | Acopio ejercita justo lo que evalúa la asignatura: modelado de dominio, integridad transaccional, control de acceso por roles, integración con servicios externos y un algoritmo con criterio de evaluación medible. AulaLibre es demasiado simple para llenar un semestre de Sprints con contenido real. |
| Riesgos y dependencias identificables | 4 | **5** | 2 | Los riesgos de Acopio están escritos y con mitigación: dependencia de Supabase para autenticación, calidad del dato alimentado por operarios, alcance del modo sin conexión. Los de AulaLibre son mínimos. Los de MediRuta —tratamiento de datos de salud y responsabilidad sobre recomendaciones médicas— no son manejables por un equipo de pregrado. |
| Potencial de evolución por Sprints | **5** | 3 | 4 | Acopio se descompone naturalmente en siete bloques con dependencias claras, cada uno demostrable de forma independiente. AulaLibre se agota pronto y los Sprints finales quedarían sin contenido sustantivo. |
| **Total** | **31** | **26** | **22** | sobre 35 |

### Idea elegida y justificación

El equipo eligió **Acopio**.

No se eligió únicamente por obtener el puntaje más alto. AulaLibre gana en las dos
columnas de factibilidad —viabilidad técnica y temporal— y esa ventaja es real: se
podría entregar terminada y sin sobresaltos. Se descartó precisamente por eso. Una
asignatura organizada en Sprints necesita un producto con suficiente profundidad para
que cada iteración agregue algo sustantivo; un sistema de reservas se agota en dos
Sprints y convertiría los siguientes en relleno. La complejidad adecuada al curso es
un criterio de selección, no un defecto a minimizar.

MediRuta se descartó por el motivo opuesto. Su puntaje bajo no proviene de falta de
valor sino de riesgos que el equipo no puede asumir: los datos de salud son categoría
especial bajo la Ley 1581 de 2012, y una aplicación que sugiere conductas de
medicación traslada al equipo una responsabilidad desproporcionada para un proyecto
académico.

Acopio ocupa el punto intermedio. Su debilidad está identificada y acotada: la
viabilidad temporal, con un 3 que el equipo no maquilla. La respuesta a esa debilidad
ya está tomada y es lo que hace defendible la elección. El proyecto se construye como
un **vertical logístico**, no como siete módulos en paralelo: se completa el eje
acopio → inventario → comprobante → motor → zona, que es donde está el aporte
original, y los módulos periféricos se implementan en versión ligera. El orden de
recorte está escrito desde el Sprint 0, de modo que quedarse sin tiempo no signifique
entregar algo roto, sino algo más pequeño y completo.

A eso se suma una razón que ninguna matriz captura: el problema es real, ocurre ahora
y el equipo puede observarlo de primera mano. Trabajar sobre una necesidad verificable
—en lugar de una imaginada para cumplir un requisito de la asignatura— mejora la
calidad de los requerimientos y hace posible validar decisiones con usuarios reales
durante el semestre.

---

## 2. Definición del problema y usuarios

### Contexto

La situación ocurre en el entorno de la respuesta ciudadana a un desastre natural.
Tras el terremoto de 2026 en Colombia, varias zonas del país resultaron afectadas y se
activó una movilización espontánea de ayuda desde otras ciudades y desde el exterior.
Bogotá se consolidó como principal ciudad de origen de las donaciones en especie:
allí se concentran los centros de acopio que reciben del público y despachan hacia
las zonas afectadas.

Esa respuesta es masiva, voluntaria y descentralizada. La coordina un conjunto
heterogéneo de entidades, fundaciones, parroquias, juntas de acción comunal y grupos
improvisados que no comparten ninguna herramienta común. Es un entorno social y
comunitario, operando fuera de los canales estrictamente institucionales y sin un
sistema centralizado de coordinación.

### Problema

**La ayuda existe y la coordinación no.** El problema central es que la respuesta
ciudadana opera de forma totalmente fragmentada y a ciegas, lo que genera
ineficiencias críticas en la gestión humanitaria. Esta situación no se debe a una
escasez de donaciones, sino a una distribución desorganizada que se manifiesta en
cinco hechos observables:

**Primero, la ayuda se concentra en una sola causa.** La mayoría de los canales
visibles atiende a personas damnificadas. Quien quiere apoyar animales heridos o
abandonados, adultos mayores sin red de apoyo, la búsqueda de personas desaparecidas
o el sostenimiento de los propios rescatistas no encuentra a dónde dirigirse. No es
falta de voluntad: es ausencia de directorio.

**Segundo, los voluntarios se desplazan en vano.** No existe un listado confiable de
dónde están los centros de acopio en Bogotá, ni forma de saber cuánta gente hace
falta en cada uno. Personas que cruzan la ciudad son devueltas porque ya hay
suficiente personal, mientras otros puntos quedan sin manos.

**Tercero, los acopios se saturan de un insumo y carecen de otro.** Un centro acumula
agua embotellada hasta bloquear su espacio de trabajo mientras otro, a pocas cuadras,
se quedó sin ella. Ninguno de los dos lo sabe. Los donantes, sin información, compran
justamente lo que sobra.

**Cuarto, el mismo patrón se repite en destino y a mayor escala.** Las zonas
accesibles y las que aparecieron en noticias reciben todo; las demás quedan
esperando. El reparto responde a visibilidad y cercanía, no a necesidad medida.

**Quinto, no hay trazabilidad.** No se registra qué entró, qué salió ni a dónde fue.
El donante no puede verificar que su donación llegó a alguien.

**Causa raíz común:** No existe un inventario compartido con datos en tiempo real.
Sin cantidades no hay comparación posible entre puntos; sin comparación, cada
decisión de reparto es una corazonada bien intencionada. Los cinco hechos son
síntomas del mismo vacío.

### Evidencia inicial

**a) Observación directa del contexto.** La observación en terreno se llevó a cabo el
jueves 20 de agosto de 2026 en un centro de acopio ubicado en Bogotá. Durante la
jornada se evidenció un fuerte contraste entre la alta disposición ciudadana y la
deficiente logística operativa, manifestándose en tres cuellos de botella:

- **Desperdicio de fuerza voluntaria:** Una gran cantidad de personas acudió al lugar
  con intención de ayudar, pero un porcentaje significativo tuvo que ser devuelto
  debido a la desorganización y al exceso de personal no planificado en ese
  perímetro.
- **Déficit de personal crítico:** Paradójicamente, mientras se rechazaban voluntarios
  en la entrada, se observó que el personal encargado de organizar y cargar los
  camiones con destino a las zonas afectadas trabajaba en solitario y sobrepasado,
  evidenciando una nula distribución de tareas.
- **Desbalance de inventario (sobreoferta ciega):** Se constató la llegada masiva y
  repetitiva de ciertos insumos (lo que saturó el espacio físico) frente a la
  ausencia total de otros recursos de primera necesidad que nunca ingresaron al
  acopio.

**Análisis de soluciones locales actuales (Ejemplo: RedAcopio Bogotá)** Al revisar los
esfuerzos digitales desplegados actualmente, como el portal
[*redacopiobogota.com*](https://redacopiobogota.com/), se evidencia que, aunque aportan
valor al visibilizar la emergencia, son herramientas de difusión y no de logística
integral. Este tipo de plataformas centraliza direcciones, pero no ataca las causas
raíz identificadas en la observación directa:

- **No previenen el rebosamiento:** Funcionan como directorios estáticos. Al no tener
  un estado público de "no recibir", el donante sigue comprando y llevando recursos
  repetitivos que el acopio ya no tiene dónde almacenar.
- **No gestionan la voluntad humana:** Carecen de un sistema de reserva de turnos
  (slots) por franjas horarias. Esto perpetúa el problema del voluntario que cruza la
  ciudad a ciegas solo para ser devuelto.
- **Carecen de emparejamiento (Matchmaking):** No resuelven la logística de salida.
  Indican dónde dejar la ayuda, pero no ofrecen un motor de cálculo que le diga al
  operador hacia qué camión o hacia qué zona exacta debe destinar sus excedentes
  basándose en una métrica de déficit real.
- **Falta de trazabilidad:** No implementan un seguimiento por comprobantes (folios),
  por lo que el proceso termina en el momento en que se entrega la donación en
  Bogotá, dejando un punto ciego hasta su destino final.

**b) Conversaciones exploratorias.**

- **El problema de las donaciones no requeridas:** La Cruz Roja Colombiana ha tenido
  que emitir comunicados urgentes pidiendo a la ciudadanía "***evitar enviar objetos
  que no hayan sido requeridos para no entorpecer la logística***". Esto valida
  nuestro tercer hecho observable: los acopios se ahogan en donaciones bien
  intencionadas pero inútiles para la emergencia, porque el donante no tiene cómo
  saber qué falta y qué sobra antes de comprar.
- **La necesidad de un estado "No Recibir" público:** La Alcaldía de Bogotá tuvo que
  publicar guías oficiales de "***Qué donar y no donar***", prohibiendo explícitamente
  llevar ropa usada (un insumo que, según los manuales de logística humanitaria de la
  Cruz Roja y la UNGRD, exige excesivas horas de clasificación y termina colapsando
  las bodegas de acopio), alimentos perecederos o medicamentos iniciados.
- **Cierre de puntos por incapacidad logística:** La descentralización colapsó
  rápidamente. Debido a la dificultad para coordinar múltiples puntos ciegos, el
  Distrito se vio obligado a cerrar los puntos habilitados inicialmente (como
  universidades y centros comerciales) y concentrar toda la operación logística en un
  único punto habilitado en el Palacio de los Deportes a partir del 18 de agosto.
  Nuestro proyecto, Acopio, permitiría mantener una red descentralizada al darle a
  todos los puntos una herramienta de visibilidad e inventario compartido.
- **Causas invisibilizadas:** Tal como lo plantea nuestra propuesta, la ayuda inicial
  se concentró solo en humanos, dejando otras causas desatendidas. Días después del
  desastre, el Instituto Distrital de Protección y Bienestar Animal tuvo que abrir una
  convocatoria paralela en Corferias exclusiva para recibir donaciones para animales
  (arena, guacales, concentrado), porque los canales principales no los cubrían.
  Nuestro directorio centralizado solucionaría esto desde el primer día.

**c) Revisión de fuentes institucionales.** Fuentes consultables y pertinentes:

Para sustentar la viabilidad técnica del motor de emparejamiento y la lógica de
negocio del inventario de Acopio, se consultaron las siguientes normativas y bases de
datos oficiales **(Fecha de consulta: 28 de agosto de 2026):**

- **Manual Esfera (Carta Humanitaria y normas mínimas para la respuesta
  humanitaria):** Se adoptó como base algorítmica para el cálculo de déficit. El
  manual establece internacionalmente que la necesidad mínima de supervivencia es de
  **15 litros de agua segura por persona al día** y una ingesta nutricional de
  **2.100 kilocalorías diarias**. Estos indicadores clave de desastre son el dato duro
  que el motor de la plataforma utilizará como multiplicador para pasar de un envío
  intuitivo a un cálculo de necesidad matemática en las zonas afectadas.
  Fuente: <https://spherestandards.org/wp-content/uploads/El-manual-Esfera-2018-ES.pdf>
- **DANE (Proyecciones de población a nivel municipal 2020-2035):** Para que la
  canasta estándar del Manual Esfera funcione, el sistema requiere un denominador
  demográfico. Las proyecciones oficiales del DANE actúan como la variable de
  población para cada municipio afectado. Al cruzar el estándar de 15 litros/día con
  la proyección de habitantes de un municipio específico, la plataforma calculará la
  demanda total y restará el inventario en tránsito para emitir sugerencias de
  traslado precisas.
  Fuente: <https://www.dane.gov.co/index.php/estadisticas-por-tema/demografia-y-poblacion/proyecciones-de-poblacion>
- **UNGRD y APC Colombia (Orientaciones de ayuda humanitaria - agosto 2026):** En el
  marco del actual desastre, la Agencia Presidencial de Cooperación y la UNGRD
  emitieron la directriz oficial de contingencia logística que exige: *"Antes de
  movilizar bienes o recursos, verificar con la autoridad territorial correspondiente
  que la ayuda responda a una necesidad vigente y que exista capacidad para
  recibirla, almacenarla y distribuirla"*. Esta instrucción institucional valida el
  problema logístico de fondo (el envío ciego) y justifica directamente el desarrollo
  funcional del estado público de «no recibir» propuesto en el alcance del proyecto.
  Fuente: <https://www.apccolombia.gov.co/comunicaciones/noticias/apc-colombia-emite-orientaciones-para-articular-las-donaciones-y-ayudas>

**d) Revisión de la cobertura pública.**

- **Guía oficial de la Alcaldía de Bogotá (Saturación operativa y directriz de qué no
  donar)**
  <https://bogota.gov.co/mi-ciudad/ambiente/que-donar-y-no-donar-en-bogota-para-damnificados-terremoto-colombia>
  - **Uso en el documento:** Respalda la directriz oficial de no donar ropa usada,
    medicamentos iniciados o alimentos destapados debido al colapso logístico.
- **Reporte de Infobae / Cruz Roja Colombiana (El problema de los insumos que
  entorpecen)**
  <https://www.infobae.com/colombia/2026/08/10/centros-de-acopio-habilitados-en-colombia-tras-el-terremoto-guia-por-ciudad-para-donar-y-ayudar-a-las-victimas>
  - **Uso en el documento:** Contiene la declaración exacta de la Cruz Roja pidiendo
    a los ciudadanos *"evitar enviar objetos que no hayan sido requeridos para no
    entorpecer la logística"*.
- **Reporte de Canal Capital (Colapso descentralizado y único punto habilitado)**
  <https://www.canalcapital.gov.co/ahora/palacio-de-los-deportes-donaciones-hoy-horario-como-ayudar>
  - **Uso en el documento:** Documenta la decisión del Distrito de centralizar la
    recepción de ayudas exclusivamente en el Palacio de los Deportes a partir del 18
    de agosto, evidenciando la incapacidad de gestionar la emergencia con puntos
    ciegos.

### Usuarios principales

Quienes usan la solución directamente. Sus condiciones de uso importan tanto como sus
funciones: de ellas sale la mitad de las decisiones de diseño.

| Usuario | Qué necesita | En qué condiciones |
|---|---|---|
| **Operador de centro de acopio** | Registrar entradas y salidas en segundos; ver qué sobra y qué falta; marcar «no recibir» una categoría saturada | De pie, con una mano ocupada, con guantes, bajo sol, con batería y señal escasas, a veces con una fila esperando |
| **Coordinador de zona afectada** | Reportar el estado de su zona y confirmar la recepción de un envío | Las peores condiciones: conexión mala o ausente, urgencia constante |
| **Donante en especie** | Saber qué hace falta **antes de comprar**, a qué acopio llevarlo, y verificar después que llegó | En el supermercado o en la calle, desde el teléfono |
| **Voluntario** | Ver dónde falta gente y reservar un cupo antes de desplazarse | En casa, planeando su fin de semana |
| **Donante remoto** | Encontrar una causa que le importe y confiar en que la entidad es real | Fuera de la zona, incluso fuera del país |
| **Administrador de la plataforma** | Crear usuarios y asignarles zonas, verificar entidades, auditar | En escritorio |

El **operador de centro de acopio es el usuario crítico**. Si registrar le resulta
tedioso, no lo hace, y sin dato el sistema entero queda ciego. Todo lo demás depende
de que esta persona colabore, y de ahí sale el requisito de que registrar una entrada
tome menos de diez segundos.

### Usuarios secundarios y stakeholders

- **Entidades y fundaciones** que administran acopios y causas: aparecen en el
  directorio, y su verificación es responsabilidad de la plataforma.
- **Rescatistas y personal de primera respuesta:** se benefician de que los insumos
  lleguen a donde hacen falta, sin usar el sistema.
- **Población afectada:** beneficiaria final. No usa la plataforma.
- **Entidades oficiales** —UNGRD, alcaldías, Cruz Roja—: fuente potencial de datos de
  población y zonas, y destinatarias de las causas que la plataforma no gestiona.
- **UBPD y Medicina Legal:** la categoría de personas desaparecidas enlaza a ellas, y
  la plataforma no almacena ningún dato al respecto.
- **Medios de comunicación:** consumidores del tablero público de transparencia.

### Consecuencia actual

Si el problema no se resuelve, lo que ocurre hoy sigue ocurriendo:

- **Insumos que se pierden.** Alimentos y medicamentos vencen almacenados en un acopio
  saturado mientras otro punto carece de ellos.
- **Zonas desatendidas.** Comunidades esperan semanas por ayuda que ya existe y está a
  pocos kilómetros, guardada en el lugar equivocado.
- **Voluntad que se desperdicia.** El voluntario devuelto y el donante que compró lo
  que sobraba difícilmente vuelven.
- **Desconfianza acumulada.** Sin trazabilidad, la sospecha de que la donación no
  llegó reduce la donación futura, incluso cuando sí llegó.
- **Trabajo humano malgastado.** Coordinadores dedican horas a llamadas y grupos de
  WhatsApp para averiguar lo que una consulta debería responder en un segundo.

### Oportunidad

Si la propuesta tiene éxito:

- **La donación se dirige antes de comprarse.** El donante ve qué falta y qué sobra
  antes de salir de casa, y el problema del insumo acumulado se ataca en su origen.
- **El reparto responde a necesidad medida, no a visibilidad.** El motor compara
  déficit y superávit y propone traslados justificados, que un humano aprueba.
- **La donación se vuelve verificable.** Un folio permite seguir el recorrido hasta la
  zona de destino, y la confianza sostiene la donación futura.
- **El voluntariado deja de desperdiciarse.** Los cupos por reserva evitan el viaje
  inútil y distribuyen las manos donde hacen falta.
- **La respuesta se vuelve reutilizable.** El modelo cuelga de una entidad Emergencia:
  la herramienta sirve para el próximo desastre sin rehacerse.

---

## 3. Visión inicial del producto

| Elemento | Descripción |
|---|---|
| **Nombre provisional** | **Acopio** |
| **Usuario objetivo** | El operador de centro de acopio y el coordinador de zona afectada, que son quienes alimentan y consumen el dato operativo. En segundo plano, el donante en especie y el voluntario. |
| **Necesidad o problema** | Las donaciones se distribuyen a ciegas: unos puntos se saturan de un insumo mientras otros carecen del mismo, al no haber información consolidada que permita comparar la disponibilidad y las necesidades entre puntos. |
| **Solución preliminar** | Una plataforma web con dos superficies. Una **consola interna autenticada** donde los centros de acopio y las zonas afectadas registran su inventario mediante movimientos inmutables, marcan qué ya no pueden recibir, concilian los comprobantes de las donaciones y gestionan los envíos. Sobre ese inventario compartido opera un **motor de emparejamiento** que calcula el déficit de cada zona a partir de una canasta estándar por persona y día, detecta el excedente de cada acopio y propone traslados ordenados por criticidad, urgencia de vencimiento y cercanía; ninguna propuesta se ejecuta sola: una persona la aprueba, y esa aprobación genera un envío rastreable con código QR. La segunda superficie es un **portal público** que expone el mapa de acopios con lo que urge y lo que ya no reciben, un directorio de causas verificadas que dirige al sitio oficial de cada entidad, y la reserva de turnos de voluntariado. La plataforma **no recauda dinero en ningún momento**. |
| **Alcance inicial** | Los siete módulos se documentan por completo. Se implementan: **inventario** con movimientos, saldos, umbrales y estado *no recibir*; **comprobantes** con carga de facturas, conciliación y seguimiento por folio; **zonas y motor** con cálculo de déficit, ranking de sugerencias y envíos con QR; **mapa de acopios**; **directorio de causas** en versión ligera; y **portal público**. La reserva de turnos se implementa en su forma básica. Autenticación con Supabase, autorización propia por rol y alcance, despliegue en contenedores Docker. |
| **Fuera de alcance inicial** | **Gestión de datos de personas desaparecidas** —dato sensible bajo la Ley 1581, con riesgo de revictimización; la causa solo enlaza a las entidades con mandato legal—. **Procesamiento de pagos o custodia de dinero**, por decisión de producto. **Optimización de rutas de transporte**, problema de investigación de operaciones capaz de consumir el semestre. **Conteo físico de personas presentes** en un acopio: el aforo se administra por reservas, y así se declara en la interfaz. **Doble factor de autenticación** y **permisos granulares por acción**. **Modo sin conexión completo**: se limita al formulario de registro de movimientos. |

---

## 4. Propuesta de valor

### Soluciones existentes revisadas

**1 · Sahana Eden** — <https://sahanafoundation.org>
Plataforma de código abierto para gestión de desastres, con módulos de inventario,
gestión de voluntarios, organizaciones y mapeo. Es probablemente el sistema más
completo del sector y lleva años desplegado en emergencias reales por agencias
humanitarias.

**2 · Ushahidi** — <https://www.ushahidi.com>
Herramienta de mapeo colaborativo de crisis: recoge reportes ciudadanos por SMS,
correo, formularios web y redes sociales, y los georreferencia en un mapa común. Se
hizo conocida por su uso en el terremoto de Haití.

**3 · KoBoToolbox** — <https://www.kobotoolbox.org>
Sistema de recolección de datos en terreno usado por agencias de Naciones Unidas y
organizaciones no gubernamentales. Su mayor virtud es el funcionamiento sin conexión:
los formularios se llenan sin señal y se sincronizan al recuperarla.

### Diferenciación de nuestra propuesta

**Qué de estas soluciones es valioso y nos inspira.** De Sahana Eden tomamos la idea de
un modelo de dominio humanitario explícito, con inventarios y ubicaciones como
ciudadanos de primera clase, y la organización en módulos con límites definidos. De
Ushahidi, la convicción de que un mapa es la interfaz natural de una emergencia y de
que la información debe ser pública y consultable sin cuenta. De KoBoToolbox, la
prioridad absoluta del funcionamiento sin conexión y de la captura rápida en terreno:
es la lección que más pesa en nuestro diseño, y de ella sale el requisito de
registrar un movimiento en menos de diez segundos.

**Qué limitaciones y particularidades de contexto identificamos.**

- **Las tres son herramientas de registro, no de decisión.** Permiten saber qué hay y
  dónde, pero ninguna responde *qué debería moverse a dónde*. La comparación entre lo
  que sobra en un punto y lo que falta en otro sigue siendo un ejercicio mental de un
  coordinador con una hoja de cálculo.
- **Están diseñadas para agencias, no para respuesta ciudadana espontánea.** Sahana
  Eden asume una organización con personal capacitado y tiempo de implantación. En
  Colombia, quien recibe las donaciones es con frecuencia una parroquia, una junta de
  acción comunal o un grupo de vecinos organizado en tres días. Requerir capacitación
  equivale a no ser usado.
- **Ninguna cierra el círculo con el donante.** El ciudadano que compró y entregó una
  caja no tiene forma de verificar que llegó a alguien. Esa desconfianza es un factor
  real de reducción de la donación futura en nuestro contexto.
- **Ninguna comunica hacia afuera lo que un punto ya no puede recibir.** El estado
  *no recibir* existe en la cabeza del encargado, no en una pantalla que el donante
  consulte antes de comprar.
- **Están pensadas en inglés y para flujos internacionales.** No incorporan la Ley 1581
  de 2012 ni el uso de WhatsApp como canal real de difusión en Colombia.

**Qué haremos diferente.**

1. **Un motor de emparejamiento entre déficit y superávit.** Es el núcleo de la
   propuesta. El sistema calcula la necesidad de cada zona a partir de una canasta
   estándar por persona y día, la contrasta con lo recibido, detecta los excedentes de
   cada acopio y produce un ranking de traslados con puntaje explicado en lenguaje
   natural. Ninguna sugerencia se ejecuta sola: una persona aprueba, y esa aprobación
   genera el envío. **Pasamos de un sistema que informa a uno que propone.**
2. **El estado «no recibir» como información pública.** Lo que un acopio ya no puede
   recibir se publica en el mapa y se puede filtrar. Ataca el problema del insumo
   acumulado antes de que se produzca, en el momento en que el donante decide qué
   comprar.
3. **Cadena de custodia hasta el donante.** Un folio permite seguir la donación desde
   la factura subida hasta la zona donde se entregó, sin exponer datos personales.
4. **Diseñado para el operador real, no para un funcionario.** Registrar en menos de
   diez segundos, de pie, con guantes, bajo sol y con la batería casi agotada. Cero
   capacitaciones previas. Cada decisión de interfaz —área táctil de 48 píxeles,
   cifras tabulares, antigüedad visible junto a cada dato, colores del semáforo
   reservados— sale de esa restricción.

**Por qué esa diferencia agrega valor y no es una característica más.**

Porque ataca la causa raíz y no un síntoma. Las tres herramientas revisadas resuelven
el registro; nuestro diagnóstico es que el registro nunca fue el problema. El problema
es que **nadie compara**: un acopio ahogado en agua y una zona sin agua pueden
coexistir a cuarenta kilómetros durante días aunque ambos tengan su inventario
perfectamente registrado, porque no hay quien cruce las dos listas a tiempo.

El motor de emparejamiento es exactamente ese cruce, hecho de forma continua y
justificada. No es una función añadida sobre un inventario: es la razón por la que el
inventario se lleva. Y explica por qué el resto del sistema toma las decisiones que
toma —por qué los saldos se derivan de movimientos inmutables, por qué existe la
canasta estándar, por qué el estado *no recibir* es público—: todo está al servicio
de que la comparación sea posible y confiable.

---

## 5. Roles iniciales y acuerdos de trabajo

### Distribución de responsabilidades

Los roles distribuyen el **seguimiento**, no la propiedad exclusiva del código. Quien
es responsable de un área garantiza que se avance y que quede documentada; no es quien
la programa entera. Los roles rotan cada Sprint.

| Integrante | Responsabilidad inicial | Actividades principales | Rol posible a rotar |
|---|---|---|---|
| **Joseph** | **Arquitectura y Liderazgo de Integración** | Definición del modelo de datos y migraciones; diseño de la arquitectura base; control de la integridad transaccional del inventario; y liderazgo en la integración entre el frontend y la API. *(Nota: La programación de los módulos se distribuye entre los cuatro integrantes).* | Calidad y despliegue |
| **Brayan** | **Análisis de Requerimientos y Diseño UI/UX** | Recolección, análisis crítico y validación de requerimientos con usuarios reales; traducción de necesidades complejas a lógica de sistema; creación del sistema de diseño y prompts de interfaz; asegurar la accesibilidad. | Documentación y coordinación |
| **Alejandra** | **Coordinación de Sprint y documentación** | Planeación y cierre de cada Sprint; tablero de tareas; documentación viva; registro de decisiones en los ADR; mantenimiento del índice del proyecto | Desarrollo del portal público |
| **Michael** | **Aseguramiento de calidad (QA) · Pruebas y despliegue** | Pruebas automatizadas, en especial la de concurrencia del inventario; revisión de código; contenedores Docker; entorno de despliegue y runbook | Arquitectura y base de datos |

**Cobertura de las responsabilidades exigidas.** La guía pide que queden cubiertas
ocho: coordinación de Sprint, diseño UI/UX, arquitectura, revisión de calidad,
desarrollo e integración, pruebas, despliegue, y mantenimiento y documentación. Con
cuatro integrantes, tres de ellos asumen una responsabilidad secundaria además de la
principal, y el reparto queda así:

| Responsabilidad exigida | Responsable |
|---|---|
| Seguimiento del Sprint y coordinación | Alejandra |
| Diseño UI/UX | Brayan |
| Gestión de arquitectura | Joseph |
| Revisión de calidad | Michael |
| Desarrollo e integración | Liderado por Joseph (Código Compartido por el equipo) |
| Pruebas | Michael |
| Despliegue | Michael |
| Mantenimiento y documentación | Alejandra |

El emparejamiento de Brayan no es arbitrario: quien habla con los operadores de acopio
es quien mejor entiende sus condiciones de uso en terreno —una mano ocupada, guantes,
sol directo y batería escasa—, de donde salen directamente las decisiones de interfaz
para una **plataforma web responsive con enfoque _Mobile-First_** (botones grandes de
toque único, modo de alto contraste y flujos ágiles para celular). Poner el
levantamiento de requerimientos y el diseño en la misma persona acorta el camino entre
lo que se observa en campo y lo que aparece en pantalla.

El de Michael sigue la convención habitual entre calidad y despliegue: quien escribe
las pruebas es quien tiene más interés en que el entorno donde corren sea
reproducible.

### Acuerdos de trabajo

**1 · Reuniones.** Una reunión de sincronización semanal de 30 minutos dentro de la
franja de **martes o viernes, de 6:00 p. m. a 8:00 p. m.**, según el espacio que
asigne el docente. Presencial o virtual. Adicionalmente, una revisión de cierre al
terminar cada Sprint. Quien no pueda asistir deja su avance por escrito en el canal
antes de la reunión.

**2 · Canal de comunicación y tiempo de respuesta.** **WhatsApp y Meet** como canales
principales. **Tiempo máximo de respuesta: 24 horas en días hábiles.** Lo urgente se
marca explícitamente como tal; sin esa marca, nada se asume urgente.

**3 · Registro de decisiones relevantes.** Toda decisión difícil de revertir se escribe
como un **ADR** —registro de decisión de arquitectura— en
[docs/02-arquitectura/adr/](../02-arquitectura/adr/README.md), con contexto,
alternativas evaluadas y consecuencias. **Las decisiones aceptadas no se editan:** si
una cambia, se escribe otra que la reemplace, y la anterior conserva su historia.
Ninguna decisión se considera tomada si solo existe en el chat.

**4 · Resolución de desacuerdos técnicos.** Primero se busca evidencia: una prueba, una
medición o un prototipo desechable resuelven la mayoría de las discusiones en menos
tiempo del que toma debatirlas. Si tras eso persiste el desacuerdo, decide quien tenga
la responsabilidad del área, se deja constancia del argumento contrario en el ADR, y se
fija una fecha para revisar la decisión con datos.

**5 · Requerimientos nuevos.** Toda idea o requerimiento que surja se anota en
[docs/01-requerimientos/pendientes.md](../01-requerimientos/pendientes.md), aunque esté
mal redactado. En la reunión semanal cada entrada se promueve a requerimiento formal,
se aplaza al backlog o se descarta con la razón escrita. **Nada se decide en una
conversación que nadie vuelve a leer.**
