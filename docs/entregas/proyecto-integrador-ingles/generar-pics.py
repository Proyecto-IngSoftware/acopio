"""Rellena la plantilla PICS. El PDF de la primera pasada fija las páginas del índice."""
from pathlib import Path
import re
import sys

from docx import Document
from docx.opc.constants import RELATIONSHIP_TYPE
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT, WD_TAB_LEADER
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt

carpeta = Path(__file__).resolve().parent
plantilla = carpeta.parent.parent / 'talleres' / 'Plantilla proyectos PICS.docx'
doc = Document(plantilla)
texto = (carpeta / 'proyecto-pics.md').read_text()
titulo = texto.splitlines()[0][2:]
paginas = {}
if len(sys.argv) > 1:
    from pypdf import PdfReader

    for numero, pagina in enumerate(PdfReader(sys.argv[1]).pages[2:], 3):
        for linea in pagina.extract_text().splitlines():
            paginas.setdefault(linea.strip(), numero)

parrafos = doc.paragraphs
for posicion, contenido in {
    22: titulo,
    25: 'Autores\nJoseph, Brayan, Alejandra y Michael',
    28: 'Presentado a: Juan Pablo Bustamante Moreno',
    31: 'Bogotá, 18 de noviembre de 2026',
}.items():
    parrafo = parrafos[posicion]
    parrafo.runs[0].text = contenido
    for run in parrafo.runs[1:]:
        run.text = ''

for posicion in (14, 19, 23, 26, 29, 32, 33, 34, 35, 61, 62):
    nodo = parrafos[posicion]._p
    nodo.getparent().remove(nodo)

parrafos[36].paragraph_format.page_break_before = True
nombres = re.findall(r'^## (.+)$', texto, re.M)
entradas = nombres[:6] + ['Objetivo general', 'Objetivos específicos'] + nombres[6:]
entradas += ['Primera entrega', 'Segunda entrega', 'Tercera entrega']
casillas = list(range(38, 56)) + [58, 59, 60]
for posicion, nombre in zip(casillas, entradas, strict=True):
    parrafo = parrafos[posicion]
    parrafo.runs[0].text = nombre
    parrafo.runs[0].font.name = 'Times New Roman'
    parrafo.runs[0].font.size = Pt(14)
    for run in parrafo.runs[1:]:
        run.text = ''
    parrafo.paragraph_format.tab_stops.clear_all()
    if posicion in (44, 45):
        parrafo.paragraph_format.tab_stops.add_tab_stop(Cm(2.7), WD_TAB_ALIGNMENT.LEFT)
    parrafo.paragraph_format.tab_stops.add_tab_stop(
        Cm(15.3), WD_TAB_ALIGNMENT.RIGHT, WD_TAB_LEADER.DOTS
    )
    if paginas:
        numero = parrafo.add_run(f'\t{paginas[nombre]}')
        numero.font.name = 'Times New Roman'
        numero.font.size = Pt(12)

cabecera = doc.sections[0].header
institucion = cabecera.paragraphs[0]
institucion.paragraph_format.tab_stops.clear_all()
institucion.paragraph_format.tab_stops.add_tab_stop(Cm(15.8), WD_TAB_ALIGNMENT.RIGHT)
for run in institucion.runs[1:-2]:
    run.text = ''
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


seccion = ''
for bloque in re.split(r'\n\s*\n', texto.strip()):
    if bloque.startswith('# '):
        continue
    encabezado = re.match(r'^(#{2,3}) (.+)$', bloque)
    figura = re.fullmatch(r'!\[(.+)\]\((.+)\)', bloque)
    if encabezado:
        nivel = len(encabezado[1]) - 1
        seccion = encabezado[2]
        anexos = {'Primera entrega': 'A', 'Segunda entrega': 'B', 'Tercera entrega': 'C'}
        if seccion in anexos:
            etiqueta = doc.add_paragraph()
            etiqueta.add_run(f'Anexo {anexos[seccion]}').bold = True
            etiqueta.alignment = WD_ALIGN_PARAGRAPH.CENTER
            etiqueta.paragraph_format.keep_with_next = True
            etiqueta.paragraph_format.page_break_before = seccion != 'Primera entrega'
        parrafo = doc.add_heading(seccion, level=nivel)
        if nivel == 1:
            parrafo.paragraph_format.page_break_before = True
        if seccion in anexos:
            parrafo.alignment = WD_ALIGN_PARAGRAPH.CENTER
    elif figura:
        numero, descripcion = figura[1].split('. ', 1)
        nombre, fuente = descripcion.split('. Fuente: ', 1)
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
        ancho = 15.3 if numero in ('Figura 1', 'Figura 2', 'Figura B1', 'Figura B2', 'Figura C1') else 11.5
        if ruta.name == 'reserva.png':
            ancho = 10
        imagen = parrafo.add_run().add_picture(str(ruta), width=Cm(ancho))
        if imagen.height > Cm(16.2):
            imagen.width = int(imagen.width * Cm(16.2) / imagen.height)
            imagen.height = Cm(16.2)
        imagen._inline.docPr.set('descr', f'{numero}. {nombre}')
        nota = doc.add_paragraph()
        nota.paragraph_format.keep_together = True
        nota.add_run('Nota. ').italic = True
        nota.add_run(f'Fuente: {fuente}')
    elif re.match(r'^\d+\. ', bloque):
        for linea in bloque.splitlines():
            doc.add_paragraph(linea).paragraph_format.left_indent = Cm(1.27)
    else:
        parrafo = doc.add_paragraph()
        if seccion == 'Referencias':
            parrafo.paragraph_format.left_indent = Cm(1.27)
            parrafo.paragraph_format.first_line_indent = Cm(-1.27)
            texto_ref, separador, url = bloque.partition(' https://')
            for i, parte in enumerate(texto_ref.split('*')):
                parrafo.add_run(parte).italic = bool(i % 2)
            if separador:
                parrafo.add_run(' ')
                enlace(parrafo, 'https://' + url)
        elif bloque.startswith(('Palabras clave:', 'Keywords:')):
            etiqueta, palabras = bloque.split(':', 1)
            parrafo.paragraph_format.first_line_indent = Cm(1.27)
            parrafo.add_run(etiqueta + ':').italic = True
            parrafo.add_run(palabras)
        else:
            parrafo.add_run(bloque)
            if seccion == 'Alcances':
                parrafo.paragraph_format.keep_together = True
            if seccion not in ('Abstract', 'Resumen'):
                parrafo.paragraph_format.first_line_indent = Cm(1.27)
        if seccion in ('Resumen', 'Abstract'):
            parrafo.paragraph_format.line_spacing = Pt(24)
            if not bloque.startswith(('Palabras clave:', 'Keywords:')):
                parrafo.paragraph_format.keep_together = True
                parrafo.paragraph_format.keep_with_next = True
        if seccion == 'Abstract':
            for run in parrafo.runs:
                propiedades = run._element.get_or_add_rPr()
                idioma = OxmlElement('w:lang')
                idioma.set(qn('w:val'), 'en-US')
                propiedades.append(idioma)

doc.core_properties.title = titulo
doc.core_properties.author = 'Equipo Acopio'
doc.core_properties.last_modified_by = 'Equipo Acopio'
doc.core_properties.subject = 'Proyecto integrador PICS'
doc.core_properties.language = 'es-CO'
doc.save(carpeta / 'Acopio - Proyecto integrador PICS.docx')
