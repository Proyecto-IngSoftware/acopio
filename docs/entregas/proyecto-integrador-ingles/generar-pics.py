"""Rellena la plantilla PICS en inglés y genera el abstract suelto. El PDF de la primera pasada fija las páginas del índice."""
from copy import deepcopy
from pathlib import Path
import re
import sys

from docx import Document
from docx.opc.constants import RELATIONSHIP_TYPE
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT, WD_TAB_LEADER
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt
from docx.text.paragraph import Paragraph

carpeta = Path(__file__).resolve().parent
plantilla = carpeta.parent / 'guias' / 'Plantilla proyectos PICS.docx'
doc = Document(plantilla)
texto = (carpeta / 'proyecto-pics.md').read_text().split('\n---\n', 1)[1].lstrip()
titulo = texto.splitlines()[0][2:]
paginas = {}
ANEXOS = {'First submission': 'A', 'Second submission': 'B', 'Third submission': 'C'}
if len(sys.argv) > 1:
    from pypdf import PdfReader

    for numero, pagina in enumerate(PdfReader(sys.argv[1]).pages[2:], 3):
        for linea in pagina.extract_text().splitlines():
            paginas.setdefault(linea.strip(), numero)

AUTORES = (
    'Brayan Yesid Jurado Gutierrez',
    'Maria Alejandra Herrera Gonzalez',
    'Michel Esteban Gutierrez Acosta',
    'Joseph Daniel Rhomandt Bermudez',
)

parrafos = doc.paragraphs
for posicion, contenido in {
    17: 'Faculty of Systems',
    18: 'Professional Technician in Computing',
    22: titulo,
    25: '\n'.join(('Authors', *AUTORES)),
    28: 'Presented to: Jorge Albeiro Betancourt Manjarres',
    31: 'Bogotá, November 22, 2026',
    36: 'Table of Contents',
}.items():
    parrafo = parrafos[posicion]
    parrafo.runs[0].text = contenido
    for run in parrafo.runs[1:]:
        run.text = ''

parrafos[25].paragraph_format.line_spacing = 1

for posicion in (14, 19, 23, 26, 29, 32, 33, 34, 35):
    nodo = parrafos[posicion]._p
    nodo.getparent().remove(nodo)

parrafos[36].paragraph_format.page_break_before = True
# El índice sale de los encabezados. Los números de segundo nivel van como texto porque la
# lista de la plantilla solo tiene 6.1 y 6.2.
principal, secundaria, entrega = (deepcopy(parrafos[i]._p) for i in (38, 44, 58))
for parrafo in parrafos[38:56] + parrafos[58:61]:
    parrafo._p.getparent().remove(parrafo._p)
for propiedades in secundaria.xpath('./w:pPr/w:numPr'):
    propiedades.getparent().remove(propiedades)

numero_1 = numero_2 = 0
for marca, nombre in re.findall(r'^(#{2,3}) (.+)$', texto, re.M):
    if marca == '##':
        numero_1, numero_2 = numero_1 + 1, 0
        modelo, rotulo, ancla = principal, nombre, parrafos[56]
    elif nombre in ANEXOS:
        modelo, rotulo, ancla = entrega, nombre, parrafos[61]
    else:
        numero_2 += 1
        modelo, rotulo, ancla = secundaria, f'{numero_1}.{numero_2}\t{nombre}', parrafos[56]
    copia = deepcopy(modelo)
    ancla._p.addprevious(copia)
    parrafo = Paragraph(copia, ancla._parent)
    for run in parrafo.runs[1:]:
        run._r.getparent().remove(run._r)
    parrafo.runs[0].text = rotulo
    parrafo.runs[0].font.name = 'Times New Roman'
    parrafo.runs[0].font.size = Pt(14)
    parrafo.paragraph_format.tab_stops.clear_all()
    if modelo is secundaria:
        parrafo.paragraph_format.left_indent = Cm(1.27)
        parrafo.paragraph_format.first_line_indent = Cm(0)
        parrafo.paragraph_format.tab_stops.add_tab_stop(Cm(2.7), WD_TAB_ALIGNMENT.LEFT)
    parrafo.paragraph_format.tab_stops.add_tab_stop(
        Cm(15.3), WD_TAB_ALIGNMENT.RIGHT, WD_TAB_LEADER.DOTS
    )
    if paginas:
        numero = parrafo.add_run(f'\t{paginas[nombre]}')
        numero.font.name = 'Times New Roman'
        numero.font.size = Pt(12)
    for resaltado in copia.xpath('.//w:highlight'):
        resaltado.getparent().remove(resaltado)
