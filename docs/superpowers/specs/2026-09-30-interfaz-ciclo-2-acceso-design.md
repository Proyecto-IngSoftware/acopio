---
title: "Interfaz · Ciclo 2: acceso y sesión · especificación"
type: spec
tags: [spec, interfaz, bloque-0]
estado: vigente
bloque: 0
actualizado: 2026-09-30
---

# Interfaz · Ciclo 2: acceso y sesión · especificación

**Fecha:** 2026-09-30
**Estado:** aprobada por Joseph el 2026-09-30
**Deriva de:** [ciclo 1](2026-09-30-interfaz-ciclo-1-portada-design.md),
[ADR-0014](../../02-arquitectura/adr/ADR-0014-sesion-en-cookie.md) y
[componentes compartidos](../../03-diseno/stitch/_compartidos/README.md)
**Plan:** [05-planes/2026-09-30-interfaz-ciclo-2-acceso.md](../../05-planes/2026-09-30-interfaz-ciclo-2-acceso.md)

## 1. Objetivo

Que una persona invitada active su cuenta, entre con su nombre de usuario y vea la
Portada con la cabecera de sesión, con la sesión en una cookie que JavaScript no puede
leer.

El ciclo termina cuando, en el Compose local, un operador creado por el administrador
abre el enlace de invitación que llega a Mailpit, define su contraseña, entra, ve la
Portada con sus iniciales en la cabecera, recarga la página sin perder la sesión y la
cierra desde el menú de la cuenta.

## 2. Alcance

### Dentro

| Área | Qué | Referencia |
|---|---|---|
| API | Cookie de sesión, `POST /auth/salir`, guard con cookie o Bearer, control de `Origin` | ADR-0014 |
| Web | `ClienteAuth` local y estado de sesión | D-06, ADR-0014 |
| Web | Cabecera de acceso y cabecera con sesión, con el menú de la cuenta | [compartidos](../../03-diseno/stitch/_compartidos/README.md) |
| Web | C01 Entrar (`/entrar`) | RF-IDE-004, [maqueta](../../03-diseno/stitch/C01-acceso/README.md) |
| Web | C01 Activar cuenta (`/invitacion/:token`) | RF-IDE-003, [maqueta](../../03-diseno/stitch/C01-activar/README.md) |
| Web | Proxy de Vite para `/api` | ADR-0014 |

### Fuera

| Qué | Cuándo | Por qué |
|---|---|---|
| Selector de ubicación en la cabecera | Bloque 1 | `/auth/yo` solo devuelve identificadores; los nombres de acopios llegan con el módulo `acopios` |
| Herramientas de «Más» por rol (C16, C17, C18) | Ciclo 3 | Este ciclo deja la sesión lista para ellas |
| Restablecer acceso desde la web | Ciclo 3, con C16 | Lo inicia un administrador; el enlace que recibe la persona ya se atiende en Activar cuenta (`esRestablecimiento`) |
| Renovación del token | Al pasar a Supabase | El adaptador local no renueva (P-025) |

## 3. Decisiones

| # | Decisión | Alternativa descartada |
|---|---|---|
| S-01 | La sesión viaja en la cookie `acopio_sesion` (ADR-0014) | Token en `sessionStorage` o `localStorage`: legible desde JavaScript |
| S-02 | El selector de ubicación no se muestra hasta el Bloque 1 | Mostrar identificadores o textos provisionales que no significan nada |
| S-03 | La web consulta `/auth/yo` al arrancar para saber si hay sesión | Guardar en el navegador una copia de los datos del usuario: se desincroniza con suspensiones y restablecimientos |
| S-04 | Un 401 en cualquier llamada cierra la sesión en la web y lleva a `/entrar` | Reintentar: el token local no se renueva |

## 4. API

### Sesión

`POST /api/auth/sesion` con `{ usuario, contrasena }`:

- 200 con `Set-Cookie: acopio_sesion=<token>; HttpOnly; SameSite=Strict; Path=/api;
  Max-Age=28800` (y `Secure` con `NODE_ENV=production`)
- Cuerpo: `{ expiraEn, usuario: { id, username, nombre, rol } }`, sin `accessToken`
- 401 y 429 como hoy, con el mismo mensaje

`POST /api/auth/salir`: 204 y la cookie vencida. Público.

### Guard

Toma el token de la cookie `acopio_sesion`; si no está, de `Authorization: Bearer`. El
resto de la validación no cambia.

### Control de origen

Un guard o middleware global rechaza con 403 `ORIGEN_NO_PERMITIDO` las peticiones
`POST`, `PUT`, `PATCH` y `DELETE` que traen la cookie y una cabecera `Origin` distinta
de `APP_URL`. Sin cookie (Bearer, curl) no aplica.

### CORS

`enableCors` sigue con `origin: APP_URL` y suma `credentials: true`, por si la web se
sirve alguna vez desde otro origen permitido.

### Pruebas

El ayudante `iniciarSesion` de las pruebas de integración lee el token de la cabecera
`Set-Cookie` y lo devuelve igual que hoy, así las pruebas existentes siguen con Bearer.
Pruebas nuevas:

- El inicio de sesión devuelve la cookie con `HttpOnly`, `SameSite=Strict` y
  `Path=/api`, y el cuerpo no trae el token
- `/auth/yo` responde 200 con solo la cookie
- `/auth/salir` vence la cookie y después `/auth/yo` con esa cookie vencida responde 401
- Una escritura con la cookie y `Origin: https://otro.sitio` responde 403
- La misma escritura con `Origin` igual a `APP_URL` pasa

