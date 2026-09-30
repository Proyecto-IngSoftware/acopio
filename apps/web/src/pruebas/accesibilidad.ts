import axe from 'axe-core';

/** Reglas de axe incumplidas con impacto crítico o serio. jsdom no calcula el
 *  contraste de color; eso lo cubre la prueba de packages/ui-tokens. */
export async function violacionesGraves(nodo: Element): Promise<string[]> {
  const r = await axe.run(nodo, { rules: { 'color-contrast': { enabled: false } } });
  return r.violations
    .filter((v) => v.impact === 'critical' || v.impact === 'serious')
    .map((v) => v.id);
}