for posicion in (61, 62):
    parrafos[posicion]._p.getparent().remove(parrafos[posicion]._p)

cabecera = doc.sections[0].header
institucion = cabecera.paragraphs[0]
institucion.paragraph_format.tab_stops.clear_all()
institucion.paragraph_format.tab_stops.add_tab_stop(Cm(15.8), WD_TAB_ALIGNMENT.RIGHT)
for run in institucion.runs[1:-2]:
    run.text = ''
institucion.runs[-2].text = '\tFaculty of Systems'
numeracion = cabecera.paragraphs[0].insert_paragraph_before()
numeracion.alignment = WD_ALIGN_PARAGRAPH.RIGHT
numeracion.paragraph_format.space_after = Pt(0)
numeracion.paragraph_format.line_spacing = 1
numeracion.style = doc.styles['Normal']
campo = OxmlElement('w:fldSimple')
campo.set(qn('w:instr'), 'PAGE')
numeracion._p.append(campo)

normal = doc.styles['Normal']
normal.font.name = 'Times New Roman'
normal.font.size = Pt(12)
normal.paragraph_format.line_spacing = 2
normal.paragraph_format.space_before = Pt(0)
normal.paragraph_format.space_after = Pt(0)
normal.paragraph_format.widow_control = True
for nivel in (1, 2):
    estilo = doc.styles[f'Heading {nivel}']
    estilo.font.name = 'Times New Roman'
    estilo.font.size = Pt(12)
    estilo.font.bold = True
    estilo.paragraph_format.keep_with_next = True
    estilo.paragraph_format.line_spacing = 2
    estilo.paragraph_format.space_before = Pt(0)
    estilo.paragraph_format.space_after = Pt(0)
    estilo.paragraph_format.alignment = (
        WD_ALIGN_PARAGRAPH.CENTER if nivel == 1 else WD_ALIGN_PARAGRAPH.LEFT
    )

def enlace(parrafo, url):
    relacion = parrafo.part.relate_to(url, RELATIONSHIP_TYPE.HYPERLINK, is_external=True)
    hipervinculo = OxmlElement('w:hyperlink')
    hipervinculo.set(qn('r:id'), relacion)
    run = parrafo.add_run(url)
    hipervinculo.append(run._r)
    parrafo._p.append(hipervinculo)


def con_cursivas(parrafo, contenido):
    for i, parte in enumerate(contenido.split('*')):
        parrafo.add_run(parte).italic = bool(i % 2)


