// Genera el lienzo de diagramas del Avance 2: casos de uso y mapa de stakeholders.
// Fuente de contenido: docs/entregas/avance-02-requisitos.md, secciones 5 y 6.
// Uso: node build.mjs  →  Main.dc.html (casos de uso), Stakeholders.dc.html, canvas.json
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));

// Tokens de docs/03-diseno/sistema-diseno.md. El semáforo (rojo, ámbar, verde,
// morado) no se usa: está reservado para el estado del inventario (ADR-0006).
const C = {
  m900: '#0A4F4F', m700: '#0F6E6E', m500: '#14A0A0', m100: '#C7E8E8', m50: '#E6F4F4',
  n900: '#1C1917', n700: '#44403C', n600: '#57534E', n400: '#A8A29E', n200: '#E7E5E4',
  n100: '#F5F5F4', n50: '#FAFAF9', b: '#FFFFFF',
};
const FUENTE = "'Inter', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif";

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const px = (n) => `${Math.round(n)}px`;

const abrir = () => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&amp;display=swap">
  <style>
    body { margin: 0; background: ${C.b}; font-family: ${FUENTE}; color: ${C.n900}; }
    a { color: ${C.m700}; } a:hover { color: ${C.m900}; }
  </style>
</helmet>`;
const cerrar = `</x-dc>
</body>
</html>
`;

// ─── Casos de uso ────────────────────────────────────────────────────────────
function casosDeUso() {
  const W = 1340;
  const CU_X = 480, CU_W = 240, CU_H = 58;
  const CU_DER = CU_X + CU_W;
  const LIM_X = 300, LIM_W = 780;

  const bandas = [
    { id: 'EP-01', nombre: 'Portal público', cus: [['CU-01', 'Consultar mapa de acopios'], ['CU-02', 'Consultar causas verificadas']] },
    { id: 'EP-02', nombre: 'Turnos de voluntariado', cus: [['CU-03', 'Reservar cupo de voluntariado']] },
    { id: 'EP-03', nombre: 'Inventario', cus: [['CU-05', 'Consultar saldos'], ['CU-06', 'Marcar «no recibir»'], ['CU-16', 'Buscar categoría'], ['CU-04', 'Registrar entrada de insumos'], ['CU-17', 'Escanear código de barras']] },
    { id: 'EP-04', nombre: 'Comprobantes y custodia', cus: [['CU-07', 'Preparar donación con folio'], ['CU-09', 'Consultar folio'], ['CU-08', 'Conciliar donación']] },
    { id: 'EP-05', nombre: 'Zonas y motor', cus: [['CU-11', 'Despachar remisión'], ['CU-12', 'Confirmar recepción en zona'], ['CU-13', 'Reportar necesidad de zona'], ['CU-10', 'Aprobar o descartar sugerencia']] },
    { id: 'EP-06', nombre: 'Administración y acceso', cus: [['CU-14', 'Dar acceso por invitación'], ['CU-15', 'Verificar entidad']] },
  ];

  // Geometría: cada franja deja 26 px arriba para su etiqueta y un paso de 76 px entre óvalos.
  const PASO = 76, ESPACIO = 12;
  const cy = {};
  let arriba = 150;
  for (const b of bandas) {
    b.arriba = arriba;
    b.cus.forEach(([id], k) => { cy[id] = arriba + 65 + k * PASO; });
    b.abajo = arriba + 65 + (b.cus.length - 1) * PASO + CU_H / 2 + 12;
    arriba = b.abajo + ESPACIO;
  }
  const LIM_Y = 130;
  const LIM_H = bandas.at(-1).abajo + 18 - LIM_Y;
  const H = LIM_Y + LIM_H + 110;

  const principales = [
    { nombre: 'Visitante', sub: 'donante o voluntario, sin cuenta', y: 260, cus: ['CU-01', 'CU-02', 'CU-09'] },
    { nombre: 'Voluntario', y: 409, cus: ['CU-03'] },
    { nombre: 'Operador de acopio', y: 700, cus: ['CU-05', 'CU-06', 'CU-04', 'CU-11'] },
    { nombre: 'Donador', sub: 'cuenta propia', y: 987, cus: ['CU-07', 'CU-09'] },
    { nombre: 'Auditor', y: 1110, cus: ['CU-08'] },
    { nombre: 'Receptor', y: 1333, cus: ['CU-12', 'CU-13'] },
    { nombre: 'Administrador', y: 1560, cus: ['CU-10', 'CU-14', 'CU-15'] },
  ];
  const secundarios = [
    { nombre: 'RedAcopio Bogotá', y: 215, cus: ['CU-01'] },
    { nombre: 'Servidor de correo', y: 560, cus: ['CU-03', 'CU-08', 'CU-14'] },
    { nombre: 'Supabase Auth', y: 1180, cus: ['CU-07', 'CU-14'] },
    { nombre: 'Reloj del sistema', y: 1560, cus: ['CU-10', 'CU-15'] },
  ];
  const SEC_X = 1140, SEC_W = 170, SEC_H = 56;

  // Relaciones entre casos de uso: [origen, destino, estereotipo]
  const relaciones = [
    ['CU-04', 'CU-16', 'include'],
    ['CU-17', 'CU-04', 'extend'],
    ['CU-07', 'CU-17', 'include'],
  ];

  const lineas = [];
  for (const a of principales) {
    for (const cu of a.cus) lineas.push(`<line x1="196" y1="${a.y - 17}" x2="${CU_X}" y2="${cy[cu]}" stroke="${C.n600}" stroke-width="1.5"></line>`);
  }
  for (const s of secundarios) {
    for (const cu of s.cus) lineas.push(`<line x1="${SEC_X}" y1="${s.y}" x2="${CU_DER}" y2="${cy[cu]}" stroke="${C.n600}" stroke-width="1.5"></line>`);
  }
  const etiquetasRel = [];
  for (const [o, d, tipo] of relaciones) {
    const y1 = cy[o] + (cy[o] < cy[d] ? 8 : -8);
    const y2 = cy[d] + (cy[o] < cy[d] ? -8 : 8);
    const curva = 70 + Math.abs(y2 - y1) * 0.12;
    lineas.push(`<path d="M ${CU_DER - 2} ${y1} C ${CU_DER + curva} ${y1}, ${CU_DER + curva} ${y2}, ${CU_DER + 2} ${y2}" fill="none" stroke="${C.m700}" stroke-width="1.5" stroke-dasharray="6 4" marker-end="url(#flecha)"></path>`);
    const medio = (y1 + y2) / 2;
    etiquetasRel.push(`<div style="position: absolute; left: ${px(CU_DER + curva * 0.78 + 6)}; top: ${px(medio - 10)}; font-size: 13px; font-style: italic; font-weight: 500; color: ${C.m700}; white-space: nowrap;">«${tipo}»</div>`);
  }

  const figura = (x, y) => `<svg style="position: absolute; left: ${px(x)}; top: ${px(y)};" width="40" height="64" viewBox="0 0 40 64" fill="none" stroke="${C.m900}" stroke-width="2.2" stroke-linecap="round"><circle cx="20" cy="10" r="8.5" fill="${C.b}"></circle><line x1="20" y1="19" x2="20" y2="40"></line><line x1="4" y1="27" x2="36" y2="27"></line><line x1="20" y1="40" x2="7" y2="60"></line><line x1="20" y1="40" x2="33" y2="60"></line></svg>`;

  const actores = principales.map((a) => `${figura(155, a.y - 44)}
    <div style="position: absolute; left: 55px; top: ${px(a.y + 24)}; width: 240px; display: flex; flex-direction: column; align-items: center; gap: 2px; text-align: center;">
      <div style="font-size: 15px; font-weight: 700; color: ${C.n900}; background: ${C.b}; padding: 0 4px;">${esc(a.nombre)}</div>${a.sub ? `
      <div style="font-size: 12px; color: ${C.n600}; background: ${C.b}; padding: 0 4px;">${esc(a.sub)}</div>` : ''}
    </div>`).join('\n    ');

  const externos = secundarios.map((s) => `<div style="position: absolute; left: ${px(SEC_X)}; top: ${px(s.y - SEC_H / 2)}; width: ${px(SEC_W)}; height: ${px(SEC_H)}; box-sizing: border-box; border: 1.5px solid ${C.n700}; border-radius: 8px; background: ${C.n100}; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;">
      <div style="font-size: 11px; color: ${C.n600};">«sistema externo»</div>
      <div style="font-size: 14px; font-weight: 700; color: ${C.n900};">${esc(s.nombre)}</div>
    </div>`).join('\n    ');

  const franjas = bandas.map((b) => `<div style="position: absolute; left: ${px(CU_X + 12)}; top: ${px(b.arriba + 8)}; display: flex; gap: 8px; align-items: baseline; font-size: 12px; letter-spacing: 0.04em; text-transform: uppercase; white-space: nowrap;">
      <span style="font-weight: 700; color: ${C.m700};">${b.id}</span>
      <span style="font-weight: 500; color: ${C.n700};">${esc(b.nombre)}</span>
    </div>`).join('\n    ');

  const separadores = bandas.slice(0, -1).map((b) => `<div style="position: absolute; left: ${px(LIM_X + 14)}; top: ${px(b.abajo + ESPACIO / 2)}; width: ${px(LIM_W - 28)}; height: 0; border-top: 1px dashed ${C.n400};"></div>`).join('\n    ');

  const ovalos = bandas.flatMap((b) => b.cus.map(([id, nombre]) => `<div style="position: absolute; left: ${px(CU_X)}; top: ${px(cy[id] - CU_H / 2)}; width: ${px(CU_W)}; height: ${px(CU_H)}; box-sizing: border-box; border: 1.5px solid ${C.m700}; border-radius: 50%; background: ${C.m50}; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; padding: 0 20px; text-align: center;">
      <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.04em; color: ${C.m700};">${id}</div>
      <div style="font-size: 14px; font-weight: 500; line-height: 1.2; color: ${C.n900};">${esc(nombre)}</div>
    </div>`)).join('\n    ');

  const leyendaY = LIM_Y + LIM_H + 36;
  const html = `${abrir()}
