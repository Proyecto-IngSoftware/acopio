# -*- coding: utf-8 -*-
"""Genera el Word del Avance 3 (arquitectura inicial) con el formato del Avance 1.

Toma el contenido de las mismas fuentes que las páginas publicadas, sin copiar a mano:
  - 03-diseno/descomposicion-funcional/datos.json   (node build.mjs en esa carpeta)
  - 02-arquitectura/diagramas/datos.json            (node build.mjs en esa carpeta)
  - 02-arquitectura/adr/ADR-0008-arquitectura-stack-inicial.md
  - assets/diagramas/*.png                          (renderizados a 3x)
Usa «Avance 1 - Sprint 0 - Acopio.docx» como plantilla: estilos, márgenes y pie.

Uso: python generar-avance-03.py   (desde docs/entregas; requiere python-docx)

Después de generar, el índice queda como campo sin llenar. Se abre el .docx en Word
y se actualiza (clic derecho sobre el índice → Actualizar campos → toda la tabla) y
se guarda. En Windows se puede hacer sin abrirlo, con PowerShell:
  $w = New-Object -ComObject Word.Application; $d = $w.Documents.Open("<ruta>")
  $d.TablesOfContents | % { $_.Update() }; $d.Save(); $d.Close(); $w.Quit()
"""
import copy
import json
import re
import struct
from pathlib import Path

import docx
from docx.enum.section import WD_ORIENT, WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

AQUI = Path(__file__).resolve().parent
DOCS = AQUI.parent
PLANTILLA = AQUI / "Avance 1 - Sprint 0 - Acopio.docx"
SALIDA = AQUI / "Avance 3 - Arquitectura inicial - Acopio.docx"
IMG = DOCS / "assets" / "diagramas"
DESC = json.loads((DOCS / "03-diseno" / "descomposicion-funcional" / "datos.json").read_text(encoding="utf-8"))
DIAG = json.loads((DOCS / "02-arquitectura" / "diagramas" / "datos.json").read_text(encoding="utf-8"))
ADR = (DOCS / "02-arquitectura" / "adr" / "ADR-0008-arquitectura-stack-inicial.md").read_text(encoding="utf-8")

MARCA = "0F6E6E"
TINTA_2 = RGBColor(0x57, 0x53, 0x4E)
BLANCO = RGBColor(0xFF, 0xFF, 0xFF)

# ── Documento a partir de la plantilla, vacío pero con su pie y sus estilos ──
doc = docx.Document(str(PLANTILLA))
body = doc.element.body
refs = [copy.deepcopy(e) for e in doc.sections[0]._sectPr
        if e.tag in (qn("w:headerReference"), qn("w:footerReference"))]
final = body.find(qn("w:sectPr"))
for el in list(body):
    if el is not final:
        body.remove(el)
for e in list(final):
    if e.tag in (qn("w:headerReference"), qn("w:footerReference")):
        final.remove(e)
for i, r in enumerate(refs):
    final.insert(i, r)


def orientar(sec, horizontal):
    ancho, alto = sec.page_width, sec.page_height
    if (horizontal and ancho < alto) or (not horizontal and ancho > alto):
        sec.page_width, sec.page_height = alto, ancho
    sec.orientation = WD_ORIENT.LANDSCAPE if horizontal else WD_ORIENT.PORTRAIT


def util(sec):
    """Ancho y alto útiles en cm."""
    return ((sec.page_width - sec.left_margin - sec.right_margin) / 360000,
            (sec.page_height - sec.top_margin - sec.bottom_margin) / 360000)


def nueva_seccion(horizontal):
    sec = doc.add_section(WD_SECTION.NEW_PAGE)
    orientar(sec, horizontal)
    return sec


orientar(doc.sections[-1], False)

# ── Texto con formato en línea: **negrita**, *cursiva*, `código`, [enlace](url) ──
TOKEN = re.compile(r"(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*\s][^*]*\*)")