seccion = ''
for bloque in re.split(r'\n\s*\n', texto.strip()):
    if bloque.startswith('# '):
        continue
    encabezado = re.match(r'^(#{2,3}) (.+)$', bloque)
    figura = re.fullmatch(r'!\[(.+)\]\((.+)\)', bloque)
    if encabezado:
        nivel = len(encabezado[1]) - 1
        seccion = encabezado[2]
        if seccion in ANEXOS:
            etiqueta = doc.add_paragraph()
            etiqueta.add_run(f'Appendix {ANEXOS[seccion]}').bold = True
            etiqueta.alignment = WD_ALIGN_PARAGRAPH.CENTER
            etiqueta.paragraph_format.keep_with_next = True
            etiqueta.paragraph_format.page_break_before = seccion != 'First submission'
        parrafo = doc.add_heading(seccion, level=nivel)
        if nivel == 1:
            parrafo.paragraph_format.page_break_before = True
        if seccion in ANEXOS:
            parrafo.alignment = WD_ALIGN_PARAGRAPH.CENTER
    elif figura:
        numero, descripcion = figura[1].split('. ', 1)
        nombre, fuente = descripcion.split('. Source: ', 1)
        rotulo = doc.add_paragraph()
        rotulo.add_run(numero).bold = True
        rotulo.paragraph_format.keep_with_next = True
        titulo_figura = doc.add_paragraph()
        titulo_figura.add_run(nombre).italic = True
        titulo_figura.paragraph_format.keep_with_next = True

        parrafo = doc.add_paragraph()
        parrafo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        parrafo.paragraph_format.keep_with_next = True
        parrafo.paragraph_format.line_spacing = 1
        parrafo.paragraph_format.space_before = Pt(4)
        parrafo.paragraph_format.space_after = Pt(4)
        ruta = carpeta / figura[2]
        ancho = 15.3 if numero in ('Figure 1', 'Figure 2', 'Figure B1', 'Figure B2', 'Figure C1') else 11.5
        if ruta.name == 'reserva.png':
            ancho = 10
        imagen = parrafo.add_run().add_picture(str(ruta), width=Cm(ancho))
        if imagen.height > Cm(16.2):
            imagen.width = int(imagen.width * Cm(16.2) / imagen.height)
            imagen.height = Cm(16.2)
        imagen._inline.docPr.set('descr', f'{numero}. {nombre}')
        nota = doc.add_paragraph()
        nota.paragraph_format.keep_together = True
        nota.add_run('Note. ').italic = True
        nota.add_run(f'Source: {fuente}')
    elif re.match(r'^\d+\. ', bloque):
        for linea in bloque.splitlines():
            doc.add_paragraph(linea).paragraph_format.left_indent = Cm(1.27)
    else:
        parrafo = doc.add_paragraph()
        if seccion == 'Bibliography':
            parrafo.paragraph_format.left_indent = Cm(1.27)
            parrafo.paragraph_format.first_line_indent = Cm(-1.27)
            texto_ref, separador, url = bloque.partition(' https://')
            con_cursivas(parrafo, texto_ref)
            if separador:
                parrafo.add_run(' ')
                enlace(parrafo, 'https://' + url)
        elif bloque.startswith('Keywords:'):
            etiqueta, palabras = bloque.split(':', 1)
            parrafo.paragraph_format.first_line_indent = Cm(1.27)
            parrafo.add_run(etiqueta + ':').italic = True
            parrafo.add_run(palabras)
        else:
            con_cursivas(parrafo, bloque)
            if seccion == 'Scope':
                parrafo.paragraph_format.keep_together = True
            if seccion != 'Abstract':
                parrafo.paragraph_format.first_line_indent = Cm(1.27)
        if seccion == 'Abstract':
            parrafo.paragraph_format.line_spacing = Pt(24)
            if not bloque.startswith('Keywords:'):
                parrafo.paragraph_format.keep_together = True
                parrafo.paragraph_format.keep_with_next = True
doc.core_properties.title = titulo
doc.core_properties.author = 'Acopio Team'
doc.core_properties.last_modified_by = 'Acopio Team'
doc.core_properties.subject = 'PICS integrative project'
doc.core_properties.language = 'en-US'
for raiz in (doc.element, doc.styles.element, cabecera._element):
    for idioma in raiz.xpath('.//w:lang'):
        idioma.set(qn('w:val'), 'en-US')
doc.save(carpeta / 'Acopio - Integrative Project.docx')

suelto = Document()
suelto.sections[0].page_width, suelto.sections[0].page_height = Cm(21), Cm(29.7)
suelto.styles['Normal'].font.name = 'Times New Roman'
suelto.styles['Normal'].font.size = Pt(12)
suelto.styles['Normal'].paragraph_format.line_spacing = 1.5
suelto.styles['Normal'].paragraph_format.space_after = Pt(0)
for contenido, negrita in (
    (titulo, True),
    ('Escuela Tecnológica Instituto Técnico Central (ETITC)', False),
    ('\n'.join(AUTORES), False),
    ('Abstract', True),
):
    parrafo = suelto.add_paragraph()
    parrafo.alignment = WD_ALIGN_PARAGRAPH.CENTER
    parrafo.paragraph_format.space_after = Pt(8)
    parrafo.add_run(contenido).bold = negrita
cuerpo, claves = re.search(r'## Abstract\n\n(.+)\n\nKeywords:(.+)', texto).groups()
suelto.add_paragraph(cuerpo).paragraph_format.space_after = Pt(8)
parrafo = suelto.add_paragraph()
parrafo.add_run('Keywords:').italic = True
parrafo.add_run(claves)
suelto.core_properties.title = f'{titulo}: Abstract'
suelto.core_properties.author = 'Acopio Team'
suelto.core_properties.language = 'en-US'
suelto.save(carpeta / 'Acopio - Abstract.docx')
