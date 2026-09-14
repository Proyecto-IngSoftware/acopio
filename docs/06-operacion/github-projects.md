---
title: "GitHub — organización y Project"
type: operacion
tags: [operacion]
estado: borrador
actualizado: 2026-09-12
---

# GitHub — organización y Project

Cómo montar la organización de GitHub del equipo y el Project (P-007), y el backlog
inicial listo para copiar en cuanto exista.

**Estado:** el repositorio todavía no existe. Esto se puede montar hoy, sin esperar
al Bloque 0: la organización y el Project no dependen de que haya código.

---

## 1. Por qué una organización y no una cuenta personal

Un repositorio o un Project colgado de la cuenta personal de alguien depende de esa
persona: si pierde acceso, cambia de correo o el equipo rota roles, todo se mueve con
ella. Una **organización** es una cuenta aparte, propiedad del equipo, con sus propios
miembros y su propia facturación (en cero, en el plan gratuito).

## 2. Roles dentro de una organización

| Rol | Qué puede hacer |
|---|---|
| **Owner** | Control total: facturación, borrar la organización, gestionar todos los repos y miembros. Debe haber al menos uno; se recomiendan dos, por si alguien pierde acceso |
| **Member** | Pertenece a la organización, pero solo ve lo que se le asigna explícitamente: un repo, un equipo, un Project |
| **Outside collaborator** | Acceso a un repositorio puntual sin ser miembro de la organización. No aplica aquí: los cuatro son miembros |

Con cuatro personas no hace falta crear *Teams* internos todavía; se invita a cada
quien directamente.

## 3. El plan gratuito alcanza

GitHub Free para organizaciones incluye repositorios públicos y privados ilimitados,
Issues, Projects y Actions con minutos limitados al mes. No incluye SSO ni algunas
protecciones avanzadas de rama, que este proyecto no necesita.

Si alguien del equipo tiene activado el **GitHub Student Developer Pack** (correo
institucional de la ETITC), da beneficios extra, pero no es un requisito para
arrancar hoy.

## 4. Pasos

1. **Crear la organización.** Con sesión iniciada: ícono de perfil → *Settings* →
   *Organizations* (barra lateral, sección *Access*) → **New organization** → plan
   **Free**.
2. **Nombre provisional.** El nombre de la organización no tiene que coincidir con el
   nombre final del producto — todavía en discusión. Se puede renombrar después
   (*Settings* de la organización → *Rename*), aunque cambia la URL, así que mejor
   evitar renombrarla más de una vez. Sugerencia mientras se decide: `acopio-is1`.
3. **Invitar a los tres compañeros como Members.** Pestaña *People* de la
   organización → **Invite member**. Cada quien necesita una cuenta de GitHub, nada
   más — no hace falta que exista un repositorio todavía.
4. **Crear el Project dentro de la organización**, no en la cuenta personal. Pestaña
   *Projects* de la organización → **New project** → plantilla *Table* o *Board*.
5. **Dar acceso al Project.** Si los cuatro ya son *Members* de la organización, en
   *Project → Settings → Manage access* se le puede dar acceso por defecto a **toda
   la organización** en vez de invitar a cada quien por separado.
6. **Cargar el backlog inicial** — sección 5 de esta nota.
7. **Cuando arranque el Bloque 0:** crear el repositorio dentro de la organización
   (dueño = la organización, no una persona), y ahí sí empiezan a importar los
   permisos de repositorio de cada ítem.

## 5. Draft issues: qué son y por qué alcanzan por ahora

Un **draft issue** es una tarjeta de texto que vive solo dentro del Project. No está
ligada a ningún repositorio, así que cualquier persona con acceso al Project la ve y
la edita sin necesitar permiso de repo. Se convierte en un *issue* real —y ahí sí
queda ligada a un repositorio— el día que exista el código al que corresponde.

Es exactamente lo que hace falta ahora: documentar y repartir tareas sin esperar al
Bloque 0.

---

## 6. Backlog inicial — listo para copiar

Siete draft issues, uno por bloque de trabajo del Avance 3. Cada uno trae su lista de
tareas como checklist de Markdown — GitHub las renderiza como casillas dentro del
issue. Fuente: [avance-03-arquitectura.md](../entregas/avance-03-arquitectura.md) y
[pendientes.md](../01-requerimientos/pendientes.md).

Columnas sugeridas del tablero: **Por hacer · En curso · Bloqueado · Hecho**. El
primero nace en *Bloqueado* — depende de la reunión.

---

### Issue 1 · Confirmar decisiones de arquitectura del Avance 3

**Etiqueta:** `reunión` · **Asignado:** equipo · **Estado inicial:** Bloqueado