def escribir(p, texto, tam=None, color=None, negrita=False):
    texto = re.sub(r"\s*\n\s*", " ", texto).strip()
    for trozo in TOKEN.split(texto):
        if not trozo:
            continue
        estilo = {}
        if trozo.startswith("**"):
            trozo, estilo = trozo[2:-2].replace("`", ""), {"b": True}
        elif trozo.startswith("`"):
            trozo, estilo = trozo[1:-1], {"code": True}
        elif trozo.startswith("["):
            trozo = re.match(r"\[([^\]]+)\]", trozo).group(1)
        elif trozo.startswith("*") and trozo.endswith("*") and len(trozo) > 2:
            trozo, estilo = trozo[1:-1], {"i": True}
        r = p.add_run(trozo)
        if negrita or estilo.get("b"):
            r.bold = True
        if estilo.get("i"):
            r.italic = True
        if estilo.get("code"):
            r.font.name = "Consolas"
            r._element.rPr.rFonts.set(qn("w:hAnsi"), "Consolas")
            r.font.size = Pt((tam or 11) - 1.5)
        elif tam:
            r.font.size = Pt(tam)
        if color is not None:
            r.font.color.rgb = color
    return p


def parrafo(texto, estilo=None, **kw):
    p = doc.add_paragraph(style=estilo) if estilo else doc.add_paragraph()
    return escribir(p, texto, **kw)


def titulo(texto, nivel):
    return doc.add_paragraph(texto, style=f"Heading {nivel}")


def vineta(texto, marca="•  "):
    p = doc.add_paragraph(style="Vineta")
    p.add_run(marca)
    return escribir(p, texto)


def metadato(etiqueta, valor):
    p = doc.add_paragraph(style="Metadatos")
    p.add_run(f"{etiqueta}: ").bold = True
    escribir(p, valor)


def salto_pagina():
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)


# ── Tablas con el formato del Avance 1 ───────────────────────────────────────
def sombrear(celda, color):
    tcPr = celda._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), color)
    tcPr.append(shd)


def tabla(filas, anchos, centradas=(), tam=8, relleno_fila=None):
    t = doc.add_table(rows=len(filas), cols=len(filas[0]))
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, fila in enumerate(filas):
        for j, texto in enumerate(fila):
            celda = t.cell(i, j)
            celda.width = Cm(anchos[j])
            p = celda.paragraphs[0]
            p.paragraph_format.space_after = Pt(2)
            # El cuerpo del documento va justificado; en celdas angostas eso abre huecos.
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if j in centradas else WD_ALIGN_PARAGRAPH.LEFT
            if i == 0:
                sombrear(celda, MARCA)
                escribir(p, texto, tam=tam, color=BLANCO, negrita=True)
            else:
                escribir(p, texto, tam=tam)
                if relleno_fila and relleno_fila(i):
                    sombrear(celda, "E6F4F4")
    for fila in t.rows:  # una fila nunca se parte entre dos páginas
        partir = OxmlElement("w:cantSplit")
        partir.set(qn("w:val"), "true")
        fila._tr.get_or_add_trPr().append(partir)
    encabezado = t.rows[0]._tr.get_or_add_trPr()
    repetir = OxmlElement("w:tblHeader")
    repetir.set(qn("w:val"), "true")
    encabezado.append(repetir)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return t


# ── Figuras ──────────────────────────────────────────────────────────────────
n_figura = 0


def tam_png(ruta):
    with open(ruta, "rb") as f:
        cabecera = f.read(24)
    return struct.unpack(">II", cabecera[16:24])


def figura(nombre, pie, alto_max=None):
    global n_figura
    n_figura += 1
    ruta = IMG / nombre
    w, h = tam_png(ruta)
    ancho_util, alto_util = util(doc.sections[-1])
    alto_max = alto_max or alto_util - 3.2
    ancho = min(ancho_util, alto_max * w / h)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.keep_with_next = True
    p.paragraph_format.space_after = Pt(2)
    p.add_run().add_picture(str(ruta), width=Cm(ancho))
    c = doc.add_paragraph()
    c.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = c.add_run(f"Figura {n_figura}. ")
    r.bold, r.font.size, r.font.color.rgb = True, Pt(9), TINTA_2
    escribir(c, pie, tam=9, color=TINTA_2)