<div style="position: relative; width: ${px(W)}; height: ${px(H)}; background: ${C.b}; overflow: hidden;">
    <div style="position: absolute; left: 60px; top: 34px; display: flex; flex-direction: column; gap: 6px;">
      <div style="font-size: 28px; font-weight: 700; color: ${C.n900};">Acopio · Diagrama de casos de uso</div>
      <div style="font-size: 14px; color: ${C.n600};">Avance 2 · 17 casos de uso agrupados por las seis épicas · actores principales a la izquierda, sistemas externos a la derecha</div>
    </div>
    <div style="position: absolute; left: 60px; top: 132px; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: ${C.n600};">Actores principales</div>
    <div style="position: absolute; left: ${px(SEC_X)}; top: 132px; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: ${C.n600};">Actores secundarios</div>
    <div style="position: absolute; left: ${px(LIM_X)}; top: ${px(LIM_Y)}; width: ${px(LIM_W)}; height: ${px(LIM_H)}; box-sizing: border-box; border: 2px solid ${C.m700}; border-radius: 12px; background: ${C.b};"></div>
    <div style="position: absolute; left: ${px(LIM_X + 18)}; top: ${px(LIM_Y + 14)}; font-size: 16px; font-weight: 700; color: ${C.m700};">Sistema Acopio</div>
    ${separadores}
    <svg style="position: absolute; left: 0; top: 0;" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <defs><marker id="flecha" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M 1 1 L 9 5 L 1 9" fill="none" stroke="${C.m700}" stroke-width="1.6"></path></marker></defs>
      ${lineas.join('\n      ')}
    </svg>
    ${franjas}
    ${ovalos}
    ${etiquetasRel.join('\n    ')}
    ${actores}
    ${externos}
    <div style="position: absolute; left: 60px; top: ${px(leyendaY)}; display: flex; gap: 32px; align-items: center; font-size: 13px; color: ${C.n700};">
      <div style="display: flex; gap: 8px; align-items: center;"><svg width="36" height="10"><line x1="0" y1="5" x2="36" y2="5" stroke="${C.n600}" stroke-width="1.5"></line></svg><span>Asociación entre actor y caso de uso</span></div>
      <div style="display: flex; gap: 8px; align-items: center;"><svg width="40" height="10"><line x1="0" y1="5" x2="32" y2="5" stroke="${C.m700}" stroke-width="1.5" stroke-dasharray="6 4"></line><path d="M 30 1 L 38 5 L 30 9" fill="none" stroke="${C.m700}" stroke-width="1.6"></path></svg><span>«include»: siempre lo usa · «extend»: atajo opcional</span></div>
      <div style="display: flex; gap: 8px; align-items: center;"><div style="width: 40px; height: 18px; box-sizing: border-box; border: 1.5px solid ${C.m700}; border-radius: 50%; background: ${C.m50};"></div><span>Caso de uso</span></div>
      <div style="display: flex; gap: 8px; align-items: center;"><div style="width: 34px; height: 18px; box-sizing: border-box; border: 1.5px solid ${C.n700}; border-radius: 4px; background: ${C.n100};"></div><span>Sistema externo</span></div>
    </div>
