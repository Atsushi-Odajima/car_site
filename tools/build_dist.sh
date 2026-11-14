#!/usr/bin/env bash
# Collect the files the site actually serves into dist/ for Cloudflare Pages.
# The site has no build step; this only leaves out repo-only files
# (tools/, README, CLAUDE.md, .github/).
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist
mkdir -p dist
cp index.html dist/
cp -R css js assets dist/
# long cache for fingerprint-free static assets is unsafe; keep HTML/JS/CSS fresh
cat > dist/_headers <<'EOF'
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
/assets/*
  Cache-Control: public, max-age=86400
/js/catalog-data.js
  Cache-Control: public, max-age=300
EOF
echo "dist/ ready: $(find dist -type f | wc -l) files, $(du -sh dist | cut -f1)"
