"""Genera la presentación en inglés (video) y en español (sustentación): una ruta que avanza, capturas y el guía Copi.

Necesita Pillow. La fuente sale de node_modules (bun install)."""
import base64
import io
import json
import re
from pathlib import Path

from PIL import Image

from presentacion_es import TEXTOS

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[2]
EVIDENCIA = AQUI.parent / 'evidencia/avance-05'
STITCH = RAIZ / 'docs/03-diseno/stitch'
FUENTE = next(RAIZ.glob(
    'node_modules/.bun/@fontsource-variable+inter@*/node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'
))
PASO = 1500  # distancia entre dos paradas del paisaje, en píxeles

# ---------- capturas ----------

CAPTURAS = {  # ruta y recorte; las marcas usan los píxeles de la imagen original
    'portada': (EVIDENCIA / 'portada-balance.png', (0, 0, 780, 1290)),
    'mapa': (EVIDENCIA / 'otras-mapa-puntos.png', (0, 0, 720, 1120)),
    'inventario': (STITCH / 'C03-inventario/construida.png', (0, 0, 360, 640)),
    'zona': (STITCH / 'C10-ficha-zona/construida.png', (0, 1290, 720, 1486)),
    'canasta': (STITCH / 'C10-ficha-zona/construida.png', (0, 1476, 720, 1730)),
    'sugerencia': (STITCH / 'C11-motor/construida.png', (0, 1346, 720, 2286)),
    'aprobar': (EVIDENCIA / 'motor-2-aprobar.png', (0, 300, 720, 1280)),
    'despachar': (EVIDENCIA / 'motor-3-despachar.png', (0, 210, 720, 1280)),
    'documento': (EVIDENCIA / 'motor-4-documento.png', (0, 0, 720, 1280)),
    'recibida': (EVIDENCIA / 'motor-6-recibida.png', (0, 0, 720, 1000)),
    'folio': (STITCH / 'P10-seguimiento/construida.png', (0, 0, 720, 1120)),
    'reserva': (EVIDENCIA / 'otras-mi-reserva.png', (0, 0, 720, 1120)),
    'causa': (EVIDENCIA / 'causas-2-ficha.png', (0, 150, 720, 1270)),
}


def base64_de(bytes_, tipo):
    return f'data:{tipo};base64,' + base64.b64encode(bytes_).decode()


def img(nombre, ancho, alt):
    """Cada captura se incrusta una sola vez, como variable de CSS; aquí solo se reserva su espacio."""
    _, (x0, y0, x1, y1) = CAPTURAS[nombre]
    alto = round(ancho * (y1 - y0) / (x1 - x0))
    return f'<div class="img" role="img" aria-label="{alt}" style="width:{ancho}px;height:{alto}px;background-image:var(--c-{nombre})"></div>'


def variables():
    salida = ''
    for nombre, (ruta, recorte) in CAPTURAS.items():
        with Image.open(ruta) as original:
            recorte_ = original.convert('RGB').crop(recorte)
            memoria = io.BytesIO()
            recorte_.save(memoria, 'WEBP', quality=88)
        salida += f'--c-{nombre}:url("{base64_de(memoria.getvalue(), "image/webp")}");'
    return salida


def marca(nombre, x0, y0, x1, y1, texto, lado='der'):
    """Recuadro sobre una captura, en píxeles de la imagen original, con su rótulo en inglés."""
    _, (a, b, c, d) = CAPTURAS[nombre]
    izq, arr, an, al = (x0 - a) / (c - a), (y0 - b) / (d - b), (x1 - x0) / (c - a), (y1 - y0) / (d - b)
    return (f'<div class="marca {lado}" style="left:{izq:.2%};top:{arr:.2%};width:{an:.2%};height:{al:.2%}">'
            f'<span>{texto}</span></div>')


def tel(nombre, ancho, alt, marcas='', clases=''):
    return f'<div class="tel {clases}">{img(nombre, ancho, alt)}{marcas}</div>'


# ---------- dibujos ----------

def rect(x, y, w, h, color, r=0, extra=''):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{color}" {extra}/>'


def poli(puntos, color):
    return f'<polygon points="{puntos}" fill="{color}"/>'


def caja(x, base, s=46):
    """Caja de cartón con la cinta de Acopio."""
    return (rect(x, base - s * .8, s, s * .8, '#d9a05b', 3) + rect(x, base - s * .8, s, s * .16, '#b97f3c', 3)
            + rect(x + s * .42, base - s * .8, s * .16, s * .4, '#b0efe1'))


def persona(x, base, ropa='#085046', piel='#a8714a', h=96, pelo='#2b1d14'):
    k = h / 96
    return (f'<g transform="translate({x} {base}) scale({k})">'
            + rect(-13, -34, 11, 34, '#24343a', 4) + rect(2, -34, 11, 34, '#24343a', 4)
            + rect(-19, -72, 38, 44, ropa, 14)
            + f'<circle cx="0" cy="-84" r="15" fill="{piel}"/><path d="M-15-86a15 15 0 0 1 30 0q-8-7-15-6t-15 6z" fill="{pelo}"/></g>')


def arbol(x, base, h=120):
    return (rect(x - 6, base - h * .45, 12, h * .45, '#7a5230', 3)
            + f'<ellipse cx="{x}" cy="{base - h * .66}" rx="{h * .3}" ry="{h * .38}" fill="#2a685d"/>')


def casa(x, base, w=130, h=90, muro='#f6ead8', techo='#085046'):
    return (rect(x, base - h, w, h, muro) + poli(f'{x - 14},{base - h} {x + w / 2},{base - h - 54} {x + w + 14},{base - h}', techo)
            + rect(x + w * .4, base - h * .62, w * .22, h * .62, '#7a5230', 3)
            + rect(x + w * .1, base - h * .66, w * .2, h * .28, '#95d2c5', 2) + rect(x + w * .72, base - h * .66, w * .2, h * .28, '#95d2c5', 2))


def bodega(x, base, w=270, h=130, letrero='ACOPIO'):
    return (rect(x, base - h, w, h, '#085046', 4) + poli(f'{x - 12},{base - h} {x + w / 2},{base - h - 50} {x + w + 12},{base - h}', '#003730')
            + rect(x + w * .16, base - h * .6, w * .68, h * .6, '#00201b') + rect(x + w * .2, base - h * .94, w * .6, 28, '#fafaf9', 4)
            + f'<text x="{x + w / 2}" y="{base - h * .94 + 21}" text-anchor="middle" font-size="20" font-weight="800" fill="#003730">{letrero}</text>')


def camion(x, base):
    return ('<g class="camion">' + rect(x, base - 124, 190, 100, '#fafaf9', 8, 'stroke="#085046" stroke-width="5"')
            + caja(x + 22, base - 26, 50) + caja(x + 78, base - 26, 50) + caja(x + 50, base - 66, 50)
            + f'<path d="M{x + 190} {base - 92}h52l34 40v28h-86z" fill="#085046"/>' + rect(x + 204, base - 82, 34, 30, '#b0efe1', 4)
            + ''.join(f'<g class="rueda" style="transform-origin:{x + c}px {base - 20}px"><circle cx="{x + c}" cy="{base - 20}" r="21" fill="#131b2e"/><path d="M{x + c - 9} {base - 20}h18M{x + c} {base - 29}v18" stroke="#d6d3d1" stroke-width="4"/></g>' for c in (46, 226)) + '</g>')


