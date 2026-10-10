import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { simular, type Estrategia } from '@acopio/shared';

/**
 * RF-MOT-010: corre el simulador del motor con una semilla y escribe el informe en la
 * bóveda. Uso: `bun run --filter @acopio/api simular -- --semilla 42`.
 */
const i = process.argv.indexOf('--semilla');
const semilla = i >= 0 ? Number(process.argv[i + 1]) : 42;
if (!Number.isInteger(semilla)) throw new Error('--semilla debe ser un entero');

const parametros = { semilla, zonas: 50, acopios: 20, categorias: 40, dias: 30 };
const informe = simular(parametros);
const hoy = new Date().toISOString().slice(0, 10);
const NOMBRE: Record<Estrategia, string> = {
  motor: 'Motor (pesos por defecto)',
  igualitario: 'Partes iguales',
  cercania: 'Al más cercano',
};
const pct = (n: number) => `${(n * 100).toFixed(1).replace('.', ',')} %`;
const filas = (Object.keys(NOMBRE) as Estrategia[])
  .map((e) => {
    const r = informe.estrategias[e];
    return `| ${NOMBRE[e]} | ${pct(r.coberturaPromedio)} | ${r.desviacionCobertura.toFixed(4).replace('.', ',')} | ${pct(r.proporcionVencida)} |`;
  })
  .join('\n');

const texto = `---
title: "Simulación del motor"
type: informe
tags: [motor, simulador, rf-mot-010]
estado: vigente
actualizado: ${hoy}
---

# Simulación del motor

Informe que escribe \`apps/api/src/scripts/simular.ts\` (RF-MOT-010, M-08). La misma
semilla da siempre los mismos números. Para regenerarlo:

\`\`\`bash
bun run --filter @acopio/api simular -- --semilla ${semilla}
\`\`\`

## Escenario

Semilla ${semilla}: ${parametros.zonas} zonas, ${parametros.acopios} acopios,
${parametros.categorias} categorías y ${parametros.dias} días. Cada día llegan entradas al
azar a los acopios, la mitad de las categorías es perecedera con vencimientos de 2 a 20
días, y la oferta total ronda la demanda. Cada estrategia reparte el mismo escenario; lo
que pasa su fecha en un acopio se cuenta como vencido.

## Resultado

| Estrategia | Cobertura promedio | Desviación de la cobertura entre zonas | Vencido sobre lo que entró |
|---|---|---|---|
${filas}

Una desviación menor quiere decir que las zonas quedan atendidas de forma más pareja.
`;

const destino = resolve(__dirname, '../../../../docs/03-diseno/motor/simulacion.md');
writeFileSync(destino, texto);
console.log(`Informe escrito en ${destino}`);
