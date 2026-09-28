---
title: "Requerimientos no funcionales"
type: requerimientos
tags: [requerimientos, rnf]
estado: vigente
actualizado: 2026-09-12
---

# Requerimientos no funcionales

Cada uno lleva **cómo se verifica**. Un requerimiento no funcional sin forma de
medirlo es una aspiración.

---

## RNF-01 · Móvil primero

La consola se diseña primero para un teléfono, no se adapta después.

| | |
|---|---|
| **Criterio** | Toda pantalla de la consola es completamente operable en 360 × 640 px sin desplazamiento horizontal |
| **Área táctil** | Mínimo 48 × 48 px. Botón primario de ancho completo, 56 px de alto |
| **Verificación** | Recorrido completo de C04 (entrada rápida) en un teléfono real, con una sola mano |

## RNF-02 · Velocidad de registro

Registrar un movimiento de inventario toma **menos de 10 segundos** desde abrir la
app hasta la confirmación.

|                  |                                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| **Por qué**      | Si el registro es tedioso, el operador no lo hace, y el sistema queda ciego. Todo depende de este número |
| **Verificación** | Cronómetro, 5 operadores distintos, 3 intentos cada uno. Mediana bajo 10 s                               |
|                  |                                                                                                          |

## RNF-03 · Legibilidad en condiciones adversas

Uso bajo sol directo, con guantes, con pantalla sucia.

| | |
|---|---|
| **Contraste** | AAA (7:1) en todo dato operativo. AA (4.5:1) es el piso absoluto en texto decorativo |
| **Tipografía** | 16 px mínimo en cuerpo. Nunca 14 px para datos |
| **Prohibido** | Sombras difusas y degradados como único separador. Desaparecen bajo sol. Los límites se marcan con borde de 1 px |
| **Verificación** | Auditoría con Lighthouse y revisión manual en exteriores |

## RNF-04 · Antigüedad visible

**Todo dato operativo se muestra junto a su antigüedad.** `1.240 L · hace 8 min`,
nunca `1.240 L` a secas.

| | |
|---|---|
| **Por qué** | Un número sin marca de tiempo se lee como verdad presente. En logística de emergencia eso produce decisiones erradas |
| **Umbral** | Si el dato tiene más de 6 horas, se muestra atenuado y con advertencia |
| **Verificación** | Revisión de interfaz pantalla por pantalla. Es criterio de aceptación, no sugerencia |

## RNF-05 · Rendimiento

| Operación | Objetivo |
|---|---|
| Carga inicial del home en 3G | < 3 s hasta contenido útil |
| Registro de un movimiento | < 500 ms de respuesta de API |
| Recálculo completo del motor | < 5 s con 50 zonas × 40 categorías |
| Consulta de saldos de un acopio | < 200 ms |

**Verificación:** pruebas de carga con datos sintéticos al cierre de cada bloque.

## RNF-06 · Integridad del inventario

| | |
|---|---|
| **Invariante** | El saldo de una categoría nunca queda negativo |
| **Invariante** | `movimiento` no admite `UPDATE` ni `DELETE`, garantizado por permisos de base de datos, no solo por código |
| **Concurrencia** | Dos operadores registrando a la vez en el mismo acopio no producen saldos incorrectos |
| **Verificación** | Pruebas de concurrencia con transacciones simultáneas. Es la prueba más importante del proyecto |

## RNF-07 · Disponibilidad y degradación

| | |
|---|---|
| **Sin conexión** | C04 sigue capturando movimientos en cola local y sincroniza al recuperar señal |
| **Supabase caído** | Las sesiones activas siguen funcionando; no se puede iniciar sesión nueva. Se muestra un mensaje explícito, no un error genérico |
| **Verificación** | Prueba con modo avión y con el dominio de Supabase bloqueado |

## RNF-08 · Seguridad

| | |
|---|---|
| Buckets de almacenamiento (Garage) privados sin excepción; acceso solo por URL firmada de expiración corta | |
| `service_role` de Supabase jamás en el frontend, ni en variables `VITE_*` | |
| Tokens de invitación almacenados hasheados con SHA-256; comparación en tiempo constante | |
| Límite de intentos por IP en login, canje de invitación, auto-registro de Donador y consulta de folio | |
| Autorización verificada en cada request contra base de datos; nunca cacheada en el JWT | |
| Contraseña de 12 caracteres mínimo, contrastada contra lista de contraseñas comunes | |

**Verificación:** lista de chequeo en revisión de código, más un barrido de secretos
antes de cada despliegue.

## RNF-09 · Privacidad — Ley 1581 de 2012

| | |
|---|---|
| Política de privacidad publicada, con finalidad y temporalidad declaradas | |
| Aviso de transferencia internacional de datos: los correos residen en Supabase, fuera de Colombia | |
| Consentimiento explícito al reservar un turno y al registrarse como Donador | |
| Las facturas pueden contener nombre, cédula y dirección: nunca se muestran en superficie pública | |
| La página de seguimiento por folio revela el recorrido del insumo, **jamás datos del donante** | |

## RNF-10 · Auditoría

Toda operación de escritura queda registrada con usuario, momento y valores
anteriores cuando aplique. La bitácora es append-only y consultable por
administradores y auditores.

## RNF-11 · Accesibilidad

| | |
|---|---|
| Navegación completa por teclado en la consola | |
| Etiquetas ARIA en formularios y en estados del semáforo | |
| **El color nunca es el único portador de significado**: el semáforo lleva ícono y texto además del color | |
| **Verificación** | axe-core sin violaciones críticas, más recorrido con lector de pantalla en C03 y C04 |

## RNF-12 · Idioma

Español de Colombia en toda la interfaz. Formato de números con punto de miles y
coma decimal: `1.240,5 L`. Fechas en formato `d MMM yyyy, h:mm a`.

## RNF-13 · Mantenibilidad

| | |
|---|---|
| Un módulo NestJS por límite de dominio, sin dependencias circulares | |
| Las reglas de negocio puras viven en `packages/shared` y las importan ambos lados | |
| Ningún archivo supera las 300 líneas sin justificación escrita | |
| Migraciones de Prisma versionadas; nunca se edita el esquema a mano en producción | |