# ── Markdown de la bóveda → bloques del documento ────────────────────────────
def bloques_md(md):
    """Devuelve [(tipo, dato)]: h2, h3, p, ul, ol, tabla. Omite código, citas y comentarios."""
    salida, parr, lista, tipo_lista, tabla_md = [], [], [], None, []
    en_codigo = False

    def cerrar():
        nonlocal parr, lista, tipo_lista, tabla_md
        if parr:
            salida.append(("p", " ".join(parr)))
        if lista:
            salida.append((tipo_lista, lista))
        if tabla_md:
            salida.append(("tabla", tabla_md))
        parr, lista, tipo_lista, tabla_md = [], [], None, []

    for linea in re.sub(r"<!--.*?-->", "", md, flags=re.S).split("\n"):
        if linea.startswith("```"):
            cerrar()
            en_codigo = not en_codigo
            continue
        if en_codigo:
            continue
        s = linea.strip()
        if not s or s == "---":
            cerrar()
            continue
        if s.startswith(">"):
            continue
        m = re.match(r"^(#{2,4}) (.+)$", s)
        if m:
            cerrar()
            salida.append((f"h{len(m.group(1))}", m.group(2).replace("`", "")))
            continue
        if s.startswith("|"):
            if parr or lista:
                cerrar()
            tabla_md.append(s)
            continue
        if tabla_md:
            cerrar()
        m = re.match(r"^(- |\d+\. )(.*)$", s)
        if m and not linea.startswith("  "):
            if parr:
                salida.append(("p", " ".join(parr)))
                parr = []
            tipo = "ul" if m.group(1) == "- " else "ol"
            if lista and tipo != tipo_lista:
                cerrar()
            tipo_lista = tipo
            lista.append(m.group(2))
            continue
        if lista and linea.startswith("  "):
            lista[-1] += " " + s
            continue
        parr.append(s)
    cerrar()
    return salida


def filas_tabla(lineas):
    filas, centradas = [], set()
    for i, l in enumerate(lineas):
        celdas = [c.strip() for c in l.strip().strip("|").split("|")]
        if all(re.fullmatch(r":?-+:?", c) for c in celdas if c):
            centradas = {j for j, c in enumerate(celdas) if c.startswith(":") and c.endswith(":")}
            continue
        filas.append(celdas)
    return filas, centradas


def anchos_para(filas):
    n = len(filas[0])
    ancho = util(doc.sections[-1])[0]
    cab = " ".join(filas[0]).lower()
    if n == 5 and "impacto" in cab:
        return [1.5, 4.9, 1.5, 1.9, ancho - 9.8]
    if n == 3:
        return [3.4, ancho - 7.4, 4.0]
    if n == 2:
        return [4.6, ancho - 4.6]
    return [ancho / n] * n


def volcar_md(md, nivel_base=2):
    for tipo, dato in bloques_md(md):
        if tipo in ("h2", "h3", "h4"):
            titulo(dato, min(3, nivel_base + int(tipo[1]) - 2))
        elif tipo == "p":
            parrafo(dato)
        elif tipo == "ul":
            for item in dato:
                vineta(item)
        elif tipo == "ol":
            for k, item in enumerate(dato, 1):
                vineta(item, f"{k}. ")
        elif tipo == "tabla":
            filas, centradas = filas_tabla(dato)
            tabla(filas, anchos_para(filas), centradas)