</div>
${cerrar}`;
  return { html, W, H };
}

// ─── Mapa de stakeholders ────────────────────────────────────────────────────
function stakeholders() {
  const W = 1100;
  const PX = 160, PY = 150, L = 800;
  const H = PY + L + 150;
  const aX = (v) => PX + v * L;
  const aY = (v) => PY + (1 - v) * L;

  const tipos = {
    equipo: { nombre: 'Equipo y validación', relleno: C.m900, borde: C.m900 },
    usuario: { nombre: 'Usuarios', relleno: C.m500, borde: C.m500 },
    regla: { nombre: 'Entidades que operan o fijan reglas', relleno: C.n700, borde: C.n700 },
    externo: { nombre: 'Servicios externos', relleno: C.b, borde: C.m700 },
    afectado: { nombre: 'Afectados y otros', relleno: C.n400, borde: C.n400 },
  };
  // [nombre, interés, poder, tipo, lado de la etiqueta]
  const puntos = [
    ['Equipo de desarrollo', 0.93, 0.92, 'equipo', 'izq'],
    ['Docente', 0.62, 0.95, 'equipo', 'der'],
    ['Administrador', 0.86, 0.74, 'usuario', 'izq'],
    ['Operador de acopio', 0.9, 0.6, 'usuario', 'izq'],
    ['Entidades y fundaciones', 0.7, 0.55, 'regla', 'der'],
    ['UNGRD, APC y Alcaldía', 0.38, 0.85, 'regla', 'izq'],
    ['SIC · Ley 1581', 0.15, 0.78, 'regla', 'der'],
    ['Servicios externos', 0.1, 0.62, 'externo', 'der'],
    ['UBPD y Medicina Legal', 0.2, 0.45, 'regla', 'der'],
    ['Receptor', 0.8, 0.35, 'usuario', 'der'],
    ['Auditor', 0.62, 0.4, 'usuario', 'der'],
    ['Donador', 0.75, 0.28, 'usuario', 'der'],
    ['Donante en especie', 0.68, 0.18, 'usuario', 'der'],
    ['Voluntario', 0.6, 0.12, 'usuario', 'der'],
    ['Población afectada', 0.96, 0.08, 'afectado', 'izq'],
    ['Rescatistas', 0.52, 0.06, 'afectado', 'der'],
    ['Donante remoto', 0.42, 0.14, 'usuario', 'izq'],
    ['Medios', 0.3, 0.25, 'afectado', 'der'],
  ];

  const cuadrantes = [
    { x: 0, y: 0, fondo: C.n50, texto: 'Mantener satisfechos', alin: 'flex-start', vert: 'flex-start' },
    { x: 1, y: 0, fondo: C.m50, texto: 'Gestionar de cerca', alin: 'flex-end', vert: 'flex-start' },
    { x: 0, y: 1, fondo: C.b, texto: 'Monitorear', alin: 'flex-start', vert: 'flex-end' },
    { x: 1, y: 1, fondo: C.n50, texto: 'Mantener informados', alin: 'flex-end', vert: 'flex-end' },
  ].map((q) => `<div style="position: absolute; left: ${px(PX + q.x * L / 2)}; top: ${px(PY + q.y * L / 2)}; width: ${px(L / 2)}; height: ${px(L / 2)}; box-sizing: border-box; background: ${q.fondo}; display: flex; justify-content: ${q.alin}; align-items: ${q.vert}; padding: 14px 16px;">
      <div style="font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: ${q.fondo === C.m50 ? C.m700 : C.n600};">${q.texto}</div>
    </div>`).join('\n    ');

  const marcas = puntos.map(([nombre, i, p, tipo, lado]) => {
    const x = aX(i), y = aY(p), t = tipos[tipo];
    const punto = `<div style="position: absolute; left: ${px(x - 7)}; top: ${px(y - 7)}; width: 14px; height: 14px; box-sizing: border-box; border-radius: 50%; background: ${t.relleno}; border: 2px solid ${t.borde};"></div>`;
    const etiqueta = lado === 'der'
      ? `<div style="position: absolute; left: ${px(x + 13)}; top: ${px(y - 10)}; font-size: 14px; font-weight: 500; color: ${C.n900}; white-space: nowrap;">${esc(nombre)}</div>`
      : `<div style="position: absolute; left: ${px(x - 13 - 220)}; top: ${px(y - 10)}; width: 220px; text-align: right; font-size: 14px; font-weight: 500; color: ${C.n900}; white-space: nowrap;">${esc(nombre)}</div>`;
    return `${punto}\n    ${etiqueta}`;
  }).join('\n    ');

  const leyenda = Object.values(tipos).map((t) => `<div style="display: flex; gap: 8px; align-items: center;"><div style="width: 14px; height: 14px; box-sizing: border-box; border-radius: 50%; background: ${t.relleno}; border: 2px solid ${t.borde};"></div><span>${esc(t.nombre)}</span></div>`).join('\n      ');

  const html = `${abrir()}
