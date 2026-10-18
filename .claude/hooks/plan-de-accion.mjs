// Hook de Claude Code que mantiene al día el plan de acción (docs/05-planes/plan-de-accion.md).
//   PostToolUse(Bash) tras un `gh issue close|reopen|create|edit` o un `gh pr merge` que no
//     falló: recuerda corregir la fila del plan, anotar el cambio en su registro y correr
//     `node scripts/revisar-plan.mjs`.
// Solo avisa; nunca bloquea. Ante cualquier error sale sin decir nada.
import { readFileSync } from 'node:fs';

try {
  const datos = JSON.parse(readFileSync(0, 'utf8'));
  const comando = String(datos.tool_input?.command ?? '');
  // Solo cuando gh es el comando que corre (inicio de línea o tras &&, ;, |), no un texto citado
  const accion =
    /(?:^|[;&|]\s*|\n\s*)gh\s+(issue\s+(?:close|reopen|create|edit)|pr\s+merge)\b/.exec(comando);
  if (!accion) process.exit(0);
  const respuesta = datos.tool_response ?? {};
  if (respuesta.interrupted || respuesta.is_error) process.exit(0);

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext:
          `Corriste \`gh ${accion[1]}\`: cambió el estado del proyecto. Corrige la fila que toca en ` +
          '`docs/05-planes/plan-de-accion.md` (estado, fecha o issue nuevo), agrega una línea fechada ' +
          'a su «Registro de cambios» y corre `node scripts/revisar-plan.mjs` para ver si queda algo ' +
          'desalineado. El plan se versiona en el PR de la sesión.',
      },
    }),
  );
} catch {
  process.exit(0);
}