# ═════════════════════════════════════════════════════════════════════════════
# Portada e índice
# ═════════════════════════════════════════════════════════════════════════════
doc.add_paragraph("Avance de proyecto #3 — Arquitectura inicial", style="Title")
metadato("Asignatura", "Ingeniería de Software I")
metadato("Docente", "Juan Pablo Bustamante Moreno")
metadato("Institución", "Escuela Tecnológica Instituto Técnico Central (ETITC)")
metadato("Integrantes", "Joseph · Brayan · Alejandra · Michael")
metadato("Fecha de entrega", "14 de septiembre de 2026")
metadato("Sprint", "3")
salto_pagina()

titulo("Contenido", 1)
parrafo("Si aparece vacío: clic derecho sobre el índice → Actualizar campos → Actualizar toda la tabla.", "Metadatos")
p = doc.add_paragraph()
for tipo, texto in (("begin", None), ("instr", ' TOC \\o "1-2" \\h \\z \\u '), ("separate", None),
                    ("texto", "Índice pendiente de actualizar."), ("end", None)):
    r = OxmlElement("w:r")
    if tipo == "instr":
        el = OxmlElement("w:instrText")
        el.set(qn("xml:space"), "preserve")
        el.text = texto
    elif tipo == "texto":
        el = OxmlElement("w:t")
        el.text = texto
    else:
        el = OxmlElement("w:fldChar")
        el.set(qn("w:fldCharType"), tipo)
    r.append(el)
    p._p.append(r)
# El índice lo llena Word al actualizar campos: ver la nota al inicio del archivo.
salto_pagina()

# ═════════════════════════════════════════════════════════════════════════════
# 1. Vista de descomposición funcional
# ═════════════════════════════════════════════════════════════════════════════
T = DESC["totales"]
titulo("1. Vista de descomposición funcional", 1)
parrafo(f"La vista organiza las funcionalidades de Acopio en {T['modulos']} módulos, "
        f"{T['submodulos']} submódulos y {T['funcionalidades']} funcionalidades. Se derivó de los "
        f"{T['rf']} requerimientos funcionales activos y de las historias de usuario semilla del proyecto. "
        "La agrupación en seis módulos es la misma que organiza las épicas del Avance 2, de modo que "
        "cada funcionalidad se rastrea hasta su historia de usuario. Los seis módulos reúnen los siete "
        "módulos del producto descritos en el Avance 1: el directorio de causas, el mapa de acopios y "
        "el home público forman el Portal público.")
parrafo("**Convenciones.** El sistema va en verde azulado oscuro, los módulos en verde azulado, los "
        "submódulos en verde azulado claro y las funcionalidades en blanco. Cada funcionalidad indica "
        "su operación —**C** crear, **R** consultar, **U** actualizar, **D** eliminar— y los "
        "requerimientos (RF) que la originan. El rojo, el ámbar, el verde y el morado no se usan: en "
        "la interfaz del producto están reservados para el estado del inventario.")
figura("descomposicion-00-vista-general.png",
       "Acopio: vista general de la descomposición funcional. El número en cada submódulo es su cantidad de funcionalidades.")

archivos = {"portal": "01-portal", "turnos": "02-turnos", "inventario": "03-inventario",
            "comprobantes": "04-comprobantes", "motor": "05-motor", "admin": "06-admin"}
for m in DESC["MODULOS"]:
    titulo(m["nombre"], 2)
    n_func = sum(len(fs) for _, fs in m["sub"])
    parrafo(f"{m['origen']}. {len(m['sub'])} submódulos y {n_func} funcionalidades.")
    # Administración es el módulo más alto: un poco más bajo, para que la lista de RF
    # fuera del diagrama quepa en la misma página y no deje una página casi vacía.
    figura(f"descomposicion-{archivos[m['id']]}.png", f"Módulo {m['nombre']}: submódulos y funcionalidades con su operación y sus RF.",
           alto_max=16 if m["id"] == "admin" else None)

titulo("Requerimientos que no aparecen en el diagrama", 2)
parrafo(f"De los {T['rf']} requerimientos, {T['rf'] - T['dentro']} no son funcionalidades que alguien "
        "use: son reglas o propiedades que el sistema cumple en todas partes. Por eso no se dibujan "
        "como nodos, y la trazabilidad completa del Anexo A los registra aparte.")
