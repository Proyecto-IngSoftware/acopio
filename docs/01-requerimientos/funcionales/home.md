---
title: "RF-HOM · Home público"
type: requerimientos
tags: [requerimientos, rf]
estado: vigente
modulo: home
bloque: 1
actualizado: 2026-09-12
---

# RF-HOM · Home público

**Bloque 1**

El home es la **única** superficie pública. No es un sitio web con secciones: es
una vitrina de la causa y una puerta de entrada a tres acciones.

---

### RF-HOM-001 · Portada
**Actor:** Cualquiera · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] Hero con las emergencias activas —la más reciente primero, con selector— y una
      frase de estado, no un eslogan. Las que están en seguimiento siguen en el
      selector, después de las activas
      ([ADR-0010](../../02-arquitectura/adr/ADR-0010-varias-emergencias-activas.md))
- [ ] Cifras vivas: kilogramos movilizados, acopios activos, zonas atendidas,
      cupos abiertos. **Cada una con su antigüedad**
- [ ] Tres botones de igual peso: *Donar dinero* · *Donar en especie* · *Ser
      voluntario*
- [ ] Carrusel de entidades verificadas, solo con sello vigente
- [ ] Sección de noticias, hasta 3 entradas
- [ ] Aviso permanente y visible: **esta plataforma no recibe dinero**
- [ ] Carga en menos de 3 s en 3G; el hero no depende de JavaScript para leerse

### RF-HOM-002 · Cómo ayudar
**Actor:** Cualquiera · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] Explica las tres rutas y a dónde lleva cada una
- [ ] Ruta de dinero: al directorio de causas, con el aviso de que la donación se
      hace en el sitio de la entidad
- [ ] Ruta de especie: al mapa, con la recomendación de **revisar qué hace falta
      antes de comprar**
- [ ] Ruta de voluntariado: al listado de jornadas
- [ ] Responde tres preguntas frecuentes: por qué no reciben dinero, cómo se
      verifica una entidad, cómo se sigue una donación

### RF-HOM-003 · Gestionar contenido
**Actor:** Administrador · **Prioridad:** DEBERÍA

**Criterios de aceptación:**
- [ ] Editar el texto del hero, las noticias y el orden del carrusel
- [ ] Publicar y despublicar sin desplegar código
- [ ] Solo pueden entrar al carrusel entidades con sello vigente
- [ ] Una causa archivada deja de destacarse en la portada
      ([RF-RED-010](red.md#rf-red-010))

### RF-HOM-004 · Transparencia
**Actor:** Cualquiera · **Prioridad:** DEBERÍA

**Criterios de aceptación:**
- [ ] Métricas agregadas: total movilizado por grupo de categoría, cobertura
      promedio de zonas, número de remisiones recibidas
- [ ] Gráfico de cobertura por zona, sin nombres de personas
- [ ] Remisiones en tránsito y recibidas, en conteo agregado — el estimado de
      «camiones en camino» y «ya llegaron»
      ([RF-CMP-007](comprobantes.md#rf-cmp-007))
- [ ] **Solo datos agregados. Nada personal, nada por donante**
- [ ] Cada métrica lleva su fecha de corte

### RF-HOM-005 · Páginas legales
**Actor:** Cualquiera · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] Política de tratamiento de datos conforme a la Ley 1581 de 2012: finalidad,
      temporalidad, derechos del titular y canal de contacto
- [ ] **Aviso de transferencia internacional**: los datos de autenticación residen
      en Supabase, fuera de Colombia
- [ ] Términos de uso
- [ ] Aviso de no recepción de dinero, y aclaración de que la plataforma no
      responde por las entidades a las que dirige
- [ ] Enlazadas desde el pie de toda página pública

### RF-HOM-006 · Compartir en redes
**Actor:** Cualquiera · **Prioridad:** DEBERÍA

**Criterios de aceptación:**
- [ ] Metadatos Open Graph y Twitter Card correctos en portada, ficha de acopio y
      ficha de causa
- [ ] Imagen de vista previa por página
- [ ] Botón de compartir por WhatsApp, que es el canal real en Colombia
- [ ] **Verificación:** pegar el enlace en WhatsApp muestra título, descripción e
      imagen. Es el criterio que de verdad importa, más que la indexación en
      buscadores
