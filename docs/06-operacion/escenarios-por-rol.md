---
title: "Escenarios de prueba por rol"
type: guia
tags: [pruebas, operacion, servidor]
estado: vigente
actualizado: 2026-10-19
---

# Escenarios de prueba por rol

Qué prueba cada rol en el [servidor de pruebas](despliegue.md) (https://acopio.josephqaz.dev)
durante la primera ronda del equipo ([#58](https://github.com/Proyecto-IngSoftware/acopio/issues/58)).
Cada escenario sale de un criterio de aceptación del
[Avance 2](../entregas/avance-02-requisitos.md#historias) y se escribe como «entro como…,
hago…, debería ver…». Si lo que se ve no coincide, se abre un issue con la etiqueta `pruebas`,
el número del escenario y una captura.

## Cuentas

Las crea `seed:demo` al arrancar el servidor. Todas usan la contraseña de la demo
(`DEMO_CONTRASENA`), que Joseph comparte por el chat del equipo y nunca va en el repositorio.

La consola se entra con el nombre de usuario, no con el correo. Solo el Donador entra con su
correo, desde «Entrar» en `/donador`.

| Rol | Usuario | Correo | Qué tiene asignado |
|---|---|---|---|
| Administrador | `admin` | `admin@acopio.co` | Todo (contraseña propia, no la de la demo) |
| Operador | `operador1` | `joseph@acopio.co` | Acopio Chapinero (prueba) |
| Operador | `operador2` | `brayan@acopio.co` | Acopio Kennedy (prueba) |
| Auditor | `auditor1` | `michael@acopio.co` | Acopio Chapinero (prueba) |
| Receptor | `receptor1` | `alejandra@acopio.co` | Barrio San Agustín (prueba), en Mocoa |
| Donador | | `donador1@demo.acopio.local` | Cuenta confirmada |

Mientras el correo esté apagado (P-055), nadie recibe correos. El registro de un Donador nuevo
no se prueba de punta a punta (P-056), y los enlaces de invitación se copian desde la consola.

Los datos de la demo se pueden gastar: una remisión recibida ya no vuelve a estar en camino, y
una donación conciliada no vuelve a la bandeja. Antes de probar algo que cambia datos, avisar
en el chat para que dos personas no tomen la misma remisión o el mismo folio.

El servidor se despliega solo cada vez que algo entra a `main`. La app guarda una copia para
funcionar sin conexión y no se actualiza sola: cuando hay una versión nueva, abajo aparece «Hay
una versión nueva de Acopio» con el botón «Actualizar». Antes de reportar una falla, toca
«Actualizar», o cierra todas las pestañas del sitio y vuelve a abrirlo. Si no, puedes estar
probando la versión anterior.

Además de `R-2026-DEMA2` y `R-2026-DEMA3`, hay una tercera remisión en camino hacia Barrio San
Agustín, `R-2026-RF4J7`, con 1 L de agua y una foto ya subida. La dejó un recorrido y sirve para
practicar la recepción.

## Portal, sin sesión

1. HU-01.1. Entro sin sesión al mapa y en «¿Qué vas a llevar?» elijo una categoría marcada
   como «no recibir» en algún acopio (en la demo, Azúcar y panela en Chapinero). El mapa
   debería ocultar ese acopio y decir cuántos ocultó, y la ficha del acopio debería mostrar
   «No traigan» con esa categoría y la antigüedad del dato. Que lo oculte en vez de mostrarlo
   con un aviso es una decisión del Bloque 1 (RF-RED-002).
2. HU-01.3. Niego el permiso de ubicación del navegador y toco «cerca de mí». Debería
   poder buscar por dirección en su lugar.
3. HU-09.1. Abro el seguimiento con el folio conciliado `ACO-2026-DEMB2`. Debería ver qué
   se donó y su estado, sin datos del donante ni la factura.
4. HU-09.2. Busco un folio inventado, por ejemplo `ACO-2026-ZZZZZ`. Debería ver el mismo
   mensaje genérico que para cualquier folio que no se encuentra.

## Donador (`donador1@demo.acopio.local`)

5. HU-07.1. Preparo una donación y agrego dos veces el mismo producto, escaneando o
   buscando. Debería ver una sola línea con la cantidad sumada.
6. HU-07.2. Preparo una donación con una categoría que algún acopio tiene en «no
   recibir». Cuando el sistema sugiere dónde entregar, debería marcar esa línea en ese acopio
   antes de que yo elija.
7. HU-07.3. Con 5 donaciones preparadas sin entregar, intento preparar una sexta. Debería
   rechazarla y explicar por qué.
8. Subo la foto de la factura de una donación y la abro. Debería ver la imagen. Si no carga,
   es un fallo del servidor (ADR-0017) y se reporta.

## Operador (`joseph@acopio.co`, Chapinero)

9. HU-04.1. En Entrada rápida busco o escaneo una categoría, escribo la cantidad y
   confirmo. Debería quedar registrada y verse el saldo nuevo de esa categoría.
10. HU-04.2. Registro la entrada de una categoría perecedera sin fecha de vencimiento.
    Debería impedirme confirmar.
11. HU-04.3. Registro la entrada de una categoría que mi acopio tiene en «no recibir».
    Debería advertirme y dejarme guardar igual.
12. HU-05.1. Abro el inventario. Una categoría por debajo de su mínimo debería decir
    «Bajo el mínimo» con ícono y texto, además del color.
13. HU-05.2. En el inventario, una categoría cuyo último movimiento tiene más de 6 horas
    debería verse atenuada y con advertencia. La demo siembra los movimientos al arrancar el
    servidor, así que esto se ve 6 horas después del despliegue en lo que nadie haya tocado.
14. HU-06.1. Marco el agua como «no recibir» en mi acopio. En otra ventana, sin sesión,
    el mapa filtrado por «qué no recibe: agua» debería mostrar Chapinero enseguida.
15. HU-06.2. Programo una fecha de reapertura para mañana. Al día siguiente la categoría
    debería volver a recibirse sola. Se revisa un día después.
16. HU-06.3. Entro como `brayan@acopio.co` y abro la dirección de «no recibir» de
    Chapinero copiada de la sesión de Joseph. Debería rechazarme.

## Operador (`brayan@acopio.co`, Kennedy): remisiones

17. HU-11.1. Armo una remisión con una línea mayor de lo que el acopio puede mandar e
    intento guardarla o despacharla. Debería rechazarla en esa línea.
18. HU-11.2. Despacho un borrador como despacho general, sin zona. Debería pasar a «En
    tránsito», con su documento y QR, y el saldo del acopio debería bajar.

## Auditor (`michael@acopio.co`, Chapinero)

19. HU-08.1. En Conciliación apruebo un comprobante recibido sin diferencias. Debería
    pasar a conciliado con mi nombre y la hora.
20. HU-08.2. Intento rechazar el comprobante con diferencia (8 de 10) sin escribir motivo.
    Debería impedírmelo. Con motivo, queda rechazado y el inventario de Chapinero no baja.

## Receptor (`alejandra@acopio.co`, Barrio San Agustín)

Estos dependen del ciclo 3 del motor (C13 y C20). Si al momento de la ronda no están
desplegados, se saltan.

21. HU-12.1. Desde «Más» abro «Mi zona» y, en «Por recibir», entro a `R-2026-DEMA2` e
    intento confirmar sin foto.
    Debería impedírmelo.
22. Tomo una foto y confirmo `R-2026-DEMA2`. Debería quedar recibida, y la ficha de la zona
    debería contarla en «Recibido».
23. HU-12.2. Recibo `R-2026-DEMA3`, que es un despacho general, eligiendo mi zona.
    Debería quedar recibida y asignada a Barrio San Agustín.
24. HU-13.1. Desde la ficha de mi zona reporto que falta una categoría, con una nota sin
    datos de personas. Sin sesión, el mapa debería mostrar esa necesidad en un área
    aproximada de la zona, con su antigüedad y sin dirección exacta.
    La capa de zonas está en P05 desde el 2026-10-17: el visitante toca el pin de la zona
    para ver la tarjeta.
25. HU-13.2. Marco esa categoría como resuelta. Debería dejar de verse como vigente en el
    mapa, y el reporte anterior sigue en la bitácora.

## Administrador (`admin@acopio.co`)

26. HU-10a.1. Abro el Motor. Cada sugerencia debería explicar la cobertura de la zona, lo
    que sobra en el acopio de origen y la distancia entre los dos.
27. HU-10b.1. Intento descartar una sugerencia sin motivo. Debería impedírmelo.
28. HU-10b.2. Apruebo una sugerencia. Debería crearse una remisión en borrador y quedar en
    la bitácora quién la aprobó.
29. HU-14.1. Invito a una persona, copio el enlace desde la consola, lo uso para crear la
    contraseña y lo abro otra vez. La segunda vez debería ver un mensaje genérico y no poder
    crear otra contraseña.
30. HU-14.2. Con una sesión abierta de la persona invitada en otra ventana, la suspendo.
    Su siguiente acción debería ser rechazada.
31. HU-14.3. Creo un usuario sin correo. Antes de guardar debería advertirme que no podrá
    recuperar su contraseña por sí mismo.

## No probar todavía

Si alguien llega a esto, no es un fallo.

- El registro de un Donador nuevo con confirmación por correo, mientras el correo siga
  apagado (P-056).

HU-01.2 (pieza E), HU-02 y HU-15 (pieza C) y HU-03 (Bloque 5) ya están construidas. Sus
recorridos (`referenciados.mjs`, `portal-causas.mjs`, `consola-causas.mjs`, `portal-turnos.mjs`
y `consola-turnos.mjs`) pasan contra el servidor; todavía no tienen escenarios en esta guía.

## Resultados de la primera ronda

El 2026-10-19 Joseph hizo la ronda solo, con un script de Playwright a 360 × 640 contra el
servidor, sin gastar los datos de la demo antes de la sustentación del 23. Pasaron 1 a 6, 9 a 12
(el 11 sin guardar la entrada), 14, 17, 21 y 24 a 27. El 16 deja abrir la pantalla, aunque la
API rechaza el cambio (#152), y el 13 falla (#151). El 15 quedó marcado (Sal en Chapinero hasta
el 20 de octubre) y se revisa ese día. Hallazgos: #150 y #153, arreglados en el PR de la ronda;
#151, #152 y #154, que es esta guía.

Quedan para el sábado 24, porque gastan datos de la demo: 7 y 8 (Donador), 18 (despachar), 19 y
20 (conciliar), 22 y 23 (recibir `R-2026-DEMA2` y `R-2026-DEMA3`), 28 (aprobar una sugerencia) y
29 a 31 (usuarios). El escáner con un teléfono real (#40) depende de un teléfono.