for rf, motivo in DESC["FUERA"].items():
    vineta(f"**RF-{rf} · {DESC['RF'][rf]}.** {motivo}.")

# ═════════════════════════════════════════════════════════════════════════════
# 2. Vista del modelo de datos (horizontal: los diagramas son anchos)
# ═════════════════════════════════════════════════════════════════════════════
nueva_seccion(True)
titulo("2. Vista del modelo de datos", 1)
parrafo("El modelo es relacional, sobre PostgreSQL 16. Las entidades del alcance se organizan en siete "
        "grupos de tablas, con un diagrama entidad-relación por grupo —dos para existencias, el más "
        "cargado—, porque un solo diagrama con unas cuarenta relaciones resultaba ilegible. Cada diagrama marca llaves primarias (PK), llaves foráneas (FK), "
        "cardinalidades y los atributos que gobiernan una regla de negocio. Cuando una entidad aparece en "
        "un grupo solo como referencia de otro, se dibuja liviana: únicamente su llave primaria, con una "
        "nota del grupo donde está completa.")
parrafo("**El saldo del inventario no es una tabla.** Se deriva de los movimientos, que nunca se editan "
        "ni se borran; así cualquier saldo se puede reconstruir y auditar. Por eso no aparece en los "
        "diagramas.")
for c in DIAG["clusters"]:
    # Un grupo con un diagrama más alto que ancho va en página vertical: en horizontal
    # lo limitaría la altura y quedaría pequeño.
    vertical = any(tam_png(IMG / png)[1] > tam_png(IMG / png)[0] for png in c["pngs"])
    if vertical:
        nueva_seccion(False)
    titulo(c["titulo"], 2)
    for k, png in enumerate(c["pngs"], 1):
        parte = f" ({k} de {len(c['pngs'])})" if len(c["pngs"]) > 1 else ""
        figura(png, f"Diagrama entidad-relación del grupo {c['titulo']}{parte}.")
    if c["md"]:
        volcar_md(c["md"])
    if vertical:
        nueva_seccion(True)

titulo("Relaciones secundarias con usuario", 2)
parrafo("Varias tablas referencian a `usuario` más de una vez con papeles distintos: quién verificó una "
        "entidad o un comprobante, quién decidió una sugerencia, quién creó una invitación o hizo una "
        "asignación. Cada diagrama dibuja solo la relación principal con `usuario` para no saturarse; las "
        "demás están en la lista completa de columnas del modelo.")

titulo("Restricciones de integridad", 2)
parrafo("Cada regla de negocio que afecta la integridad de los datos se hace cumplir donde no se puede "
        "evadir: en el esquema cuando se puede expresar allí, y en una transacción cuando no.")
tabla([["Invariante", "Dónde se garantiza"]] + DIAG["invariantes"], [17.0, util(doc.sections[-1])[0] - 17.0], tam=8.5)
volcar_md(DIAG["cierreInvMd"])

# ═════════════════════════════════════════════════════════════════════════════
# 3. ADR-001
# ═════════════════════════════════════════════════════════════════════════════
nueva_seccion(False)
titulo("3. ADR-001: Arquitectura y selección tecnológica inicial", 1)
metadato("Estado", "Aceptado")
metadato("Fecha", "14 de septiembre de 2026")
metadato("Pregunta", "¿Qué arquitectura y conjunto tecnológico inicial permite desarrollar esta solución de manera viable durante el semestre?")
parrafo("Los códigos entre paréntesis —ADR, P, I, RNF y RF— remiten a decisiones, pendientes, "
        "investigaciones y requerimientos registrados en el repositorio del proyecto. El Anexo B "
        "resume cada uno en una línea.", "Metadatos")