<div style="position: relative; width: ${px(W)}; height: ${px(H)}; background: ${C.b}; overflow: hidden;">
    <div style="position: absolute; left: 60px; top: 34px; display: flex; flex-direction: column; gap: 6px;">
      <div style="font-size: 28px; font-weight: 700; color: ${C.n900};">Acopio · Mapa de stakeholders</div>
      <div style="font-size: 14px; color: ${C.n600};">Interés en el resultado contra poder para cambiar requisitos, prioridades o condiciones del proyecto</div>
    </div>
    ${cuadrantes}
    <div style="position: absolute; left: ${px(PX)}; top: ${px(PY)}; width: ${px(L)}; height: ${px(L)}; box-sizing: border-box; border: 1px solid ${C.n400};"></div>
    <div style="position: absolute; left: ${px(PX + L / 2)}; top: ${px(PY)}; width: 0; height: ${px(L)}; border-left: 1px solid ${C.n400};"></div>
    <div style="position: absolute; left: ${px(PX)}; top: ${px(PY + L / 2)}; width: ${px(L)}; height: 0; border-top: 1px solid ${C.n400};"></div>
    ${marcas}
    <div style="position: absolute; left: ${px(PX)}; top: ${px(PY + L + 12)}; width: ${px(L)}; display: flex; justify-content: space-between; font-size: 13px; color: ${C.n600};">
      <span>Interés bajo</span>
      <span style="font-weight: 700; color: ${C.n900};">Interés →</span>
      <span>Interés alto</span>
    </div>
    <div style="position: absolute; left: ${px(PX - 26 - L / 2)}; top: ${px(PY + L / 2 - 10)}; width: ${px(L)}; transform: rotate(-90deg); transform-origin: center; display: flex; justify-content: space-between; font-size: 13px; color: ${C.n600};">
      <span>Poder bajo</span>
      <span style="font-weight: 700; color: ${C.n900};">Poder →</span>
      <span>Poder alto</span>
    </div>
    <div style="position: absolute; left: ${px(PX)}; top: ${px(PY + L + 54)}; width: ${px(L)}; display: flex; flex-wrap: wrap; gap: 12px 28px; font-size: 13px; color: ${C.n700};">
      ${leyenda}
    </div>
</div>
${cerrar}`;
  return { html, W, H };
}

const cu = casosDeUso();
const st = stakeholders();
writeFileSync(join(aqui, 'Main.dc.html'), cu.html);
writeFileSync(join(aqui, 'Stakeholders.dc.html'), st.html);
writeFileSync(join(aqui, 'canvas.json'), JSON.stringify({
  artboards: [
    { file: 'Main.dc.html', title: 'Casos de uso', x: 0, y: 0, w: cu.W, h: cu.H },
    { file: 'Stakeholders.dc.html', title: 'Mapa de stakeholders', x: cu.W + 120, y: 0, w: st.W, h: st.H },
  ],
  launch: { view: 'canvas' },
}, null, 2) + '\n');
console.log(`Main.dc.html ${cu.W}×${cu.H} · Stakeholders.dc.html ${st.W}×${st.H} · canvas.json`);
