#!/bin/bash
# Vérifie que les liens internes utilisent bien withBase() (règle CLAUDE.md)
echo "🔍 Recherche de liens internes non-withBase()..."
if grep -rnE 'href="/(?!studio-jannah)' apps/web/src apps/web/content 2>/dev/null | grep -v 'withBase'; then
  echo "❌ Liens internes détectés sans withBase()"
  exit 1
fi
echo "✅ Liens internes OK"