def cartel(x, base, texto, w=170):
    return (rect(x - 5, base - 150, 10, 150, '#7a5230', 3) + rect(x - w / 2, base - 170, w, 56, '#fafaf9', 6, 'stroke="#7a5230" stroke-width="5"')
            + f'<text x="{x}" y="{base - 133}" text-anchor="middle" font-size="26" font-weight="700" fill="#003730">{texto}</text>')


def bandera(x, base, h=110, color='#085046'):
    return rect(x - 3, base - h, 6, h, '#7a5230') + poli(f'{x + 3},{base - h} {x + 54},{base - h + 18} {x + 3},{base - h + 38}', color)


B = 240  # línea del suelo de cada dibujo
PARADAS = [
    casa(30, B) + arbol(230, B, 150) + persona(290, B, '#b0efe1', '#d9a779') + persona(350, B, '#085046', '#8a5a3a', 84) + caja(392, B, 44),
    bodega(60, B) + caja(110, B, 52) + caja(168, B, 52) + persona(272, B, '#fafaf9', '#a8714a') + caja(360, B, 50) + arbol(450, B),
    bodega(0, B, 200, 110) + ''.join(caja(206 + (i % 3) * 40, B - (i // 3) * 33, 42) for i in range(9)) + bodega(345, B, 170, 110, 'EMPTY'),
    cartel(150, B, 'Coordination', 220) + cartel(400, B, 'Traceability', 210) + arbol(285, B, 90),
    ''.join(bandera(50 + i * 90, B, 100 + 18 * (i % 2), '#085046') for i in range(5)) + arbol(500, B),
    bodega(0, B, 190, 100) + f'<path d="M200 {B - 60}q75-70 150 0" stroke="#d9a05b" stroke-width="7" stroke-dasharray="14 12" fill="none"/>' + bodega(350, B, 170, 100, 'AREA'),
    rect(60, B - 120, 340, 120, '#f6ead8') + rect(60, B - 136, 340, 20, '#085046') + ''.join(rect(84 + i * 62, B - 96, 38, 46, '#95d2c5', 3) for i in range(5)) + rect(206, B - 46, 48, 46, '#7a5230', 3) + f'<text x="230" y="{B - 144}" text-anchor="middle" font-size="24" font-weight="800" fill="#003730">ETITC</text>' + persona(450, B, '#085046', '#d9a779'),
    rect(90, B - 150, 120, 110, '#95d2c5', 14) + rect(90, B - 110, 120, 70, '#2a685d', 14) + rect(106, B - 40, 10, 40, '#7a5230') + rect(184, B - 40, 10, 40, '#7a5230') + persona(290, B, '#d9a05b', '#8a5a3a') + caja(340, B, 54) + caja(398, B, 54) + caja(370, B - 44, 54),
    rect(20, B - 20, 470, 20, '#7a5230', 3) + ''.join(caja(40 + i * 62, B - 20, 58) for i in range(7)) + ''.join(caja(70 + i * 62, B - 66, 58) for i in range(4)),
    camion(60, B) + arbol(440, B, 150),
    casa(0, B, 110, 80, '#fafaf9', '#2a685d') + persona(180, B, '#b0efe1', '#d9a779') + persona(240, B, '#085046', '#8a5a3a') + persona(300, B, '#d9a05b', '#a8714a') + casa(360, B, 120, 90),
    rect(40, B - 150, 14, 150, '#085046') + rect(400, B - 150, 14, 150, '#085046') + rect(30, B - 176, 394, 50, '#085046', 6) + f'<text x="227" y="{B - 142}" text-anchor="middle" font-size="28" font-weight="800" fill="#fafaf9">CHECKPOINT</text>' + persona(230, B, '#fafaf9', '#a8714a') + caja(290, B, 48),
    casa(0, B, 120, 84) + casa(150, B, 110, 76, '#fafaf9', '#2a685d') + persona(310, B, '#b0efe1', '#8a5a3a') + caja(350, B, 46) + persona(430, B, '#085046', '#d9a779', 84) + arbol(490, B),
    ''.join(persona(40 + i * 72, B, c, p, h) for i, (c, p, h) in enumerate((('#085046', '#d9a779', 96), ('#b0efe1', '#8a5a3a', 90), ('#d9a05b', '#a8714a', 100), ('#2a685d', '#d9a779', 94)))) + caja(336, B, 52) + caja(392, B, 52) + caja(364, B - 42, 52),
]

COPI = f'''<svg class="copi" viewBox="0 0 280 320" aria-hidden="true">
<g class="cuerpo">
 <g class="pierna pi"><rect x="88" y="246" width="24" height="54" rx="10" fill="#003730"/><rect x="76" y="290" width="44" height="22" rx="11" fill="#00201b"/></g>
 <g class="pierna pd"><rect x="168" y="246" width="24" height="54" rx="10" fill="#003730"/><rect x="166" y="290" width="44" height="22" rx="11" fill="#00201b"/></g>
 <g class="brazo bi"><path d="M58 176v52" stroke="#b97f3c" stroke-width="20" stroke-linecap="round"/><circle cx="58" cy="236" r="16" fill="#edc48c"/></g>
 <rect x="104" y="40" width="26" height="66" rx="8" fill="#95d2c5"/><rect x="110" y="28" width="14" height="18" rx="4" fill="#085046"/>
 <rect x="142" y="56" width="40" height="50" rx="5" fill="#fafaf9"/><rect x="142" y="70" width="40" height="18" fill="#085046"/>
 <polygon points="58,92 30,58 92,70 116,92" fill="#b97f3c"/><polygon points="222,92 250,58 188,70 164,92" fill="#b97f3c"/>
 <rect x="52" y="90" width="176" height="168" rx="14" fill="#d9a05b"/><rect x="52" y="90" width="176" height="20" rx="10" fill="#b97f3c"/>
 <rect x="126" y="92" width="28" height="36" fill="#b0efe1"/>
 <g class="ojos"><ellipse cx="108" cy="158" rx="17" ry="20" fill="#fff"/><ellipse cx="172" cy="158" rx="17" ry="20" fill="#fff"/><g class="pupilas"><circle cx="111" cy="160" r="9" fill="#131b2e"/><circle cx="175" cy="160" r="9" fill="#131b2e"/><circle cx="114" cy="156" r="3" fill="#fff"/><circle cx="178" cy="156" r="3" fill="#fff"/></g></g>
 <circle cx="84" cy="188" r="10" fill="#e8b277"/><circle cx="196" cy="188" r="10" fill="#e8b277"/>
 <path class="boca" d="M116 190q24 26 48 0z" fill="#5c2f12"/>
 <rect x="116" y="220" width="48" height="30" rx="7" fill="#085046"/><path d="M128 230h24M128 230v12h24v-12M136 236h8" stroke="#b0efe1" stroke-width="3" fill="none"/>
 <g class="brazo bd"><path d="M222 176v52" stroke="#b97f3c" stroke-width="20" stroke-linecap="round"/>
  <g class="prop lupa"><circle cx="222" cy="290" r="30" fill="rgba(176,239,225,.55)" stroke="#085046" stroke-width="9"/><path d="M222 244v18" stroke="#085046" stroke-width="11"/></g>
  <g class="prop tabla"><rect x="192" y="226" width="60" height="78" rx="6" fill="#fafaf9" stroke="#085046" stroke-width="6"/><path d="M204 248l7 8 12-14M204 278l7 8 12-14M230 250h12M230 280h12" stroke="#085046" stroke-width="5" fill="none"/></g>
  <circle cx="222" cy="236" r="16" fill="#edc48c"/></g>
</g></svg>'''


def svg(contenido, ancho=520, alto=240, clases='', alt=''):
    rol = f'role="img" aria-label="{alt}"' if alt else 'aria-hidden="true"'
    return f'<svg class="{clases}" viewBox="0 0 {ancho} {alto}" width="{ancho}" height="{alto}" {rol}>{contenido}</svg>'


def retardo(i, base=0.9, salto=.06):
    return f'style="--d:{base + i * salto:.2f}s"'


# ---------- láminas ----------

def secc(texto):
    return f'<p class="secc"><span>{texto}</span></p>'


def rejilla(n, llenas):
    return ''.join(f'<i class="{"ll" if i < llenas else ""}" {retardo(i, 1, .08)}></i>' for i in range(n))


def clase_unidad(i):
    return 'r' if i < 30 else 'v' if i < 50 else 'f o' if i < 85 else 'f'


UNIDADES = ''.join(f'<i class="{clase_unidad(i)}" {retardo(i, .8, .022) if i < 50 else retardo(i - 50, 3, .04)}></i>' for i in range(100))
BOTELLAS = ''.join(f'<i {retardo(i, 1, .1)}></i>' for i in range(15))


def vistos(n, base):
    return '<span class="vistos">' + ''.join(f'<i {retardo(i, base, .12)}></i>' for i in range(n)) + '</span>'


PASOS = [
    ('Suggestion', 'The system proposes what to move, from where and to where.',
     tel('sugerencia', 418, 'Suggested transfer of 1,600 liters of drinking water, score 0.46',
         marca('sugerencia', 522, 1392, 692, 1512, 'Score') + marca('sugerencia', 18, 1926, 702, 2122, 'Its four parts')), 'The score has four parts: criticality, urgency, proximity and magnitude.'),
    ('Approval', 'The Administrator can change the quantity before approving.',
     tel('aprobar', 400, 'Approval form with 439 kilograms out of 440 suggested',
         marca('aprobar', 20, 772, 700, 890, 'Quantity') + marca('aprobar', 20, 1138, 700, 1258, 'Approve')), 'A person always has the last word before anything moves.'),
    ('Dispatch', 'The load leaves the center, linked to a donation code.',
     tel('despachar', 366, 'Dispatch form with the person responsible and the linked code',
         marca('despachar', 18, 690, 702, 804, 'Who carries it') + marca('despachar', 18, 872, 702, 992, 'Donation code')), 'The code travels with the load.'),
    ('Receipt', 'The Receiver confirms what arrived and attaches a photo.',
     tel('recibida', 390, 'Confirmation that 1 liter of drinking water was received with one photo',
         marca('recibida', 20, 496, 700, 706, 'What arrived')), 'Now we can compare what left with what arrived.'),
]
PORTAL = [
    ('mapa', 'Find', 'Collection points on a map', 'Map of Bogotá with collection points', 'Solid points are Acopio centers. Rings come from RedAcopio Bogotá.'),
    ('folio', 'Follow', 'A donation, with its code', 'Donation tracking: prepared, received and reconciled', 'This page does not show who donated.'),
    ('reserva', 'Volunteer', 'Reserve a place in a shift', 'Reservation confirmed with code, date, time and place', 'The volunteer shows this code on arrival.'),
    ('causa', 'Check', 'Verified organizations', 'Demonstration cause with a verification badge', 'The badge shows the date of the verification.'),
]
ESTACIONES = [('Idea', 'Three projects compared'), ('Requirements', 'User stories for each role'), ('Architecture', 'Modules and data model'),
              ('Two sprints', 'Working increments'), ('Test runs', 'In the browser, with test data')]

# (nombre, tema del paisaje, clases, pose de Copi, globo o lista de globos, contenido)
LAMINAS = [
    ('Acopio', 'noche', 'portada', 'saluda', "Hi! I'm Copi. Come with me on the route of a donation.", f'''
<h1>Acopio</h1>
<p class="lema">A web platform for coordinating donations during disasters</p>
<p class="firma">Brayan Yesid Jurado Gutierrez<br>Maria Alejandra Herrera Gonzalez<br>Michel Esteban Gutierrez Acosta<br>Joseph Daniel Rhomandt Bermudez</p>
<p class="datos">English integrative project, ETITC<br>Presented to: Jorge Albeiro Betancourt Manjarres<br>Bogotá, November 22, 2026</p>
{tel('mapa', 330, 'Map of collection points in Acopio', clases='atras')}{tel('portada', 340, 'Acopio home page on a phone', clases='frente')}'''),

    ('What is a collection center?', 'dia', 'centro', 'senala', 'A collection center receives help, sorts it and sends it where it is needed.', f'''
{secc('Introduction')}
<h2>After a disaster, people bring help to a collection center</h2>
<p class="bajada">In Spanish: <em lang="es">centro de acopio</em>. That is where our name comes from.</p>
<div class="trio">
 <figure>{svg(casa(20, B) + persona(220, B, '#b0efe1', '#d9a779', 120) + caja(262, B, 70), 400)}<figcaption><strong>Donor</strong>brings food, water and other supplies</figcaption></figure>
 <figure>{svg(bodega(20, B, 330, 160) + caja(90, B, 64) + caja(160, B, 64) + caja(126, B - 52, 64) + persona(300, B, '#fafaf9', '#a8714a', 110), 400)}<figcaption><strong>Collection center</strong>receives, sorts and stores them</figcaption></figure>
 <figure>{svg(casa(10, B, 120, 84) + casa(150, B, 110, 76, '#fafaf9', '#2a685d') + persona(310, B, '#085046', '#8a5a3a', 110) + persona(365, B, '#d9a05b', '#d9a779', 90), 400)}<figcaption><strong>Affected area</strong>receives what it needs</figcaption></figure>
 <svg class="viaje" viewBox="0 0 1696 240" width="1696" height="240" aria-hidden="true"><path d="M400 190h250M1050 190h250" stroke="#d9a05b" stroke-width="7" stroke-dasharray="16 14"/><g class="v1">{caja(0, 190, 64)}</g><g class="v2">{caja(0, 190, 64)}</g></svg>
</div>'''),

    ('The problem', 'gris', 'problema', 'piensa', 'Each center can only see its own shelves.', f'''
{secc('Background')}
<h2>Each center keeps its own records, so help can go to the wrong place</h2>
<div class="estantes">
 <figure><div class="cajas">{rejilla(20, 20)}</div><figcaption>One center has more than it can store</figcaption></figure>
 <figure><div class="cajas">{rejilla(20, 2)}</div><figcaption>Another area still needs supplies</figcaption></figure>
</div>
<div class="libreta"><p><strong>What we saw</strong><br>Collection center in Bogotá, August 20, 2026</p>
<ul><li {retardo(0, 2.6, .5)}>Supplies arrived unevenly</li><li {retardo(1, 2.6, .5)}>It was hard to assign tasks to volunteers</li><li {retardo(2, 2.6, .5)}>The staff were overloaded</li></ul></div>
<p class="aclara">The shelves are an illustration, not measured data.</p>'''),

    ('Problem question', 'noche', 'pregunta', 'piensa', '"In kind" means goods, such as food and water.', f'''
{secc('Problem question')}
<h2>How can a web platform support the coordination and traceability of donations in kind between collection centers and affected areas during the response to a disaster?</h2>
<dl><div {retardo(0, 1.2)}><dt>Coordination</dt><dd>Centers and areas share what they have and what they need.</dd></div>
<div {retardo(8, 1.2)}><dt>Traceability</dt><dd>We can follow a donation from start to finish.</dd></div></dl>'''),

    ('Objectives', 'dia', 'objetivos', 'tabla', 'One general objective and five specific ones.', f'''
{secc('Objectives')}
<h2>Develop a web platform that supports the coordination of donations in kind</h2>
<ol>{''.join(f'<li {retardo(i, 1, .3)}>{t}</li>' for i, t in enumerate(('Define what each user needs', 'Record inventory and follow donations', 'Suggest transfers, with approval before dispatch', 'Publish verified information and volunteer shifts', 'Test the prototype and document its limits')))}</ol>
{tel('inventario', 330, 'Inventory screen with quantities of each item', marca('inventario', 10, 296, 350, 424, 'Inventory', 'abajo'), clases='o1')}
{tel('folio', 330, 'Tracking of a donation by its code', marca('folio', 24, 548, 696, 846, 'Tracking', 'abajo'), clases='o2')}'''),

    ('Justification', 'dia', 'justif', 'senala', 'With this screen, people can check what is needed before donating.', f'''
{secc('Justification')}
<h2>The purpose is a shared record of donations</h2>
<div class="antes"><h3>Without it</h3>{svg(bodega(0, B, 190, 110, 'CENTER') + casa(330, B, 130, 80) + f'<path d="M200 {B - 70}h50M290 {B - 70}h30" stroke="#93000a" stroke-width="7" stroke-dasharray="12 10"/><path d="M254 {B - 88}l32 36M286 {B - 88}l-32 36" stroke="#93000a" stroke-width="9"/>', 480)}
<p>A center keeps receiving an item it can no longer store.</p><p>An area with little coverage is left out.</p></div>
<div class="despues"><h3>With it</h3>{svg(bodega(0, B, 190, 110, 'CENTER') + casa(330, B, 130, 80) + f'<path class="traza" pathLength="1" d="M196 {B - 70}q64-70 134 0" stroke="#085046" stroke-width="8" fill="none"/>' + caja(236, B - 92, 54), 480)}
<p>Coordinators can identify a possible transfer.</p><p>Donors know where to deliver.</p></div>
{tel('portada', 352, 'Home page: what is needed and what not to bring', marca('portada', 62, 832, 392, 950, 'What is needed', 'arriba') + marca('portada', 400, 832, 716, 950, 'Do not bring', 'debajo'), clases='grande')}'''),

    ('Methodology', 'dia', 'metodo', 'normal', 'We moved step by step, from an idea to a prototype.', f'''
{secc('Methodology')}
<h2>We worked in iterations, from the idea to the test runs</h2>
<svg class="linea" viewBox="0 0 1500 60" width="1500" height="60" aria-hidden="true"><path class="traza" pathLength="1" d="M16 30H1420" stroke="#085046" stroke-width="10"/></svg>
<ol>{''.join(f'<li {retardo(i, .8, .32)}><strong>{a}</strong>{b}</li>' for i, (a, b) in enumerate(ESTACIONES))}</ol>
<div class="pila"><div {retardo(0, 2.6, .4)}>{svg(rect(4, 4, 152, 102, '#fafaf9', 8, 'stroke="#085046" stroke-width="7"') + rect(4, 4, 152, 24, '#085046', 8) + rect(24, 46, 70, 12, '#95d2c5') + rect(24, 70, 110, 12, '#d6d3d1'), 160, 112)}<p><strong>React</strong>what people see</p></div>
<div {retardo(1, 2.6, .4)}>{svg(''.join(rect(4, 4 + i * 36, 152, 30, '#085046', 6) + f'<circle cx="24" cy="{19 + i * 36}" r="6" fill="#b0efe1"/>' for i in range(3)), 160, 112)}<p><strong>NestJS</strong>the rules of the system</p></div>
<div {retardo(2, 2.6, .4)}>{svg('<path d="M10 24v64c0 26 140 26 140 0V24" fill="#085046"/><ellipse cx="80" cy="24" rx="70" ry="20" fill="#95d2c5"/><path d="M10 56c0 26 140 26 140 0" stroke="#95d2c5" stroke-width="5" fill="none"/>', 160, 112)}<p><strong>PostgreSQL</strong>where records are kept</p></div></div>'''),

    ('Theoretical framework', 'dia', 'teoria', 'lupa', 'Thanks to traceability, I always know where I came from.', f'''
{secc('Theoretical framework')}
<h2>Two ideas support the design</h2>
<div class="t1"><h3>Logistics traceability</h3><p>Every entry, exit and receipt leaves a record.</p></div>
{tel('documento', 300, 'Dispatch document with origin, destination, linked code and QR', marca('documento', 16, 388, 620, 620, 'From and to') + marca('documento', 14, 1008, 306, 1276, 'QR code'), clases='doc')}
<div class="t2"><h3>Humanitarian standards</h3>
<p class="cifra"><b>15 L</b> of water per person per day</p><div class="botellas" aria-hidden="true">{BOTELLAS}</div>
<p class="cifra"><b>2,100</b> kilocalories per person per day</p>
<p>Planning references. They must be adjusted to each place.</p><p class="fuente">Sphere Handbook (Asociación Esfera, 2018)</p></div>'''),

    ('An example', 'dia', 'ejemplo', 'senala', 'Take away the orange boxes: 50 units are missing.', f'''
{secc('Project development')}
<h2>How Acopio calculates what is missing</h2>
<p class="bajada">An affected area needs 100 units of one item.</p>
<div class="unidades" role="img" aria-label="Of 100 units, 30 received, 20 on the way, 50 still needed; one center can give 35">{UNIDADES}</div>
<div class="leyenda"><p class="lr"><b>30</b>received</p><p class="lv"><b>20</b>on the way</p><p class="lo" {retardo(0, 2.9)}><b>35</b>one center can give</p><p class="lf" {retardo(0, 4.4)}><b>15</b>left to cover</p></div>
<div class="real"><p><strong>The same calculation in the app</strong></p>{tel('zona', 470, 'Oil in a demonstration area: needs 336 liters, 0 received, 0 on the way, 336 missing', marca('zona', 14, 1374, 706, 1480, 'Needs, received, on the way, missing', 'abajo'))}
<p class="p2"><strong>And the sources it cites</strong></p>{tel('canasta', 470, 'The app cites the Sphere Handbook as a source of the basket')}</div>'''),

    ('From suggestion to receipt', 'dia', 'flujo', 'senala', [p[3] for p in PASOS], f'''
{secc('Project development')}
<h2>Four steps, and a person approves the transfer</h2>
<ol class="lista-pasos">{''.join(f'<li data-p="{i}"><strong>{p[0]}</strong><span>{p[1]}</span></li>' for i, p in enumerate(PASOS, 1))}</ol>
<div class="visor">{''.join(f'<div data-p="{i}">{p[2]}</div>' for i, p in enumerate(PASOS, 1))}</div>
<p class="aclara">Screens in Spanish,<br>from different<br>demonstration runs</p>'''),

    ('Public portal', 'dia', 'portal', 'senala', [p[4] for p in PORTAL], f'''
{secc('Project development')}
<h2>What anyone can do on the public portal</h2>
<div class="abanico">{''.join(f'<figure data-p="{i}"><figcaption><strong>{t}</strong>{s}</figcaption>{tel(n, 272, a)}</figure>' for i, (n, t, s, a, _) in enumerate(PORTAL, 1))}</div>'''),

    ('Scope and results', 'dia', 'result', 'tabla', 'All of this was checked with demonstration data.', f'''
{secc('Scope and results')}
<h2>The main workflow passed its checks</h2>
<div class="marcas"><p><b>9 of 9</b>suggestion engine{vistos(9, .9)}</p><p><b>7 of 7</b>dispatch{vistos(7, 2)}</p><p><b>7 of 7</b>receipt{vistos(7, 2.9)}</p></div>
<div class="alcance"><p><strong>The prototype covers</strong> public information, inventory, donation tracking, transfers and reservations.</p>
<p><strong>Not measured yet:</strong> delivery times, adoption and impact in a real emergency.</p><p class="fuente">Local run of October 19, 2026 (Acopio Team, 2026i)</p></div>
{tel('recibida', 380, 'Receipt confirmed in a demonstration', marca('recibida', 20, 496, 700, 706, 'Received', 'izq'), clases='lado')}'''),

    ('Conclusions', 'dia', 'conclu', 'levanta', 'Next stop: a trial with real organizations!', f'''
{secc('Conclusions')}
<h2>A shared record can support coordination</h2>
<div class="tres">
<figure {retardo(0, .8, .7)}><div class="recorte" style="background-image:var(--c-aprobar);background-position:50% 100%"></div><figcaption>Suggestions help because a person reviews and approves them.</figcaption></figure>
<figure {retardo(1, .8, .7)}><div class="recorte" style="background-image:var(--c-folio);background-position:50% 47%"></div><figcaption>The tracking code and the confirmation of receipt let us follow the aid.</figcaption></figure>
<figure {retardo(2, .8, .7)}><div class="recorte" style="background-image:var(--c-mapa);background-position:50% 50%"></div><figcaption>The next step is a field trial with humanitarian organizations.</figcaption></figure></div>'''),

    ('Thank you', 'noche', 'gracias', 'saluda', 'Thank you for coming with me!', f'''
<h2>Thank you</h2>
<div>{secc('Main sources')}
<ul><li>Acopio Team. (2026). Progress reports 1 to 5. ETITC.</li><li>APC Colombia. (2026). Guidelines for coordinating donations and humanitarian aid.</li>
<li>Asociación Esfera. (2018). The Sphere Handbook.</li><li>Unidad Nacional para la Gestión del Riesgo de Desastres. (2013). Standardization manual for humanitarian aid in Colombia.</li></ul>
<p class="datos">The complete bibliography is in the written work.</p></div>'''),
]

# ---------- estilos ----------

COLINA = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1600' height='260' viewBox='0 0 1600 260'%3E"
          "%3Cpath d='M0 150C200 40 330 40 520 130S860 200 1040 90s380-30 560 60v110H0z' fill='{c}'/%3E%3C/svg%3E")

CSS = '''
@font-face{font-family:Inter;src:url(FUENTE) format("woff2");font-weight:100 900}
:root{--primary:#003730;--container:#085046;--fixed:#b0efe1;--dim:#95d2c5;--fondo:#fafaf9;--piedra:#e7e5e4;--borde:#d6d3d1;--tinta:#131b2e;--gris:#3f4946;--carton:#d9a05b;--carton-osc:#b97f3c;VARIABLES}
*{box-sizing:border-box;margin:0}
html,body{height:100%;background:#00201b;overflow:hidden;font-family:Inter,Arial,sans-serif;color:var(--tinta)}
main{position:absolute;left:50%;top:50%;width:1920px;height:1080px;transform-origin:0 0;overflow:hidden;transition:background-color 1s;background:#eef8f4}
main[data-tema=noche]{background:var(--primary)}main[data-tema=gris]{background:#ecebe9}
p,li,dd,dt,span,figcaption{font-size:32px;line-height:1.35}figcaption,dd{text-wrap:balance}
/* paisaje */
.colinas{position:absolute;left:0;right:0;height:260px;background-repeat:repeat-x;background-position-y:100%;transition:background-position-x 1.5s cubic-bezier(.6,.05,.25,1),opacity 1s}
.c1{bottom:110px;background-image:url("COLINA1");opacity:.75}.c2{bottom:70px;background-image:url("COLINA2");background-size:1200px 220px;opacity:.8}
main[data-tema=noche] .colinas{opacity:.22}main[data-tema=gris] .colinas{opacity:.4}
.mundo{position:absolute;left:0;bottom:94px;height:240px;transition:transform 1.5s cubic-bezier(.6,.05,.25,1)}
.mundo svg{position:absolute;bottom:0}
.via{position:absolute;left:0;right:0;bottom:0;height:98px;background:#4a5552}
.via::before{content:"";position:absolute;inset:0 0 auto;height:10px;background:#707976}
/* guía */
.guia{position:absolute;left:96px;bottom:56px;width:210px;height:240px;z-index:5}
.copi{width:100%;height:100%;overflow:visible}
.copi .brazo{transform-box:view-box;transition:transform .5s}.copi .bi{transform-origin:58px 176px;transform:rotate(18deg)}.copi .bd{transform-origin:222px 176px;transform:rotate(-18deg)}
.copi .pierna{transform-box:view-box}.copi .pi{transform-origin:100px 248px}.copi .pd{transform-origin:180px 248px}
.copi .prop{opacity:0;transition:opacity .3s}
.copi .ojos{transform-box:view-box;transform-origin:140px 158px}
.guia.parpadea .ojos{transform:scaleY(.08)}
.pose-saluda .bd{animation:saludo .5s 1.5s ease-in-out 6 alternate;transform:rotate(-150deg)}
.pose-senala .bd{transform:rotate(-128deg)}.pose-senala .pupilas{transform:translate(4px,-6px)}
.pose-piensa .bd{transform:rotate(58deg)}.pose-piensa .pupilas{transform:translate(3px,-8px)}
.pose-levanta .bd{transform:rotate(-155deg)}.pose-levanta .bi{transform:rotate(155deg)}.pose-levanta .cuerpo{animation:salto .35s 1.5s ease-out 6 alternate}
.pose-lupa .bd{transform:rotate(-152deg)}.pose-lupa .lupa,.pose-tabla .tabla{opacity:1}.pose-tabla .bd{transform:rotate(-30deg)}
.anda .cuerpo{animation:bote .25s ease-in-out 6 alternate}.anda .pi{animation:zancada .25s ease-in-out 6 alternate}.anda .pd{animation:zancada .25s .25s ease-in-out 5 alternate-reverse}
.habla .boca{animation:boca .16s 10 alternate;transform-box:fill-box;transform-origin:50% 0}
.globo{position:absolute;left:316px;bottom:126px;width:560px;min-height:92px;padding:20px 28px;background:#fff;border:4px solid var(--container);border-radius:24px 24px 24px 4px;font-size:30px;font-weight:600;line-height:1.28;color:var(--primary);transform-origin:0 100%;z-index:5}
.globo.sale{animation:globo .35s cubic-bezier(.3,1.4,.6,1) backwards}
@keyframes saludo{from{transform:rotate(-135deg)}to{transform:rotate(-172deg)}}
@keyframes salto{to{transform:translateY(-22px)}}@keyframes bote{to{transform:translateY(-8px)}}
@keyframes zancada{from{transform:rotate(-24deg)}to{transform:rotate(24deg)}}
@keyframes boca{to{transform:scaleY(.25)}}@keyframes globo{from{transform:scale(0)}}
/* láminas */
.lamina{position:absolute;inset:0;padding:64px 112px;visibility:hidden;opacity:0;transform:translateX(160px);transition:opacity .3s,transform 0s .3s,visibility 0s .3s}
.lamina.activa{visibility:visible;opacity:1;transform:none;transition:opacity .5s .45s,transform .9s .45s cubic-bezier(.2,.8,.2,1),visibility 0s}
.lamina.atras:not(.activa){transform:translateX(-160px)}
.noche{color:var(--fondo)}
h1{font-size:200px;font-weight:850;letter-spacing:-8px;line-height:.95}
h2{font-size:62px;font-weight:780;letter-spacing:-1.6px;line-height:1.1;max-width:1560px;text-wrap:balance}
h3{font-size:38px;font-weight:750;color:var(--container);margin-bottom:10px}
.bajada{font-size:36px;color:var(--gris);margin-top:16px}
.secc{margin-bottom:20px}.secc span{display:inline-block;background:var(--container);color:#fff;font-size:28px;font-weight:650;padding:8px 44px 8px 22px;clip-path:polygon(0 0,calc(100% - 24px) 0,100% 50%,calc(100% - 24px) 100%,0 100%)}
.noche .secc span{background:var(--carton);color:#00201b}
.aclara,.fuente{font-size:26px;color:var(--gris)}
.activa [style*="--d"]{animation:aparece .5s var(--d) backwards}
@keyframes aparece{from{opacity:0;transform:translateY(14px) scale(.96)}}
.tel{position:relative;width:max-content;border:9px solid #00201b;border-radius:34px;background:#00201b;box-sizing:content-box}
.tel{overflow:visible}.img{background-size:100% 100%;background-position:top;border-radius:25px}
.tel .marca{box-shadow:0 0 0 3px #00201b}.marca{position:absolute;border:6px solid var(--carton);border-radius:14px}
.marca span{position:absolute;top:50%;transform:translateY(-50%);background:var(--carton);color:#00201b;font-size:27px;font-weight:700;padding:8px 18px;border-radius:8px;white-space:nowrap}
.marca.der span{left:calc(100% + 26px)}.marca.izq span{right:calc(100% + 26px)}
.marca.der::after,.marca.izq::after{content:"";position:absolute;top:50%;width:30px;border-top:6px solid var(--carton)}
.marca.der::after{left:100%}.marca.izq::after{right:100%}
.marca.abajo span,.marca.debajo span{top:calc(100% + 14px);left:50%;transform:translateX(-50%)}.marca.arriba span{top:auto;bottom:calc(100% + 14px);left:50%;transform:translateX(-50%)}
.activa .marca{animation:senal .5s 1.5s backwards}.activa .marca+.marca{animation-delay:2.1s}
@keyframes senal{from{opacity:0;transform:scale(1.25)}}
/* 1 */
.lema{font-size:46px;font-weight:550;color:var(--fixed);width:900px;margin-top:26px;line-height:1.2}
.firma{margin-top:38px;font-size:31px}.datos{font-size:27px;color:var(--dim);margin-top:22px}
.portada .tel{position:absolute}.portada .frente{left:1130px;top:66px;transform:rotate(-4deg)}.portada .atras{left:1478px;top:96px;transform:rotate(6deg)}
.portada.activa .frente{animation:entra1 1s .7s cubic-bezier(.2,.9,.3,1.15) backwards}.portada.activa .atras{animation:entra2 1s .95s cubic-bezier(.2,.9,.3,1.15) backwards}
@keyframes entra1{from{transform:translateY(900px) rotate(14deg)}}@keyframes entra2{from{transform:translateY(900px) rotate(-12deg)}}
/* 2 */
.trio{position:relative;display:flex;gap:248px;margin-top:54px}.trio figure{margin:0;width:400px;text-align:center}.trio figcaption strong{display:block;font-size:42px;color:var(--container)}
.viaje{position:absolute;left:0;top:0}.viaje g{transform:translateX(590px)}.viaje .v2{transform:translateX(1238px)}
.activa .viaje .v1{animation:v1 1.8s 1.3s ease-in-out backwards}.activa .viaje .v2{animation:v2 1.8s 3s ease-in-out backwards}
@keyframes v1{from{transform:translateX(380px)}}@keyframes v2{from{transform:translateX(1030px)}}
/* 3 */
.estantes{display:flex;gap:60px;margin-top:44px}.estantes figure{margin:0;width:470px}.cajas{display:grid;grid-template-columns:repeat(5,1fr);gap:0 10px;padding:16px 16px 0;background:#cfcac4;border-radius:10px}
.cajas i{height:72px;border-bottom:10px solid #7a5230;position:relative}
.cajas .ll::before{content:"";position:absolute;inset:8px 6px 0;background:linear-gradient(var(--carton-osc) 18%,transparent 0),linear-gradient(90deg,transparent 42%,var(--fixed) 0 58%,transparent 0) 0 0/100% 60% no-repeat,var(--carton);border-radius:3px}
.estantes figcaption{margin-top:16px;font-weight:650}
.libreta{position:absolute;left:1180px;top:262px;width:628px;background:#fff;padding:38px 40px 30px;transform:rotate(1.5deg);border-top:26px solid var(--container)}
.libreta ul{list-style:none;padding:0;margin-top:22px}.libreta li{padding:12px 0 12px 58px;position:relative;border-bottom:2px solid var(--borde)}
.libreta li::before{content:"";position:absolute;left:4px;top:18px;width:26px;height:26px;border:5px solid var(--carton-osc);border-radius:50%}
.problema .aclara{position:absolute;left:112px;top:736px}
/* 4 */
.pregunta h2{font-size:76px;max-width:1700px;font-weight:700;line-height:1.12;text-wrap:pretty}
.pregunta dl{display:flex;gap:70px;margin-top:40px}.pregunta dl div{width:720px}.pregunta dt{font-size:46px;font-weight:780;color:var(--carton)}.pregunta dd{margin:0;font-size:36px;color:var(--fixed)}
/* 5 */
.objetivos h2{max-width:980px}.objetivos ol{list-style:none;counter-reset:n;padding:0;margin-top:30px;width:980px}
.objetivos li{counter-increment:n;display:flex;align-items:center;font-size:36px;margin-bottom:17px}
.objetivos li::before{content:counter(n);flex:none;width:58px;height:54px;margin-right:24px;display:grid;place-items:center;background:var(--carton);color:#00201b;font-weight:800;border-radius:6px}
.objetivos .tel{position:absolute}.o1{left:1130px;top:74px;transform:rotate(-3deg)}.o2{left:1478px;top:120px;transform:rotate(4deg)}
/* 6 */
.antes,.despues{position:absolute;top:226px;width:560px}.antes{left:112px}.despues{left:740px}.antes h3{color:var(--error,#93000a)}
.antes p,.despues p{margin-top:12px;font-size:33px}.antes svg,.despues svg{margin:6px 0 10px}
.justif .grande{position:absolute;left:1420px;top:64px}
.traza{fill:none;stroke-dasharray:1;stroke-dashoffset:0}.activa .traza{animation:traza 1.8s .8s ease-in-out backwards}@keyframes traza{from{stroke-dashoffset:1}}
/* 7 */
.linea{display:block;margin-top:38px}.metodo ol{list-style:none;padding:0;display:flex;margin-top:-58px}
.metodo li{width:340px;padding-top:70px;position:relative;font-size:29px;color:var(--gris);padding-right:20px}
.metodo li strong{display:block;font-size:38px;color:var(--container)}
.metodo li::before{content:"";position:absolute;left:0;top:4px;width:50px;height:46px;border-radius:5px;background:linear-gradient(var(--carton-osc) 18%,transparent 0),linear-gradient(90deg,transparent 42%,var(--fixed) 0 58%,transparent 0) 0 0/100% 55% no-repeat,var(--carton)}
.pila{display:flex;gap:80px;margin-top:56px}.pila>div{display:flex;gap:24px;align-items:center}.pila p{font-size:30px}.pila strong{display:block;font-size:40px;color:var(--container)}
/* 8 */
.t1{position:absolute;left:112px;top:226px;width:330px}.t1 p{font-size:35px}.teoria .doc{position:absolute;left:480px;top:222px}
.t2{position:absolute;left:1100px;top:222px;width:730px}.cifra{display:flex;align-items:baseline;gap:20px;font-size:31px;white-space:nowrap}.cifra b{font-size:88px;letter-spacing:-3px;color:var(--container);line-height:1.05}
.botellas{display:flex;gap:9px;margin:4px 0 16px}.botellas i{width:34px;height:62px;border-radius:9px 9px 7px 7px;background:linear-gradient(#95d2c5 0 30%,#2a685d 0);position:relative}.botellas i::before{content:"";position:absolute;left:10px;top:-9px;width:14px;height:11px;background:var(--container);border-radius:3px}
.t2 .fuente{margin-top:8px}
/* 9 */
.unidades{display:grid;grid-template-rows:repeat(5,1fr);grid-auto-flow:column;grid-auto-columns:1fr;gap:7px;width:1100px;height:310px;margin-top:26px}
.unidades i{border-radius:5px;border:3px dashed #8a908e;position:relative}
.unidades .r,.unidades .v{border:0}.unidades .r{background:var(--container)}.unidades .v{background:var(--dim)}
.unidades .f{animation:none!important}.unidades .o::before{content:"";position:absolute;inset:-3px;border-radius:5px;background:linear-gradient(var(--carton-osc) 20%,transparent 0),var(--carton)}
.activa .unidades .o::before{animation:aparece .45s var(--d) backwards}
.leyenda{display:grid;grid-template-columns:330px 220px 385px 165px;width:1100px;margin-top:12px}.leyenda p{font-size:28px}.leyenda b{display:block;font-size:56px;line-height:1.05;letter-spacing:-1px}
.lr b{color:var(--container)}.lv b{color:#2a685d}.lo b{color:#7a4a12}.lf b{color:var(--gris)}
.real{position:absolute;left:1310px;top:232px;width:500px}.real p{margin-bottom:14px}.real .p2{margin-top:78px}.real .marca span{font-size:24px;padding:8px 12px}
/* 10 */
.lista-pasos{list-style:none;padding:0;margin-top:20px;width:690px;counter-reset:n}
.lista-pasos li{counter-increment:n;padding:9px 20px 10px 92px;position:relative;border-radius:10px;transition:background-color .4s,opacity .4s;opacity:.74}
.lista-pasos li::before{content:counter(n);position:absolute;left:18px;top:14px;width:54px;height:50px;display:grid;place-items:center;background:var(--carton);color:#00201b;font-size:32px;font-weight:800;border-radius:6px}
.lista-pasos strong{font-size:38px;color:var(--container)}.lista-pasos span{display:block;font-size:28px;line-height:1.2}
.lista-pasos .on{opacity:1;background:#fff}
.visor{position:absolute;left:880px;top:214px;width:560px;height:600px}
.visor>div{position:absolute;left:0;top:0;opacity:0;transform:translateX(90px) rotate(4deg);transition:opacity .35s,transform .6s cubic-bezier(.2,.9,.3,1.1);visibility:hidden}
.visor>.on{opacity:1;transform:none;visibility:visible}
.visor>div:nth-child(n+2){left:20px}
.flujo .aclara{position:absolute;left:1580px;top:226px}
/* 11 */
.abanico{display:flex;gap:100px;margin-top:18px}.abanico figure{margin:0;width:298px;transition:transform .5s,opacity .4s;opacity:.64;transform:scale(.93);transform-origin:50% 0}
.abanico .on{opacity:1;transform:none}.abanico figcaption{font-size:26px;white-space:nowrap;margin-bottom:12px}.abanico strong{display:block;font-size:38px;color:var(--container)}
.abanico .on .tel{border-color:var(--carton-osc)}
/* 12 */
.marcas{display:flex;gap:64px;margin-top:26px}.marcas p{font-size:34px}.marcas b{display:block;font-size:104px;letter-spacing:-4px;line-height:1.05;color:var(--container)}
.vistos{display:flex;gap:7px;margin-top:12px}.vistos i{width:34px;height:34px;border-radius:6px;background:var(--container);position:relative}.vistos i::after{content:"";position:absolute;left:11px;top:4px;width:9px;height:18px;border:solid var(--fixed);border-width:0 5px 5px 0;transform:rotate(42deg)}
.alcance{margin-top:34px;width:1120px}.alcance p{margin-bottom:12px}
.result .lado{position:absolute;left:1420px;top:64px}
/* 13 */
.tres{display:flex;gap:60px;margin-top:38px}.tres figure{margin:0;width:500px;background:#fff;padding:18px 18px 24px;box-shadow:0 10px 0 var(--borde)}
.tres figure:nth-child(1){rotate:-1.5deg}.tres figure:nth-child(3){rotate:1.5deg}
.recorte{height:262px;background-size:100% auto}.tres figcaption{font-size:33px;font-weight:600;line-height:1.25;margin-top:18px}
/* 14 */
.gracias.lamina{display:grid;grid-template-columns:780px 1fr}.gracias h2{font-size:150px;letter-spacing:-6px}
.guia,.globo{transition:transform 1s cubic-bezier(.3,.9,.3,1),left 1s,bottom 1s}.guia{transform-origin:0 100%}main[data-n='14'] .guia{transform:scale(1.85)}main[data-n='14'] .globo{left:540px;bottom:330px;width:420px}
.gracias ul{padding-left:30px}.gracias li{margin-bottom:14px;font-size:33px}
/* recorrido */
nav{position:absolute;left:96px;bottom:2px;display:flex;z-index:6}
nav a{width:64px;height:48px;display:grid;place-items:center;border-radius:8px;cursor:pointer}
nav a::after{content:"";width:40px;height:9px;border-radius:4px;background:#b9bfbd}
nav a[aria-current]::after{background:var(--carton);height:15px}nav a:hover::after{background:#fff}nav a:active::after{transform:scaleX(.8)}
nav a:focus-visible{outline:4px solid var(--fixed);outline-offset:-4px}
.camara{position:absolute;right:56px;bottom:48px;width:352px;height:264px;border:4px dashed #707976;border-radius:16px;display:none;place-items:center;z-index:7;font-size:28px;background:#fff;color:var(--gris)}
.camara.visible{display:grid}
.camion{animation:none}.mundo .llega .camion{animation:maneja 2.2s .2s cubic-bezier(.2,.7,.3,1) backwards}.mundo .llega .rueda{animation:gira .55s .2s linear 4;transform-box:view-box}
@keyframes maneja{from{transform:translateX(-620px)}}@keyframes gira{to{transform:rotate(360deg)}}
.pausa *{animation-play-state:paused!important}
.quieto *,.quieto main,.quieto *::before{animation:none!important;transition:none!important}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
'''

JS = '''
const $=s=>[...document.querySelectorAll(s)],main=document.querySelector('main'),laminas=$('.lamina'),paradas=$('nav a'),mundo=document.querySelector('.mundo'),
objetos=[...mundo.children],colinas=$('.colinas'),guia=document.querySelector('.guia'),globo=document.querySelector('.globo'),camara=document.querySelector('.camara');
const GUION=DATOS;let actual=-1,paso=1,reloj;
function hablar(texto,espera){clearTimeout(reloj);globo.style.visibility='hidden';globo.classList.remove('sale');guia.classList.remove('habla');
reloj=setTimeout(()=>{globo.textContent=texto;globo.style.visibility='visible';globo.classList.add('sale');guia.classList.add('habla')},espera)}
const total=()=>Array.isArray(GUION[actual].globo)?GUION[actual].globo.length:1;
function mostrarPaso(n,espera=150){paso=n;laminas[actual].querySelectorAll('[data-p]').forEach(e=>e.classList.toggle('on',+e.dataset.p===n));
const g=GUION[actual].globo;hablar(Array.isArray(g)?g[n-1]:g,document.body.classList.contains('quieto')?0:espera)}
function ir(i,p=1){i=Math.max(0,Math.min(laminas.length-1,i));if(i===actual){mostrarPaso(p);return}
const antes=actual;actual=i;
laminas.forEach((l,k)=>{l.classList.toggle('activa',k===i);l.classList.toggle('atras',k<i)});
objetos.forEach((o,k)=>o.classList.toggle('llega',k===i));
paradas.forEach((a,k)=>k===i?a.setAttribute('aria-current','step'):a.removeAttribute('aria-current'));
main.dataset.tema=GUION[i].tema;main.dataset.n=i+1;mundo.style.transform=`translateX(${-i*SALTO}px)`;
colinas[0].style.backgroundPositionX=-i*260+'px';colinas[1].style.backgroundPositionX=-i*560+'px';
guia.className='guia pose-'+GUION[i].pose;if(antes>=0){void guia.offsetWidth;guia.classList.add('anda')}
mostrarPaso(p,antes<0?900:1500);history.replaceState(null,'','#'+(i+1))}
function adelante(){paso<total()?mostrarPaso(paso+1):actual<laminas.length-1&&ir(actual+1)}
function atras(){if(paso>1)mostrarPaso(paso-1);else if(actual>0){const g=GUION[actual-1].globo;ir(actual-1,Array.isArray(g)?g.length:1)}}
function ajustar(){const e=Math.min(innerWidth/1920,innerHeight/1080);main.style.transform=`scale(${e}) translate(-50%,-50%)`}
addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;const k=e.key.toLowerCase();
if(['arrowright','pagedown',' '].includes(k)){e.preventDefault();adelante()}else if(['arrowleft','pageup'].includes(k)){e.preventDefault();atras()}
else if(k==='home')ir(0);else if(k==='end')ir(laminas.length-1);else if(k==='c')camara.classList.toggle('visible');
else if(k==='p')document.body.classList.toggle('pausa');
else if(k==='f')document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()});
addEventListener('hashchange',()=>ir((+location.hash.slice(1)||1)-1));addEventListener('resize',ajustar);
if(location.search==='?quieto')document.body.classList.add('quieto');
else if(!matchMedia('(prefers-reduced-motion:reduce)').matches)setInterval(()=>{if(document.body.classList.contains('pausa'))return;guia.classList.add('parpadea');setTimeout(()=>guia.classList.remove('parpadea'),130)},4200);
ajustar();ir((+location.hash.slice(1)||1)-1);
'''





def generar(salida, idioma='en', traducir=lambda texto: texto):
    """`traducir` recibe cada texto visible o de accesibilidad y falla si le falta alguno."""
    def con_espacios(texto):
        limpio = texto.strip()
        return texto.replace(limpio, traducir(limpio)) if limpio else texto

    def pasar(marcado):
        marcado = re.sub(r'>([^<]+)<', lambda m: f'>{con_espacios(m[1])}<', marcado)
        marcado = re.sub(r'(aria-label)="([^"]+)"', lambda m: f'{m[1]}="{con_espacios(m[2])}"', marcado)
        return re.sub(r'<p class="datos">(.*?)</p>', lambda m: '<p class="datos">' + m[1].replace('<br><br>', '<br>') + '</p>', marcado, flags=re.S)

    diapositiva, de = ('Slide', 'of') if idioma == 'en' else ('Diapositiva', 'de')
    total = len(LAMINAS)
    secciones = ''.join(
        f'<section class="lamina {tema} {clases}" aria-label="{diapositiva} {i} {de} {total}: {traducir(nombre)}">{pasar(cuerpo)}</section>'
        for i, (nombre, tema, clases, _, _, cuerpo) in enumerate(LAMINAS, 1))
    enlaces = ''.join(f'<a href="#{i}" aria-label="{diapositiva} {i}: {traducir(l[0])}" title="{traducir(l[0])}"></a>' for i, l in enumerate(LAMINAS, 1))
    mundo = pasar(''.join(f'<svg viewBox="0 0 560 240" width="560" height="240" style="left:{i * PASO + 930}px;overflow:visible">{p}</svg>' for i, p in enumerate(PARADAS)))
    guion = json.dumps([{'tema': t, 'pose': p, 'globo': [traducir(x) for x in g] if isinstance(g, list) else traducir(g)} for _, t, _, p, g, _ in LAMINAS])
    css = (CSS.replace('FUENTE', base64_de(FUENTE.read_bytes(), 'font/woff2')).replace('VARIABLES', variables())
           .replace('COLINA1', COLINA.format(c='%23bfe3d8')).replace('COLINA2', COLINA.format(c='%2395c9ba')))
    js = JS.replace('DATOS', guion).replace('SALTO', str(PASO))
    titulo = 'Acopio: Video presentation' if idioma == 'en' else 'Acopio: presentación'
    salida.write_text(
        f'<!doctype html><html lang="{idioma}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
        f'<title>{titulo}</title><style>{css}</style></head><body><main data-tema="noche">'
        f'<div class="colinas c1"></div><div class="colinas c2"></div><div class="mundo" aria-hidden="true">{mundo}</div><div class="via"></div>'
        f'{secciones}<div class="guia">{COPI}</div><p class="globo" aria-live="polite"></p><nav aria-label="{traducir("Slides")}">{enlaces}</nav>'
        f'<div class="camara">{traducir("Camera")}</div></main><script>{js}</script></body></html>')


def a_espanol(texto):
    if texto in TEXTOS:
        return TEXTOS[texto]
    assert not re.search('[A-Za-z]', texto), f'sin traducir: {texto}'
    return texto


generar(AQUI / 'Acopio - Video Presentation.html')
generar(AQUI.parent / 'Acopio - Presentación.html', 'es', a_espanol)