cuerpo_adr = re.sub(r"^---\n.*?\n---\n", "", ADR, flags=re.S)
cuerpo_adr = cuerpo_adr[cuerpo_adr.index("## Contexto"):]
volcar_md(cuerpo_adr)

# ═════════════════════════════════════════════════════════════════════════════
# 4. Diagrama de arquitectura (horizontal)
# ═════════════════════════════════════════════════════════════════════════════
nueva_seccion(True)
titulo("4. Diagrama de arquitectura", 1)
parrafo("Complemento gráfico del ADR-001, en dos niveles. El primero muestra el contexto: quién usa "
        "Acopio y con qué sistemas externos se comunica. El segundo muestra lo que corre dentro del "
        "servidor —contenedores, módulos de la API y tareas programadas— y los servicios externos de "
        "los que depende.")
for c in DIAG["c4"]:
    titulo(c["titulo"], 2)
    parrafo(c["bajada"])
    figura(c["png"], f"Arquitectura, nivel de {c['titulo'].lower()}.")
    # Se omite la nota histórica del cambio de proxy: en el documento solo cuenta el estado actual.
    md = "\n\n".join(b for b in re.split(r"\n{2,}", c["md"]) if "de antes lo reemplaza" not in b)
    volcar_md(md)

# ═════════════════════════════════════════════════════════════════════════════
# Anexo A. Trazabilidad
# ═════════════════════════════════════════════════════════════════════════════
nueva_seccion(False)
titulo("Anexo A. Trazabilidad de requerimientos", 1)
parrafo("Cada requerimiento funcional activo, con la funcionalidad, el submódulo y el módulo donde vive "
        "en la vista de descomposición. Al final, sombreados, los que quedan fuera del diagrama por ser "
        "reglas del sistema.")
filas = [["RF", "Requerimiento", "Funcionalidad", "Submódulo", "Módulo", "CRUD"]]
for m in DESC["MODULOS"]:
    for sub, fs in m["sub"]:
        for f, crud, rfs in fs:
            for rf in rfs:
                filas.append([f"RF-{rf}", DESC["RF"][rf], f, sub, m["nombre"], crud])
n_dentro = len(filas)
for rf, motivo in DESC["FUERA"].items():
    filas.append([f"RF-{rf}", DESC["RF"][rf], "Fuera del diagrama", motivo, "—", "—"])
tabla(filas, [2.4, 3.8, 3.7, 2.6, 2.7, 1.0], centradas={5}, tam=8,
      relleno_fila=lambda i: i >= n_dentro)

