#!/bin/bash
# Vérifie que les liens internes en dur dans le CODE Astro (apps/web/src)
# passent bien par withBase() — règle CLAUDE.md.
#
# Ne couvre QUE apps/web/src (composants/pages .astro et .ts), PAS
# apps/web/content : le contenu Markdown écrit volontairement des chemins
# bruts ("/expertises/...", "[texte](/blog/...)") — ils sont préfixés
# automatiquement au build par le plugin rehype
# (apps/web/src/lib/rehype-article-images.mjs), les vérifier ici donnerait
# de faux positifs sur la convention normale du contenu.
#
# Historique : la version précédente de ce hook utilisait une regex PCRE
# avec lookahead `(?!studio-jannah)`, invalide en `grep -E` (POSIX) — grep
# plantait silencieusement (stderr jeté), la pipe recevait un flux vide, et
# le hook rapportait toujours "OK" sans jamais rien vérifier. Corrigé le
# 2026-09-07 après la découverte en prod de ~229 liens cassés (voir
# rehype-article-images.mjs) qu'il aurait dû, en théorie, empêcher de
# passer côté apps/web/src (4 redirections legacy /insights,/mag).
echo "🔍 Recherche de liens internes en dur (sans withBase()) dans apps/web/src..."
if grep -rnE '(href|Astro\.redirect)\(?\s*[`"]/[^`"]*[`"]' apps/web/src --include="*.astro" --include="*.ts" 2>/dev/null \
  | grep -vE 'withBase\(' \
  | grep -vE '[`"](https?:)?//'; then
  echo "❌ Lien(s) interne(s) en dur sans withBase() détecté(s) ci-dessus"
  exit 1
fi
echo "✅ Liens internes OK"
