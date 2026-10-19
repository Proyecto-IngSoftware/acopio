---
title: "Entrada única para todas las cuentas · diseño"
type: especificacion
tags: [identidad, acceso, diseno]
estado: borrador
actualizado: 2026-10-19
---

# Entrada única para todas las cuentas

## Por qué

Hoy hay dos puertas para iniciar sesión. El botón «Entrar» de la cabecera lleva a `/entrar`
(C01), que pide el nombre de usuario y sirve a la consola. La pestaña «Entrar» de `/donador`
(P13) pide el correo y sirve solo al Donador. Las dos se llaman igual y se ven parecidas. En la
ronda del 2026-10-19 Joseph escribió `admin` en la del Donador y el navegador le pidió un «@».
Si confunde a quien conoce la app, confunde más a un donador.

Joseph decidió el 2026-10-19 que haya un solo formulario de inicio de sesión para todas las
cuentas y que después de entrar cada quien vea lo que su rol permite. Pidió hacerlo antes de la
sustentación del 23, sin cambiar el flujo actual, solo quitando lo que hace pensar en dos
entradas.

## Objetivos

- Un solo formulario, en `/entrar`, para el Donador y para las cuentas del equipo.
- Un solo campo de identificación, «Correo o nombre de usuario». Si lleva «@», se busca la cuenta
  por correo; si no, por nombre de usuario. El equipo puede entrar con cualquiera de los dos.
- Después de entrar, el mismo destino que hoy: el Donador a «Mis donaciones» (`/donador`) y el
  equipo a `/`. Si la persona llegó desde una página que pedía sesión, vuelve a esa página.
- Ninguna pantalla, texto ni documento sigue hablando de dos entradas.

## No objetivos

- No cambia cómo se crean las cuentas. «Crear cuenta» crea siempre una cuenta de Donador; las
  del equipo solo nacen de una invitación del Administrador (RF-IDE-003). La activación de la
  invitación y la confirmación del correo del Donador quedan como están.
- No cambian los permisos, las rutas de la consola, el guard ni la cookie de sesión (ADR-0014).
- No cambia el proveedor de identidad (`local` o `supabase`): sigue recibiendo un correo y una
  contraseña.

## Anti-objetivos

- Que el mensaje de error revele si existe la cuenta, de qué tipo es o si está invitada o
  suspendida. Sigue habiendo un solo mensaje para todo.
- Que alguien pueda crear una cuenta del equipo desde la pantalla pública.
- Que la demo del 23 pierda algo que hoy funciona.

## Cómo queda

### API

- `POST /api/auth/sesion` acepta en `usuario` un correo o un nombre de usuario (hasta 254
  caracteres). Con «@», busca por `correo` (citext, recortado y en minúsculas); sin «@», por
  `username`. Las reglas de hoy se mantienen para cualquier rol, el Donador incluido: la cuenta
  tiene que estar `ACTIVO` y tener correo, y el proveedor valida la contraseña. Si algo falla,
  responde lo mismo que hoy, sin decir cuál fue la causa, y llama igual al proveedor para que el
  tiempo de respuesta no lo delate.
- El límite de 5 intentos por minuto por IP no cambia.
- Sale `POST /api/auth/donador/sesion`. Su lógica pasa a `SesionService.iniciar`.
- Se regeneran el contrato OpenAPI y los tipos de la web.

### Web

- `/entrar` (C01) se titula «Entrar a Acopio», sin «a la consola» ni la lista de roles. El campo
  es «Correo o nombre de usuario» (`autoComplete="username"`, sin mayúscula automática ni
  corrector, y sin `type="email"`, para que acepte `admin`). Debajo del botón va un enlace: «¿Vas
  a donar y no tienes cuenta? Crea tu cuenta de donador», que lleva a `/donador`.
- Al entrar, el Donador va a `/donador` y el resto a `/`, salvo que la URL traiga a dónde volver.
- `/donador` (P13) sin sesión de Donador muestra solo «Crear cuenta de donador», sin pestañas, y
  un enlace «¿Ya tienes cuenta? Entrar» a `/entrar`. Con sesión de Donador sigue mostrando «Mis
  donaciones».
- `ClienteAuth` tiene un solo método para iniciar sesión. Salen `iniciarSesionDonador` y
  `entrarDonador`.
- Cuando se pierde la sesión, todos van a `/entrar`; hoy el Donador iba a `/donador`.
  `RequiereDonador` manda a `/entrar` con la ruta de vuelta (por ejemplo, desde `/donar`).

### Diseño de las pantallas

C01 y P13 ya tienen maqueta aprobada. Los cambios son textos y quitar la pestaña «Entrar» de
P13, así que se ajustan las maquetas existentes (`maqueta.html` de cada carpeta) y se publican en
sus mismas páginas para que Joseph las apruebe antes de tocar el código. Las diferencias quedan
en el README de cada pantalla. No se genera una pantalla nueva en Stitch.

### Lo que se actualiza además

- Pruebas de la web (`Entrar`, `AccesoDonador`, `MiCuenta`, `Sesion`, `cliente-auth`) y las
  utilidades `clienteFalso`.
- Pruebas de integración de sesión y de registro del Donador; `iniciarSesion` de las pruebas
  sigue igual.
- Los recorridos que entran como Donador desde `/donador` (`donador.mjs`,
  `validacion-general.mjs`, `consola-comprobantes.mjs`) entran por `/entrar`.
- Documentos: RF-IDE-004 y RF-IDE-013 en `identidad.md`, la guía de escenarios, `recorridos.md`,
  los README de C01 y P13 y un `P-079` en `pendientes.md` con la decisión.

## Datos que sostienen la regla

- Un nombre de usuario solo admite letras sin tildes, números, punto, guion y guion bajo
  (`CrearUsuarioDto`), así que nunca lleva «@» y la regla no es ambigua.
- Una cuenta del equipo creada sin correo recibe uno sintético (`<usuario>@<dominio
  sintético>`, `UsuariosService.crear`). Sigue entrando con su nombre de usuario como hoy.

## Decisiones del constructor (de Claude, para que Joseph las revise)

- La vuelta a la página de origen usa `?volver=` con rutas internas que empiezan por `/` y no
  por `//`. Hoy C01 siempre manda a `/` y P13 deja al Donador en «Mis donaciones»; se agrega
  para que quien llega a `/donar` sin sesión vuelva a `/donar` después de entrar.
- El texto exacto del enlace a crear cuenta y del título puede ajustarse en la maqueta.
- Si `/donador` sin sesión necesita explicar para qué sirve la cuenta, se usa el texto que ya
  tiene P13.

## Migración de `identidad` a DAO

ADR-0019 pide migrar un módulo cuando se toca, e `identidad` todavía usa Prisma desde sus
servicios, el guard y el proveedor local (unas 34 consultas en 7 archivos). Joseph decidió el
2026-10-19 que la migración va en este mismo cambio. Al terminar, `identidad` entra en
`MIGRADOS_A_DAO` de `apps/api/.dependency-cruiser.cjs` y solo sus `*.dao.ts` inyectan
`PrismaService`. La conducta no cambia: las pruebas de integración de identidad que ya existen
son la red, y se corren antes y después.

## Cambios al construir

(vacío)