```
Decisiones que Joseph tomó solo el 2026-09-12 para seguir avanzando. Confirmar o
corregir en la reunión del 2026-09-14. Detalle y razones en pendientes.md.

- [ ] P-005 · Despliegue: local, cada quien con Docker Compose
- [ ] P-007 · Gestión de trabajo: GitHub Projects
- [ ] P-008 · Herramienta de diagramas: Mermaid
- [ ] P-009 · Pruebas: Jest
- [ ] P-010 · Agrupar los 7 módulos en 6 (portal público, turnos, inventario,
      comprobantes, zonas y motor, administración)
- [ ] P-011 · Numeración del ADR: ADR-001 en el Word, ADR-0008 en la bóveda
- [ ] Enfoque arquitectónico: cliente-servidor, monolito modular en capas
- [ ] Nombre de la organización de GitHub (hoy provisional)
```

### Issue 2 · Diagrama de descomposición funcional

**Etiqueta:** `avance-3` · **Asignado:** Brayan · **Estado inicial:** Bloqueado (espera Issue 1)

```
Vista de descomposición funcional del Avance 3: sistema → módulos → submódulos →
funcionalidades, con convención CRUD.

- [ ] Fijar los módulos según lo que se confirme en Issue 1 (P-010)
- [ ] Agrupar los RF de cada módulo en submódulos
- [ ] Marcar cada funcionalidad con C, R, U o D
- [ ] Dibujar el diagrama en Mermaid
- [ ] Incluir la leyenda de convenciones
```

### Issue 3 · Diagrama entidad-relación (modelo de datos)

**Etiqueta:** `avance-3` · **Asignado:** Joseph · **Estado inicial:** Por hacer

```
Vista del modelo de datos del Avance 3, a partir de modelo-datos.md.

- [ ] Decidir qué entidades entran al diagrama y justificar las que se dejan
- [ ] Marcar PK y FK en cada tabla, con tipos de dato
- [ ] Dibujar el diagrama entidad-relación en Mermaid, con cardinalidades
- [ ] Nota sobre la relación ubicacion_tipo + ubicacion_id (sin llave foránea real)
- [ ] Nota de restricciones de integridad, a partir de la tabla de invariantes
- [ ] Relacionar las entidades principales con sus RF e historias
```

### Issue 4 · ADR-001: arquitectura y selección tecnológica

**Etiqueta:** `avance-3` · **Asignado:** Joseph, con Michael · **Estado inicial:** Por hacer (espera Issue 1)

```
El ADR global que pide la guía del Avance 3. No confundir con ADR-0001 a 0006, que
son decisiones de detalle.

- [ ] Estado y fecha
- [ ] Contexto: móvil primero, registro en <10 s, integridad del inventario, sin
      conexión, Ley 1581, equipo de cuatro y un semestre
- [ ] Decisión: enfoque con nombre y tabla completa de 13+ filas, sin blancos
- [ ] Alternativas del enfoque completo, mínimo dos (p. ej. Supabase completo, o
      un monolito MVC sin separación de módulos)
- [ ] Justificación: viabilidad, capacidad del equipo, alcance, requisitos, calidad
- [ ] Consecuencias positivas
- [ ] Matriz de riesgos RTA-01 en adelante (impacto, probabilidad, estrategia),
      mínimo cinco, ninguno genérico
```

### Issue 5 · Diagrama de arquitectura

**Etiqueta:** `avance-3` · **Asignado:** Joseph · **Estado inicial:** Por hacer

```
Complemento gráfico de vista-general.md para el Avance 3.

- [ ] Actores: donante, voluntario, donador, operador, receptor, auditor, administrador
- [ ] Interfaces: portal público y consola
- [ ] Backend con sus módulos
- [ ] PostgreSQL y MinIO
- [ ] Servicios externos: Supabase Auth, OpenStreetMap, correo, sitios de entidades
- [ ] Contenedores de Docker Compose y el proxy
- [ ] Párrafo que explique el diagrama
```

### Issue 6 · Montar el Avance 3 en el Word

**Etiqueta:** `entrega` · **Asignado:** Alejandra · **Estado inicial:** Bloqueado (espera Issues 2-5)

```
Entrega final: mismo Word de OneDrive, después del Avance 2. Plazo 2026-09-14.

- [ ] Agregar las cuatro secciones del Avance 3
- [ ] Insertar los diagramas como imagen legible
- [ ] Actualizar el índice del documento
- [ ] Revisión final del equipo antes del 2026-09-14
```

### Issue 7 · Después del 14 de septiembre

**Etiqueta:** `bóveda` · **Asignado:** equipo · **Estado inicial:** Bloqueado

```
Limpieza posterior a la entrega.

- [ ] Pasar a la bóveda lo que cambió: ADR nuevo, modelo de datos, vista general
- [ ] Guardar los diagramas en docs/assets/
- [ ] Corregir el conteo de RF en 01-requerimientos/README.md (dice 60, hay 67)
- [ ] Retomar el Avance 2 (P-012)
```

---

## Relacionado

- [Avance 3 — tablero de faltantes](../entregas/avance-03-arquitectura.md)
- [Pendientes](../01-requerimientos/pendientes.md) — P-005, P-007 a P-012
- [Avance 1 — roles y acuerdos](../entregas/avance-01-sprint0.md#5-roles-iniciales-y-acuerdos-de-trabajo)
