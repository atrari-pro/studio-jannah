#!/bin/bash
# Vérifie la présence d'events sj_* (contrat dataLayer v1) sur les nouvelles pages
echo "🔍 Vérification tracking sj_*..."
CHANGED=$(git diff --name-only --cached | grep -E '\.astro$|\.md$' || true)
if [ -n "$CHANGED" ]; then
  for f in $CHANGED; do
    if ! grep -q "sj_" "$f" 2>/dev/null; then
      echo "⚠️  $f — aucun event sj_* détecté (vérifier CTA)"
    fi
  done
fi
echo "✅ Vérification terminée"
