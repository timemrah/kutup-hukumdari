#!/usr/bin/env bash
# Canlı yayın: dist/ derlenir, gh-pages dalına konur, GitHub Pages sunar.
set -euo pipefail
cd "$(dirname "$0")/.."

npm run build

TMP_BRANCH="deploy-tmp-$(date +%s)"
git checkout -q -b "$TMP_BRANCH"
git add -f dist
git commit -q -m "yayın: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git subtree split --prefix dist -b gh-pages-publish >/dev/null
git push -f origin gh-pages-publish:gh-pages
git checkout -q main
git branch -q -D "$TMP_BRANCH"
git branch -q -D gh-pages-publish
echo "Yayınlandı: https://timemrah.github.io/kutup-hukumdari/"
