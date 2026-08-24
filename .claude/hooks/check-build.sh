#!/bin/bash
# Vérifie que le build passe avant toute publication
set -e
pnpm build:web
pnpm lint
echo "✅ Build & lint OK"
