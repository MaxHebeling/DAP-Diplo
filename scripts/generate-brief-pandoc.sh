#!/usr/bin/env bash
# Regenera el brief PDF via Pandoc + Typst engine.
#
# Esta es la VARIANTE ALTERNATIVA al brief react-pdf de admin
# (lib/brief/generate-pastor-brief.tsx). Esta sale del markdown
# editable docs/brief/brief-pastores.md — más fácil de personalizar
# texto-pesado, pero sin cover page custom ni branding heavy.
#
# Requisitos: pandoc + typst instalados via brew.
#   brew install pandoc typst
#
# Uso: ./scripts/generate-brief-pandoc.sh

set -euo pipefail

cd "$(dirname "$0")/.."

OUT="$HOME/Downloads/brief-dap-pastores-2026-pandoc.pdf"

pandoc docs/brief/brief-pastores.md \
  -o "$OUT" \
  --pdf-engine=typst \
  --pdf-engine-opt=--font-path \
  --pdf-engine-opt=public/fonts \
  --toc \
  --toc-depth=1 \
  -V fontsize=11pt \
  -V mainfont="EB Garamond" \
  -V sansfont="Inter"

echo "OK → $OUT ($(du -h "$OUT" | cut -f1))"
