#!/usr/bin/env node
// Compara el plan de acción (docs/05-planes/plan-de-accion.md) con los issues de GitHub y
// dice qué filas quedaron desactualizadas. Lo usa quien retoma una sesión (CLAUDE.md).
//
//   node scripts/revisar-plan.mjs        # sale con 1 si hay algo que corregir
//
// Una fila es una línea de tabla que nombra un issue (#N) y lleva un estado: ✅ hecho,
// 🟡 en curso, ⬜ pendiente o ⛔ bloqueado. Avisa si una fila ✅ apunta a un issue abierto,
// si una fila sin ✅ apunta a uno cerrado (todos los issues de la fila cerrados), si una
// fecha AAAA-MM-DD de una fila sin ✅ ya pasó, y si hay issues abiertos que el plan no nombra.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PLAN = fileURLToPath(new URL('../docs/05-planes/plan-de-accion.md', import.meta.url));
const ESTADOS = ['✅', '🟡', '⬜', '⛔'];

const issues = JSON.parse(
  execFileSync(
    'gh',
    ['issue', 'list', '--state', 'all', '--limit', '500', '--json', 'number,state,title'],
    {
      encoding: 'utf8',
    },
  ),
);
const porNumero = new Map(issues.map((i) => [i.number, i]));
const hoy = new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10); // Bogotá

const avisos = [];
const nombrados = new Set();
for (const [i, linea] of readFileSync(PLAN, 'utf8').split('\n').entries()) {
  if (!linea.startsWith('|')) continue;
  const numeros = [...linea.matchAll(/#(\d+)/g)].map((m) => Number(m[1]));
  const estado = ESTADOS.find((e) => linea.includes(e));
  if (!numeros.length || !estado) continue;
  numeros.forEach((n) => nombrados.add(n));
  const donde = `línea ${i + 1}`;
  const desconocidos = numeros.filter((n) => !porNumero.has(n));
  if (desconocidos.length)
    avisos.push(`${donde}: ${desconocidos.map((n) => `#${n}`).join(', ')} no existe`);
  const conocidos = numeros.filter((n) => porNumero.has(n)).map((n) => porNumero.get(n));
  const abiertos = conocidos.filter((x) => x.state === 'OPEN');
  if (estado === '✅' && abiertos.length) {
    avisos.push(
      `${donde}: dice ✅ pero sigue abierto ${abiertos.map((x) => `#${x.number}`).join(', ')}`,
    );
  }
  if (estado !== '✅' && conocidos.length && !abiertos.length) {
    avisos.push(
      `${donde}: dice ${estado} pero ${conocidos.map((x) => `#${x.number}`).join(', ')} ya se cerró`,
    );
  }
  const vencida = [...linea.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)]
    .map((m) => m[1])
    .find((f) => f < hoy);
  if (estado !== '✅' && vencida)
    avisos.push(`${donde}: la fecha ${vencida} ya pasó y dice ${estado}`);
}
for (const x of issues) {
  if (x.state === 'OPEN' && !nombrados.has(x.number)) {
    avisos.push(`#${x.number} está abierto y el plan no lo nombra: ${x.title}`);
  }
}

if (!avisos.length) {
  console.log('El plan de acción coincide con GitHub.');
} else {
  const cuantas = avisos.length === 1 ? 'una cosa' : `${avisos.length} cosas`;
  console.log(`El plan de acción tiene ${cuantas} por corregir:`);
  for (const a of avisos) console.log(`- ${a}`);
  process.exitCode = 1;
}
