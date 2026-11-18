"""Dibuja esquemas para impresión y recorta capturas del prototipo sin alterar sus datos."""
from math import atan2, cos, sin
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

AQUI = Path(__file__).resolve().parent
DOCS = AQUI.parent.parent
SALIDA = AQUI / "figuras"
SALIDA.mkdir(exist_ok=True)
FUENTES = Path("/usr/share/fonts/truetype/dejavu")
REGULAR = ImageFont.truetype(str(FUENTES / "DejaVuSans.ttf"), 36)
NEGRITA = ImageFont.truetype(str(FUENTES / "DejaVuSans-Bold.ttf"), 40)
TINTA = "#18292b"
BORDE = "#264d52"


def esquema(archivo, cajas, flechas):
    imagen = Image.new("RGB", (1800, max(y1 for _, (_, _, _, y1) in cajas) + 40), "white")
    dibujo = ImageDraw.Draw(imagen)
    for (x0, y0), (x1, y1) in flechas:
        dibujo.line((x0, y0, x1, y1), fill=BORDE, width=6)
        giro = atan2(y1 - y0, x1 - x0)
        dibujo.polygon(
            [(x1, y1), (x1 - 24 * cos(giro - .48), y1 - 24 * sin(giro - .48)),
             (x1 - 24 * cos(giro + .48), y1 - 24 * sin(giro + .48))],
            fill=BORDE,
        )
    for texto, (x0, y0, x1, y1) in cajas:
        dibujo.rounded_rectangle((x0, y0, x1, y1), radius=15, fill="#eff5f4", outline=BORDE, width=4)
        lineas = texto.split("\n")
        inicio = (y0 + y1 - 50 * (len(lineas) - 1)) / 2
        for i, linea in enumerate(lineas):
            dibujo.text(((x0 + x1) / 2, inicio + i * 50), linea,
                        font=NEGRITA if i == 0 else REGULAR, fill=TINTA, anchor="mm")
    imagen.save(SALIDA / archivo, dpi=(300, 300))


def roles(archivo, pares):
    cajas, flechas = [], []
    for i, (rol, accion) in enumerate(pares):
        y = 40 + i * 210
        cajas += [(rol, (40, y, 545, y + 165)), (accion, (660, y, 1760, y + 165))]
        flechas.append(((545, y + 82), (660, y + 82)))
    esquema(archivo, cajas, flechas)


roles("funciones.png", [
    ("Portal público", "Consultar puntos de acopio y causas\nReservar turnos de voluntariado"),
    ("Operación en acopio", "Registrar existencias y donaciones\nPreparar remisiones"),
    ("Coordinación de ayuda", "Revisar sugerencias de traslado\nConfirmar recepción en destino"),
])
roles("casos-publico.png", [
    ("Visitante", "Consultar puntos de acopio y causas"),
    ("Donante", "Preparar una donación y seguirla por folio"),
    ("Voluntario", "Reservar un turno disponible"),
])
roles("casos-operacion.png", [
    ("Operador", "Registrar inventario y gestionar remisiones"),
    ("Administrador", "Revisar sugerencias y gestionar la red"),
    ("Receptor", "Confirmar entregas y reportar necesidades"),
])
esquema("paquetes.png", [
    ("apps/web\nInterfaz en React", (40, 40, 780, 230)),
    ("apps/api\nReglas de negocio en NestJS", (1020, 40, 1760, 230)),
    ("packages/shared\nUnidades y fórmulas compartidas", (480, 350, 1320, 540)),
], [((780, 135), (1020, 135)), ((405, 230), (660, 350)), ((1395, 230), (1140, 350))])
esquema("contenedores.png", [
    ("Navegador\nPortal y consola", (40, 40, 780, 230)),
    ("API de Acopio\nOperaciones de la plataforma", (1020, 40, 1760, 230)),
    ("Almacenamiento\nArchivos adjuntos", (40, 355, 780, 545)),
    ("PostgreSQL\nRegistros operativos", (1020, 355, 1760, 545)),
], [((780, 135), (1020, 135)), ((1390, 230), (1390, 355)), ((1160, 230), (710, 355))])

evidencia = DOCS / "entregas/evidencia/avance-05"
stitch = DOCS / "03-diseno/stitch"
for nombre, origen, recorte in (
    ("inventario.png", stitch / "C03-inventario/construida-historial.png", (8, 135, 352, 458)),
    ("folio.png", stitch / "P10-seguimiento/construida.png", (19, 195, 701, 1115)),
    ("sugerencia.png", stitch / "C11-motor/construida.png", (12, 1355, 708, 2260)),
    ("aprobacion.png", evidencia / "motor-2-aprobar.png", (20, 478, 700, 1260)),
    ("despacho.png", evidencia / "motor-3-despachar.png", (22, 289, 698, 1260)),
    ("remision.png", evidencia / "motor-4-documento.png", (18, 178, 701, 1280)),
    ("mapa.png", evidencia / "otras-mapa-puntos.png", (28, 144, 696, 1118)),
    ("verificacion-entidad.png", evidencia / "causas-4-verificar.png", (22, 377, 701, 1118)),
    ("reserva.png", evidencia / "otras-mi-reserva.png", (20, 150, 700, 1109)),
    ("recepcion.png", evidencia / "motor-6-recibida.png", (24, 207, 696, 875)),
    ("causa.png", evidencia / "causas-2-ficha.png", (20, 750, 700, 1125)),
):
    with Image.open(origen) as captura:
        captura.crop(recorte).save(SALIDA / nombre)