# ═════════════════════════════════════════════════════════════════════════════
# Anexo B. Referencias al repositorio — un resumen por cada código citado
# ═════════════════════════════════════════════════════════════════════════════
RESUMEN = {
    "ADR-0001": "Supabase se usa solo para autenticación: emite el token; datos, API y archivos son propios.",
    "ADR-0002": "El saldo del inventario se deriva de movimientos que nunca se editan; no se guarda.",
    "ADR-0003": "Cada usuario tiene un rol global y un alcance sobre varias ubicaciones; la autorización es propia.",
    "ADR-0004": "Frontend generado con Lovable. Reemplazada por ADR-0009.",
    "ADR-0005": "El modo sin conexión cubre solo el registro de movimientos del inventario.",
    "ADR-0006": "Rojo, ámbar, verde y morado quedan reservados para el estado del inventario.",
    "ADR-0007": "El Donador se registra por su cuenta: excepción controlada al modelo de roles internos.",
    "ADR-0008": "Es este ADR-001 en el repositorio; el número 0001 ya estaba ocupado.",
    "ADR-0009": "Las pantallas se diseñan como mockups en Claude Design y el equipo las implementa en React y Tailwind.",
    "P-001": "Canasta estándar por persona y día con fuente citable; el Manual Esfera se usa como referencia.",
    "P-002": "Origen de la población estimada por zona; las proyecciones del DANE se usan como referencia.",
    "P-004": "Correo transaccional por SMTP estándar; el remitente de producción está por definir.",
    "P-005": "Despliegue en un VPS con Dokploy; faltan el proveedor y el dominio.",
    "P-007": "Gestión del trabajo en GitHub Projects.",
    "P-008": "Diagramas en Mermaid y documentación en Markdown.",
    "P-009": "Pruebas automatizadas con Jest.",
    "P-010": "Agrupación de los siete módulos del producto en seis para la vista funcional.",
    "P-011": "Numeración del ADR del curso: el ADR-001 es el ADR-0008 del repositorio.",
    "P-022": "Importación automática de los acopios de RedAcopio Bogotá, con el riesgo aceptado.",
    "P-023": "Validación de la modularidad: once módulos, sin microservicios.",
    "I-003": "Investigación de la fuente RedAcopio Bogotá: 88 puntos, sin API pública ni licencia de reutilización.",
    "I-004": "Investigación de los límites de los servicios gratuitos: OpenStreetMap, Nominatim, Supabase y el SMTP de Microsoft 365.",
    "RNF-01": "Móvil primero: toda pantalla de la consola se opera en un teléfono.",
    "RNF-02": "Registrar un movimiento toma menos de 10 segundos.",
    "RNF-03": "Legibilidad bajo sol, con guantes: contraste alto y texto grande.",
    "RNF-04": "Todo dato operativo se muestra con su antigüedad.",
    "RNF-05": "Tiempos de respuesta objetivo de la API, el motor y la portada.",
    "RNF-06": "Integridad del inventario: el saldo nunca queda negativo, ni con registros simultáneos.",
    "RNF-07": "Degradación: sin conexión se sigue registrando; si cae Supabase, las sesiones activas siguen.",
    "RNF-08": "Seguridad: archivos privados, autorización en cada request, límites de intentos.",
    "RNF-09": "Privacidad conforme a la Ley 1581 de 2012.",
    "RNF-10": "Auditoría: bitácora de toda operación de escritura.",
    "RNF-11": "Accesibilidad: teclado, etiquetas y el color nunca como único significado.",
    "RNF-12": "Idioma y formatos de Colombia.",
    "RNF-13": "Mantenibilidad: un módulo por dominio, sin dependencias circulares.",
}
fuentes = "\n".join([cuerpo_adr, DIAG["cierreInvMd"]] + [c["md"] for c in DIAG["clusters"]] + [c["md"] for c in DIAG["c4"]])
patron = re.compile(r"\b(ADR-\d{4}|P-\d{3}|I-\d{3}|RNF-\d{2}|RF-[A-Z]{3}-\d{3}[A-D]?)\b")
orden = {"ADR": 0, "P": 1, "I": 2, "RNF": 3, "RF": 4}
codigos = sorted(set(patron.findall(fuentes)), key=lambda c: (orden[c.split("-")[0]], c))
filas_b, faltan = [["Código", "Qué es"]], []
for c in codigos:
    if c.startswith("RF-"):
        t = DESC["RF"].get(c[3:])
        resumen = f"Requerimiento funcional «{t}»." if t else None
    else:
        resumen = RESUMEN.get(c)
    if resumen:
        filas_b.append([c, resumen])
    else:
        faltan.append(c)
if faltan:
    print("AVISO · códigos citados sin resumen:", ", ".join(faltan))
salto_pagina()
titulo("Anexo B. Referencias al repositorio del proyecto", 1)
parrafo("Resumen de cada código citado en este documento. El detalle completo —contexto, "
        "alternativas y fuentes— vive en el repositorio del proyecto.")
tabla(filas_b, [2.4, util(doc.sections[-1])[0] - 2.4], tam=8.5)

doc.core_properties.title = "Avance de proyecto #3 — Arquitectura inicial"
doc.core_properties.subject = "Acopio · Ingeniería de Software I · ETITC"
doc.save(str(SALIDA))
print(f"ok: {SALIDA.name} · {n_figura} figuras · {len(doc.tables)} tablas · {len(doc.sections)} secciones")
