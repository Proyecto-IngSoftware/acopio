#!/bin/sh
# Ningún componente escribe un color hexadecimal directo (sistema de diseño §10,
# ADR-0006): los colores viven en packages/ui-tokens. Hasta que exista apps/web no
# hay nada que revisar.
set -e
[ -d apps/web/src ] || { echo "Sin apps/web todavía: nada que revisar"; exit 0; }
if grep -rnE '#[0-9a-fA-F]{3,8}\b' apps/web/src --include='*.ts' --include='*.tsx' --include='*.css'; then
  echo "Hay colores hexadecimales fuera de packages/ui-tokens. Usa un token." >&2
  exit 1
fi
echo "Sin colores hexadecimales fuera de packages/ui-tokens"