## 5. Web

### ClienteAuth

`apps/web/src/sesion/cliente-auth.ts`, una interfaz con la implementación local:

```ts
interface ClienteAuth {
  iniciarSesion(usuario: string, contrasena: string): Promise<UsuarioSesion>;
  cerrarSesion(): Promise<void>;
  usuarioActual(): Promise<UsuarioSesion | null>; // GET /auth/yo; null con 401
}
```

La implementación local llama a la API con `credentials: 'include'`. Ninguna pantalla
llama a `/auth/*` directamente.

### Estado de sesión

Un proveedor de React consulta `usuarioActual()` al arrancar y expone el usuario, el
estado de carga, `entrar` y `salir`. El cliente de la API, ante un 401 en una llamada
que exige sesión, avisa al proveedor, que deja la sesión en nulo y lleva a `/entrar`.

### Rutas

| Ruta | Pantalla | Cabecera | Barra inferior |
|---|---|---|---|
| `/` y las del portal | Portada y «Próximamente» | Pública sin sesión; con sesión si la hay | Sí |
| `/entrar` | C01 Entrar | De acceso | No |
| `/invitacion/:token` | C01 Activar cuenta | De acceso | No |

Con sesión iniciada, `/entrar` lleva a `/`.

### C01 Entrar

- Campos «Nombre de usuario» y «Contraseña», con botón para mostrarla.
- Si llega `?usuario=d.mendez` (después de activar), el campo viene escrito.
- 401 y 429 muestran la misma alerta: «Usuario o contraseña incorrectos.» para 401 y el
  `mensaje` de la API para 429.
- Al entrar, lleva a `/`.
- Tarjeta «¿Olvidaste tu contraseña?» y enlace «Volver a la portada», como en la
  maqueta.

### C01 Activar cuenta

- Lee `GET /api/invitaciones/:token`. Mientras carga, esqueleto. Con 404, el `mensaje`
  de la API y el enlace a la portada, sin formulario.
- Muestra usuario, nombre, rol y cantidad de ubicaciones (sin nombres hasta el
  Bloque 1).
- Si `esRestablecimiento` es verdadero, el título es «Restablece tu contraseña» y el
  botón «Guardar contraseña».
- Contraseña y confirmación. Si no coinciden, lo dice la web antes de llamar a la API.
- 422 `CONTRASENA_DEBIL`: muestra el `mensaje` de la API.
- Al activar, lleva a `/entrar?usuario=<username>`.

### Cabecera con sesión

Marca y botón con las iniciales. El botón abre un menú con el nombre, el rol y
«Cerrar sesión». Sin selector de ubicación (S-02).

## 6. Pruebas de la web

| Qué | Cómo |
|---|---|
| ClienteAuth | Cada método llama a la ruta correcta con `credentials: 'include'`; `usuarioActual` devuelve `null` con 401 |
| Entrar | Llena y envía; con 401 muestra la alerta; con `?usuario=` viene escrito; al entrar navega a `/` |
| Activar cuenta | Muestra los datos; 404 sin formulario; contraseñas distintas no llaman a la API; 422 muestra el mensaje; restablecimiento cambia título y botón; al activar navega a Entrar con el usuario |
| Cabecera | Sin sesión muestra «Entrar»; con sesión muestra las iniciales y el menú cierra la sesión |
| 401 en una llamada | Deja la sesión en nulo y lleva a `/entrar` |
| Accesibilidad | axe sin violaciones graves en Entrar, Activar cuenta y la cabecera con el menú abierto |

## 7. Criterios de salida

- [x] El recorrido del §1 funciona en el Compose local, con el enlace de Mailpit
- [x] La cookie es `HttpOnly`, `SameSite=Strict` y `Path=/api`; `document.cookie` no la
      ve y no hay nada de la sesión en `localStorage` ni en `sessionStorage`
- [x] Las pruebas nuevas de la API y de la web pasan, y las anteriores siguen pasando
- [x] axe sin violaciones graves en Entrar, Activar cuenta y el menú de la cuenta, en
      Chromium a 360 × 640
- [x] El contrato OpenAPI, los tipos de la web y `api/README.md` quedan al día
- [ ] El CI de `main` queda en verde

### Cambios al construir

| Qué | Por qué |
|---|---|
| `cookie-sesion.ts` y el guard de origen viven en `apps/api/src/comun/` | Los usan el guard de sesión y el de origen; en `identidad/` habrían roto la regla de dependency-cruiser |
| Prueba extra: con Bearer, el control de origen no aplica | La especificación lo decía y no tenía prueba |
| `cerrarSesion` ignora la respuesta de `/auth/salir` | La web deja la sesión en nulo aunque la llamada falle; el token vence solo |
| Mientras se sabe si hay sesión, la cabecera muestra solo la marca | Evita mostrar «Entrar» a quien sí tiene sesión |
| Activar cuenta muestra «Tu acceso a Acopio» mientras carga | Evita mostrar «Activa tu cuenta» a quien viene a restablecer |
| Las ubicaciones se muestran como cantidad; «Todas» para el Administrador | Los nombres llegan en el Bloque 1 |
| Cada cambio de ruta vuelve al inicio de la página | Al pasar de Activar cuenta a Entrar la persona quedaba a media pantalla |
| Sin el pie «Plataforma oficial de respuesta humanitaria» de la maqueta de Entrar, ni «Respuesta Oficial Caldas 2026» en Activar cuenta | Afirmaban cosas que la plataforma no verifica |
| `username` se convierte a mano en la web (P-031) | El contrato exporta los campos nullable como arreglos |
