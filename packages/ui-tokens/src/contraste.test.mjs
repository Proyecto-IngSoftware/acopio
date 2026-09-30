import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');
const token = (nombre) => {
  const m = css.match(new RegExp(`--${nombre}:\\s*(#[0-9A-Fa-f]{6})`));
  assert.ok(m, `falta el token --${nombre}`);
  return m[1];
};
const luminancia = (hex) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a, b) => {
  const [x, y] = [luminancia(token(a)), luminancia(token(b))].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// sistema-diseno.md §1 y §9: AAA en el texto principal, AA como piso
test('el texto principal sobre el fondo cumple AAA', () => {
  assert.ok(contraste('on-surface', 'background') >= 7);
});
test('el texto de los botones de marca cumple AA', () => {
  assert.ok(contraste('on-primary', 'primary-container') >= 4.5);
});
test('el texto secundario sobre las tarjetas cumple AA', () => {
  assert.ok(contraste('on-surface-variant', 'surface-container-lowest') >= 4.5);
});
test('el texto secundario de la franja oscura cumple AA', () => {
  assert.ok(contraste('primary-fixed-dim', 'primary') >= 4.5);
});
