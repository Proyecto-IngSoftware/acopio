// Hook de Claude Code para cerrar el ciclo de un PR (CLAUDE.md, «Flujo de trabajo»).
//   PostToolUse(Bash) tras un `gh pr create` que devolvió el enlace del PR: recuerda esperar
//     el CI, confirmar que no quedan alertas de code scanning y fusionar con el comando del proyecto.
// Solo avisa; nunca bloquea. Ante cualquier error sale sin decir nada.
import { readFileSync } from 'node:fs';

try {
  const datos = JSON.parse(readFileSync(0, 'utf8'));
  const comando = String(datos.tool_input?.command ?? '');
  if (!/\bgh\s+pr\s+create\b/.test(comando)) process.exit(0);
  const respuesta = datos.tool_response ?? {};
  const salida =
    typeof respuesta === 'string'
      ? respuesta
      : `${respuesta.stdout ?? ''}\n${respuesta.stderr ?? ''}`;
  const numero = /\/pull\/(\d+)/.exec(salida)?.[1];
  if (!numero) process.exit(0); // sin enlace, el PR no se creó

  const alertas = `gh api "repos/{owner}/{repo}/code-scanning/alerts?ref=refs/pull/${numero}/merge&state=open" -q length`;
  const fusionar = `gh pr checks ${numero} --watch && test "$(${alertas})" = 0 && gh pr review ${numero} --comment -b "Revisado" && gh pr merge ${numero} --merge`;
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext:
          `Creaste el PR #${numero}. Joseph pidió que, después de abrir un PR, también lo fusiones: ` +
          `espera el CI y fusiona en el mismo comando con \`${fusionar}\` ` +
          '(el comentario «Revisado» pasa antes por humanizer:humanizer). ' +
          'Si el CI falla, arregla, sube y vuelve a esperar: nunca se fusiona en rojo. ' +
          'Si el `test` falla, el PR tiene alertas abiertas de code scanning: corrígelas o descártalas con razón antes de fusionar. ' +
          'La rama no se borra, ni en GitHub ni en local.',
      },
    }),
  );
} catch {
  process.exit(0);
}
